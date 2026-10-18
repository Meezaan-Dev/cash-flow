import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/firebase';
import {
	collection,
	doc,
	query,
	onSnapshot,
	getDocs,
	limit,
	orderBy,
	startAfter,
	deleteField,
	writeBatch,
} from 'firebase/firestore';
import { Transaction } from '../types';
import { normalizeTransaction } from '../transactions/TransactionModel';
import { apiService, type TransactionResetJob } from '../services/api';
import { useAuthUser } from '../auth/AuthContext';
import {
	TEXT_LIMITS,
	assertPositiveMoney,
	assertValidDate,
	normalizeOptionalText,
	normalizeRequiredText,
} from '../validation';

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

const chunkArray = <T,>(items: T[], size: number): T[][] => {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
};

export const useTransactions = () => {
	const { user, authReady } = useAuthUser();
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const loadingMoreRef = useRef(false);
	const hasMoreRef = useRef(true);
	const lastDocumentRef = useRef<unknown>(null);

	useEffect(() => {
		if (!authReady) return;
		lastDocumentRef.current = null;
		hasMoreRef.current = true;
		loadingMoreRef.current = false;
		setHasMore(true);
		if (!user) {
			setTransactions([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const txCol = collection(db, 'users', user.uid, 'transactions');
		const q = query(txCol, orderBy('createdAt', 'desc'), limit(500));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetched = snapshot.docs.map((d) =>
				normalizeTransaction({ id: d.id, ...d.data() })
			);
			lastDocumentRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
			const nextHasMore = snapshot.docs.length === 500;
			hasMoreRef.current = nextHasMore;
			setHasMore(nextHasMore);
			setTransactions((current) => {
				const fetchedIds = new Set(fetched.map((transaction) => transaction.id));
				return [...fetched, ...current.filter((transaction) => !fetchedIds.has(transaction.id))];
			});
			setLoading(false);
		}, (error) => {
			console.error('Error fetching transactions:', error);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user, authReady]);

	const loadMoreTransactions = useCallback(async () => {
		if (!user || loadingMoreRef.current || !hasMoreRef.current || !lastDocumentRef.current) return false;
		loadingMoreRef.current = true;
		setLoadingMore(true);
		try {
			const snapshot = await getDocs(
				query(
					collection(db, 'users', user.uid, 'transactions'),
					orderBy('createdAt', 'desc'),
					startAfter(lastDocumentRef.current),
					limit(500)
				)
			);
			const fetched = snapshot.docs.map((document) =>
				normalizeTransaction({ id: document.id, ...document.data() })
			);
			lastDocumentRef.current = snapshot.docs[snapshot.docs.length - 1] ?? lastDocumentRef.current;
			const nextHasMore = snapshot.docs.length === 500;
			hasMoreRef.current = nextHasMore;
			setHasMore(nextHasMore);
			setTransactions((current) => {
				const knownIds = new Set(current.map((transaction) => transaction.id));
				return [...current, ...fetched.filter((transaction) => !knownIds.has(transaction.id))];
			});
			return snapshot.docs.length > 0;
		} finally {
			loadingMoreRef.current = false;
			setLoadingMore(false);
		}
	}, [user]);

	const loadAllTransactions = useCallback(async () => {
		while (await loadMoreTransactions()) {
			// Continue until the repository has reached the oldest page.
		}
	}, [loadMoreTransactions]);
	const addTransaction = async (data: AddTransactionData): Promise<string> => {
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

		return apiService.addTransaction({
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
			...(recurringOccurrenceDate ? { recurringOccurrenceDate } : {}),
			...(date ? { date } : {}),
		});
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

		await apiService.addTransfer({
			fromAccountId,
			toAccountId,
			title,
			amount,
			...(description ? { description } : {}),
			...(date ? { date } : {}),
		});
	};

	const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
		if (!user) throw new Error('User not authenticated');
		try {
			if (updates.type && updates.type !== 'income' && updates.type !== 'expense') {
				throw new Error('Transaction type must be income or expense.');
			}

			const transactionId = normalizeRequiredText(id, 'Transaction ID', TEXT_LIMITS.documentId);
			const updateData: Partial<AddTransactionData> = {};
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
				updateData.subcategory =
					normalizeOptionalText(
						updates.subcategory,
						'Subcategory',
						TEXT_LIMITS.subcategory
					) ?? '';
			}
			if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
				updateData.description =
					normalizeOptionalText(
						updates.description,
						'Description',
						TEXT_LIMITS.description
					) ?? '';
			}
			if (updates.date !== undefined) {
				const date = assertValidDate(updates.date);
				if (date) updateData.date = date;
			}

			await apiService.updateTransaction({ id: transactionId, ...updateData });
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

		for (const chunk of chunkArray(uniqueIds, 400)) {
			const batch = writeBatch(db);

			for (const id of chunk) {
				const txRef = doc(db, 'users', user.uid, 'transactions', id);
				batch.update(txRef, {
					category: trimmedCategory,
					subcategory: trimmedSubcategory ?? deleteField(),
				});
			}

			await batch.commit();
		}
	};

	const deleteTransaction = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		try {
			const transactionId = normalizeRequiredText(id, 'Transaction ID', TEXT_LIMITS.documentId);
			await apiService.deleteTransaction(transactionId);
		} catch (error) {
			console.error('Error deleting transaction:', error);
			throw error;
		}
	};

	const deleteAllTransactions = async (
		onProgress?: (job: TransactionResetJob) => void
	) => {
		if (!user) throw new Error('User not authenticated');

		try {
			await apiService.deleteAllTransactions(onProgress);
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
		loadMoreTransactions,
		loadAllTransactions,
		hasMoreTransactions: hasMore,
		loadingMoreTransactions: loadingMore,
		loading,
	};
};
