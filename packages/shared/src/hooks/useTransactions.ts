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
		if (!data.category.trim()) throw new Error('Category is required.');

		const batch = writeBatch(db);
		const accountRef = doc(db, 'users', user.uid, 'accounts', data.accountId);

		const txCol = collection(db, 'users', user.uid, 'transactions');
		const txRef = doc(txCol);

		const { date, subcategory, ...rest } = data;
		const txData: DocumentData = {
			...rest,
			category: rest.category.trim(),
			...(subcategory?.trim() ? { subcategory: subcategory.trim() } : {}),
			createdAt: Timestamp.now(),
			userId: user.uid,
		};

		if (date) {
			txData.date = Timestamp.fromDate(date);
		}

		batch.set(txRef, txData);

		// Update account balance
		const balanceDelta = data.type === 'income' ? data.amount : -data.amount;
		batch.update(accountRef, { balance: increment(balanceDelta) });

		await batch.commit();
	};

	const addTransfer = async (data: AddTransferData) => {
		if (!user) throw new Error('User not authenticated');

		const fromRef = doc(db, 'users', user.uid, 'accounts', data.fromAccountId);
		const toRef = doc(db, 'users', user.uid, 'accounts', data.toAccountId);
		const batch = writeBatch(db);
		const txCol = collection(db, 'users', user.uid, 'transactions');
		const now = Timestamp.now();
		const txDate = data.date ? Timestamp.fromDate(data.date) : now;

		// Expense on source account
		const expenseRef = doc(txCol);
		batch.set(expenseRef, {
			userId: user.uid,
			accountId: data.fromAccountId,
			transferAccountId: data.toAccountId,
			title: data.title,
			amount: data.amount,
			type: 'transfer',
			category: 'transfer',
			description: data.description ?? '',
			date: txDate,
			createdAt: now,
		});

		// Income on destination account
		const incomeRef = doc(txCol);
		batch.set(incomeRef, {
			userId: user.uid,
			accountId: data.toAccountId,
			transferAccountId: data.fromAccountId,
			title: data.title,
			amount: data.amount,
			type: 'transfer',
			category: 'transfer',
			description: data.description ?? '',
			date: txDate,
			createdAt: now,
		});

		// Debit source account balance
		batch.update(fromRef, { balance: increment(-data.amount) });

		// Credit destination account balance
		batch.update(toRef, { balance: increment(data.amount) });

		await batch.commit();
	};

	const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
		if (!user) throw new Error('User not authenticated');
		try {
			const txRef = doc(db, 'users', user.uid, 'transactions', id);

			// Read current state so we can compute balance delta
			const snap = await getDoc(txRef);
			const old: DocumentData | null = snap.exists() ? snap.data() : null;

			if (
				updates.type !== 'transfer' &&
				Object.prototype.hasOwnProperty.call(updates, 'category') &&
				!updates.category?.trim()
			) {
				throw new Error('Category is required.');
			}

			const updateData: DocumentData = Object.fromEntries(
				Object.entries(updates).filter(([, value]) => value !== undefined)
			);
			if (typeof updates.category === 'string') {
				updateData.category = updates.category.trim();
			}
			if (typeof updates.subcategory === 'string') {
				const trimmedSubcategory = updates.subcategory.trim();
				if (trimmedSubcategory) {
					updateData.subcategory = trimmedSubcategory;
				} else {
					updateData.subcategory = deleteField();
				}
			}
			if (
				Object.prototype.hasOwnProperty.call(updates, 'subcategory') &&
				updates.subcategory === undefined
			) {
				updateData.subcategory = deleteField();
			}
			if (updates.date instanceof Date) {
				updateData.date = Timestamp.fromDate(updates.date);
			}

			const batch = writeBatch(db);
			batch.update(txRef, updateData as UpdateData<Transaction>);

			// Adjust account balances when amount, type, or accountId changes
			if (old && old.type !== 'transfer') {
				const oldAccountId: string = old.accountId;
				const newAccountId: string = updates.accountId ?? oldAccountId;
				const oldAmount: number = old.amount;
				const newAmount: number = updates.amount ?? oldAmount;
				const oldType: string = old.type;
				const newType: string = updates.type ?? oldType;

				const oldDelta = oldType === 'income' ? oldAmount : -oldAmount;
				const newDelta = newType === 'income' ? newAmount : -newAmount;

				if (oldAccountId !== newAccountId) {
					// Reverse old balance on old account, apply new balance on new account
					const oldAccountRef = doc(db, 'users', user.uid, 'accounts', oldAccountId);
					const newAccountRef = doc(db, 'users', user.uid, 'accounts', newAccountId);
					const [oldAcctSnap, newAcctSnap] = await Promise.all([
						getDoc(oldAccountRef),
						getDoc(newAccountRef),
					]);
					if (oldAcctSnap.exists()) {
						batch.update(oldAccountRef, { balance: increment(-oldDelta) });
					}
					if (newAcctSnap.exists()) {
						batch.update(newAccountRef, { balance: increment(newDelta) });
					}
				} else {
					const balanceChange = newDelta - oldDelta;
					if (balanceChange !== 0) {
						const accountRef = doc(db, 'users', user.uid, 'accounts', oldAccountId);
						const acctSnap = await getDoc(accountRef);
						if (acctSnap.exists()) {
							batch.update(accountRef, { balance: increment(balanceChange) });
						}
					}
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

		const trimmedCategory = category.trim();
		const trimmedSubcategory = subcategory?.trim() ?? '';
		const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

		if (!trimmedCategory) {
			throw new Error('Category is required.');
		}

		if (uniqueIds.length === 0) {
			return;
		}

		for (const chunk of chunkArray(uniqueIds, 400)) {
			const batch = writeBatch(db);

			for (const id of chunk) {
				const txRef = doc(db, 'users', user.uid, 'transactions', id);
				batch.update(txRef, {
					category: trimmedCategory,
					subcategory: trimmedSubcategory || deleteField(),
				});
			}

			await batch.commit();
		}
	};

	const deleteTransaction = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		try {
			const tx = transactions.find((t) => t.id === id);
			const batch = writeBatch(db);

			const txRef = doc(db, 'users', user.uid, 'transactions', id);
			batch.delete(txRef);

			if (tx && tx.accountId) {
				if (tx.type === 'transfer' && tx.transferAccountId) {
					// Find and delete the paired transfer record, reverse both balances
					const partner = transactions.find(
						(t) =>
							t.id !== id &&
							t.accountId === tx.transferAccountId &&
							t.transferAccountId === tx.accountId
					);
					if (partner?.id) {
						const partnerRef = doc(db, 'users', user.uid, 'transactions', partner.id);
						batch.delete(partnerRef);
						// Reverse credit on destination account if it exists
						const partnerAccountRef = doc(db, 'users', user.uid, 'accounts', partner.accountId);
						const partnerAcctSnap = await getDoc(partnerAccountRef);
						if (partnerAcctSnap.exists()) {
							batch.update(partnerAccountRef, { balance: increment(-partner.amount) });
						}
					}
					// Reverse debit on source account if it exists
					const sourceAccountRef = doc(db, 'users', user.uid, 'accounts', tx.accountId);
					const sourceAcctSnap = await getDoc(sourceAccountRef);
					if (sourceAcctSnap.exists()) {
						batch.update(sourceAccountRef, { balance: increment(tx.amount) });
					}
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

			const batch = writeBatch(db);
			txSnapshot.docs.forEach((d) => batch.delete(d.ref));
			acctSnapshot.docs.forEach((d) => batch.update(d.ref, { balance: 0 }));
			await batch.commit();
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
