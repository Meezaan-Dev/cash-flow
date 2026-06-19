import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
	collection,
	query,
	onSnapshot,
} from 'firebase/firestore';
import { Transaction } from '../types';
import { normalizeTransaction } from '../transactions/TransactionModel';
import {
	TEXT_LIMITS,
	assertPositiveMoney,
	assertValidDate,
	normalizeOptionalText,
	normalizeRequiredText,
} from '../validation';
import { runFinancialCommand, type FinancialCommandPayloads } from '../services/financialCommands';

export interface AddTransactionData {
	type: 'income' | 'expense';
	accountId: string;
	title: string;
	category: string;
	subcategory?: string;
	description?: string;
	amount: number;
	date?: Date;
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}

export interface AddTransferData {
	fromAccountId: string;
	toAccountId: string;
	amount: number;
	title: string;
	description?: string;
	date?: Date;
}

export const useTransactions = () => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(() => auth.currentUser);

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			setUser(firebaseUser);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!user) {
			setTransactions([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const txCol = collection(db, 'users', user.uid, 'transactions');
		const q = query(txCol);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetched = snapshot.docs.map((d) =>
				normalizeTransaction({ id: d.id, ...d.data() })
			);
			setTransactions(fetched);
			setLoading(false);
		}, (error) => {
			console.error('Error fetching transactions:', error);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const addTransaction = async (data: AddTransactionData) => {
		if (!user) throw new Error('User not authenticated');
		if (data.type !== 'income' && data.type !== 'expense') {
			throw new Error('Transaction type must be income or expense.');
		}

		const accountId = normalizeRequiredText(
			data.accountId,
			'Account',
			TEXT_LIMITS.documentId
		);
		const title = normalizeRequiredText(data.title, 'Title', TEXT_LIMITS.title);
		const category = normalizeRequiredText(data.category, 'Category', TEXT_LIMITS.category);
		const subcategory = normalizeOptionalText(
			data.subcategory,
			'Subcategory',
			TEXT_LIMITS.subcategory
		);
		const description = normalizeOptionalText(
			data.description,
			'Description',
			TEXT_LIMITS.description
		);
		const amount = assertPositiveMoney(data.amount);
		const date = assertValidDate(data.date);
		const recurringOccurrenceDate = normalizeOptionalText(
			data.recurringOccurrenceDate,
			'Recurring occurrence date',
			10
		);
		if (recurringOccurrenceDate && !/^\d{4}-\d{2}-\d{2}$/.test(recurringOccurrenceDate)) {
			throw new Error('Recurring occurrence date is invalid.');
		}

		const txData: Record<string, unknown> = {
			accountId,
			title,
			amount,
			type: data.type,
			category,
			...(subcategory ? { subcategory } : {}),
			...(description ? { description } : {}),
			...(data.recurringTransactionId
				? {
					recurringTransactionId: normalizeRequiredText(
						data.recurringTransactionId,
						'Recurring transaction ID',
						TEXT_LIMITS.documentId
					),
				}
				: {}),
			...(recurringOccurrenceDate
				? { recurringOccurrenceDate }
				: {}),
		};

		if (date) {
			txData.date = date.toISOString();
		}
		await runFinancialCommand(
			'createTransaction',
			txData as unknown as FinancialCommandPayloads['createTransaction']
		);
	};

	const addTransfer = async (data: AddTransferData) => {
		if (!user) throw new Error('User not authenticated');
		const fromAccountId = normalizeRequiredText(
			data.fromAccountId,
			'Source account',
			TEXT_LIMITS.documentId
		);
		const toAccountId = normalizeRequiredText(
			data.toAccountId,
			'Destination account',
			TEXT_LIMITS.documentId
		);
		if (fromAccountId === toAccountId) {
			throw new Error('Source and destination accounts must be different.');
		}
		const title = normalizeRequiredText(data.title, 'Title', TEXT_LIMITS.title);
		const description = normalizeOptionalText(
			data.description,
			'Description',
			TEXT_LIMITS.description
		);
		const amount = assertPositiveMoney(data.amount);
		const date = assertValidDate(data.date);

		await runFinancialCommand('createTransfer', {
			fromAccountId,
			toAccountId,
			title,
			amount,
			...(description ? { description } : {}),
			...(date ? { date: date.toISOString() } : {}),
		});
	};

	const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
		if (!user) throw new Error('User not authenticated');
		try {
			const transactionId = normalizeRequiredText(id, 'Transaction ID', TEXT_LIMITS.documentId);
			if (updates.type === 'transfer') {
				throw new Error('Transfers cannot be edited. Delete and recreate the transfer instead.');
			}
			if (updates.type && updates.type !== 'income' && updates.type !== 'expense') {
				throw new Error('Transaction type must be income or expense.');
			}

			const updateData: Record<string, unknown> = {};
			if (updates.title !== undefined) {
				updateData.title = normalizeRequiredText(updates.title, 'Title', TEXT_LIMITS.title);
			}
			if (updates.amount !== undefined) updateData.amount = assertPositiveMoney(updates.amount);
			if (updates.type !== undefined) updateData.type = updates.type;
			if (updates.accountId !== undefined) {
				updateData.accountId = normalizeRequiredText(
					updates.accountId,
					'Account',
					TEXT_LIMITS.documentId
				);
			}
			if (updates.category !== undefined) {
				updateData.category = normalizeRequiredText(
					updates.category,
					'Category',
					TEXT_LIMITS.category
				);
			}
			if (Object.prototype.hasOwnProperty.call(updates, 'subcategory')) {
				updateData.subcategory = normalizeOptionalText(
						updates.subcategory,
						'Subcategory',
						TEXT_LIMITS.subcategory
					) ?? null;
			}
			if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
				updateData.description = normalizeOptionalText(
						updates.description,
						'Description',
						TEXT_LIMITS.description
					) ?? null;
			}
			if (updates.date !== undefined) {
				const date = assertValidDate(updates.date);
				if (date) updateData.date = date.toISOString();
			}
			await runFinancialCommand('updateTransaction', {
				transactionId,
				updates: updateData as FinancialCommandPayloads['updateTransaction']['updates'],
			});
		} catch (error) {
			console.error('Error updating transaction:', error);
			throw error;
		}
	};

	const bulkUpdateTransactionCategories = async (
		ids: string[],
		category: string,
		subcategory?: string
	) => {
		if (!user) throw new Error('User not authenticated');

		const trimmedCategory = normalizeRequiredText(category, 'Category', TEXT_LIMITS.category);
		const trimmedSubcategory = normalizeOptionalText(
			subcategory,
			'Subcategory',
			TEXT_LIMITS.subcategory
		);
		const uniqueIds = Array.from(
			new Set(
				ids.map((id) => normalizeRequiredText(id, 'Transaction ID', TEXT_LIMITS.documentId))
			)
		);

		if (uniqueIds.length === 0) {
			return;
		}

		await runFinancialCommand('bulkUpdateTransactionCategories', {
			transactionIds: uniqueIds,
			category: trimmedCategory,
			subcategory: trimmedSubcategory ?? null,
		});
	};

	const deleteTransaction = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		try {
			const transactionId = normalizeRequiredText(id, 'Transaction ID', TEXT_LIMITS.documentId);
			await runFinancialCommand('deleteTransaction', { transactionId });
		} catch (error) {
			console.error('Error deleting transaction:', error);
			throw error;
		}
	};

	const deleteAllTransactions = async () => {
		if (!user) throw new Error('User not authenticated');

		try {
			await runFinancialCommand('deleteAllTransactions', {});
		} catch (error) {
			console.error('Error deleting all transactions:', error);
			throw error;
		}
	};

	return {
		transactions,
		addTransaction,
		addTransfer,
		updateTransaction,
		bulkUpdateTransactionCategories,
		deleteTransaction,
		deleteAllTransactions,
		loading,
	};
};
