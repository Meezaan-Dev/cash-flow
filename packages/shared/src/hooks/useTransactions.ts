import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
	collection,
	doc,
	query,
	onSnapshot,
	Timestamp,
	deleteField,
	writeBatch,
	getDocs,
	getDoc,
	increment,
	type DocumentData,
	type UpdateData,
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

const getDateMillis = (value: Transaction['createdAt']): number | null => {
	if (value instanceof Date) return value.getTime();
	if (value && typeof value === 'object' && 'toDate' in value) {
		return value.toDate().getTime();
	}
	return null;
};

const isLegacyTransferPartner = (left: Transaction, right: Transaction): boolean => {
	const leftCreatedAt = getDateMillis(left.createdAt);
	const rightCreatedAt = getDateMillis(right.createdAt);
	return (
		left.accountId === right.transferAccountId &&
		left.transferAccountId === right.accountId &&
		left.amount === right.amount &&
		left.title === right.title &&
		leftCreatedAt !== null &&
		leftCreatedAt === rightCreatedAt
	);
};

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

		const batch = writeBatch(db);
		const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);

		const txCol = collection(db, 'users', user.uid, 'transactions');
		const txRef = doc(txCol);

		const txData: DocumentData = {
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
			createdAt: Timestamp.now(),
			userId: user.uid,
		};

		if (date) {
			txData.date = Timestamp.fromDate(date);
		}

		batch.set(txRef, txData);

		// Update account balance
		const balanceDelta = data.type === 'income' ? amount : -amount;
		batch.update(accountRef, { balance: increment(balanceDelta) });

		await batch.commit();
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

		const fromRef = doc(db, 'users', user.uid, 'accounts', fromAccountId);
		const toRef = doc(db, 'users', user.uid, 'accounts', toAccountId);
		const batch = writeBatch(db);
		const txCol = collection(db, 'users', user.uid, 'transactions');
		const now = Timestamp.now();
		const txDate = date ? Timestamp.fromDate(date) : now;

		// Expense on source account
		const expenseRef = doc(txCol);
		const transferId = expenseRef.id;
		const sharedTransferData = {
			userId: user.uid,
			transferId,
			title,
			amount,
			type: 'transfer',
			category: 'transfer',
			...(description ? { description } : {}),
			date: txDate,
			createdAt: now,
		};
		batch.set(expenseRef, {
			...sharedTransferData,
			accountId: fromAccountId,
			transferAccountId: toAccountId,
			transferDirection: 'out',
		});

		// Income on destination account
		const incomeRef = doc(txCol);
		batch.set(incomeRef, {
			...sharedTransferData,
			accountId: toAccountId,
			transferAccountId: fromAccountId,
			transferDirection: 'in',
		});

		// Debit source account balance
		batch.update(fromRef, { balance: increment(-amount) });

		// Credit destination account balance
		batch.update(toRef, { balance: increment(amount) });

		await batch.commit();
	};

	const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
		if (!user) throw new Error('User not authenticated');
		try {
			const transactionId = normalizeRequiredText(id, 'Transaction ID', TEXT_LIMITS.documentId);
			const txRef = doc(db, 'users', user.uid, 'transactions', transactionId);

			// Read current state so we can compute balance delta
			const snap = await getDoc(txRef);
			const old: DocumentData | null = snap.exists() ? snap.data() : null;
			if (!old) throw new Error('Transaction not found.');
			if (old.type === 'transfer' || updates.type === 'transfer') {
				throw new Error('Transfers cannot be edited. Delete and recreate the transfer instead.');
			}
			if (updates.type && updates.type !== 'income' && updates.type !== 'expense') {
				throw new Error('Transaction type must be income or expense.');
			}

			const updateData: DocumentData = { updatedAt: Timestamp.now() };
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
					) ?? deleteField();
			}
			if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
				updateData.description =
					normalizeOptionalText(
						updates.description,
						'Description',
						TEXT_LIMITS.description
					) ?? deleteField();
			}
			if (updates.date !== undefined) {
				const date = assertValidDate(updates.date);
				if (date) updateData.date = Timestamp.fromDate(date);
			}

			const batch = writeBatch(db);
			batch.update(txRef, updateData as UpdateData<Transaction>);

			// Adjust account balances when amount, type, or accountId changes
			const oldAccountId = normalizeRequiredText(
				old.accountId,
				'Existing account',
				TEXT_LIMITS.documentId
			);
			const newAccountId: string = updateData.accountId ?? oldAccountId;
			const oldAmount = assertPositiveMoney(old.amount, 'Existing amount');
			const newAmount: number = updateData.amount ?? oldAmount;
			if (old.type !== 'income' && old.type !== 'expense') {
				throw new Error('Existing transaction type is invalid.');
			}
			const oldType: 'income' | 'expense' = old.type;
			const newType: 'income' | 'expense' = updateData.type ?? oldType;

			const oldDelta = oldType === 'income' ? oldAmount : -oldAmount;
			const newDelta = newType === 'income' ? newAmount : -newAmount;

			if (oldAccountId !== newAccountId) {
				const oldAccountRef = doc(db, 'users', user.uid, 'accounts', oldAccountId);
				const newAccountRef = doc(db, 'users', user.uid, 'accounts', newAccountId);
				const [oldAcctSnap, newAcctSnap] = await Promise.all([
					getDoc(oldAccountRef),
					getDoc(newAccountRef),
				]);
				if (!oldAcctSnap.exists() || !newAcctSnap.exists()) {
					throw new Error('Selected account could not be found.');
				}
				batch.update(oldAccountRef, { balance: increment(-oldDelta) });
				batch.update(newAccountRef, { balance: increment(newDelta) });
			} else {
				const balanceChange = newDelta - oldDelta;
				if (balanceChange !== 0) {
					const accountRef = doc(db, 'users', user.uid, 'accounts', oldAccountId);
					const acctSnap = await getDoc(accountRef);
					if (!acctSnap.exists()) throw new Error('Selected account could not be found.');
					batch.update(accountRef, { balance: increment(balanceChange) });
				}
			}

			await batch.commit();
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
			const tx = transactions.find((t) => t.id === transactionId);
			if (!tx) throw new Error('Transaction not found.');
			const batch = writeBatch(db);

			if (tx && tx.accountId) {
				if (tx.type === 'transfer' && tx.transferAccountId) {
					const partner = transactions.find(
						(t) =>
							t.id !== id &&
							t.type === 'transfer' &&
							(tx.transferId
								? t.transferId === tx.transferId
								: isLegacyTransferPartner(tx, t))
					);
					if (!partner?.id) throw new Error('Paired transfer transaction could not be found.');
					if (!tx.transferDirection || !partner.transferDirection) {
						throw new Error('This legacy transfer cannot be deleted safely. Reconcile the accounts instead.');
					}
					const outgoing = tx.transferDirection === 'out' ? tx : partner;
					const incoming = tx.transferDirection === 'in' ? tx : partner;
					const outgoingAccountRef = doc(db, 'users', user.uid, 'accounts', outgoing.accountId);
					const incomingAccountRef = doc(db, 'users', user.uid, 'accounts', incoming.accountId);
					const [outgoingAccount, incomingAccount] = await Promise.all([
						getDoc(outgoingAccountRef),
						getDoc(incomingAccountRef),
					]);
					if (!outgoingAccount.exists() || !incomingAccount.exists()) {
						throw new Error('A transfer account could not be found.');
					}
					batch.delete(doc(db, 'users', user.uid, 'transactions', partner.id));
					batch.update(outgoingAccountRef, { balance: increment(outgoing.amount) });
					batch.update(incomingAccountRef, { balance: increment(-incoming.amount) });
				} else {
					const accountRef = doc(db, 'users', user.uid, 'accounts', tx.accountId);
					const acctSnap = await getDoc(accountRef);
					if (acctSnap.exists()) {
						if (tx.type === 'income') {
							batch.update(accountRef, { balance: increment(-tx.amount) });
						} else if (tx.type === 'expense') {
							batch.update(accountRef, { balance: increment(tx.amount) });
						}
					}
				}
			}
			batch.delete(doc(db, 'users', user.uid, 'transactions', transactionId));

			await batch.commit();
		} catch (error) {
			console.error('Error deleting transaction:', error);
			throw error;
		}
	};

	const deleteAllTransactions = async () => {
		if (!user) throw new Error('User not authenticated');

		try {
			const txCol = collection(db, 'users', user.uid, 'transactions');
			const acctCol = collection(db, 'users', user.uid, 'accounts');
			const [txSnapshot, acctSnapshot] = await Promise.all([
				getDocs(query(txCol)),
				getDocs(query(acctCol)),
			]);

			for (const docs of chunkArray(txSnapshot.docs, 400)) {
				const batch = writeBatch(db);
				docs.forEach((transactionDoc) => batch.delete(transactionDoc.ref));
				await batch.commit();
			}
			for (const docs of chunkArray(acctSnapshot.docs, 400)) {
				const batch = writeBatch(db);
				docs.forEach((accountDoc) => batch.update(accountDoc.ref, { balance: 0 }));
				await batch.commit();
			}
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
