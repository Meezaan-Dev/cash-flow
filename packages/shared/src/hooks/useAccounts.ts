import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
	collection,
	addDoc,
	deleteDoc,
	updateDoc,
	doc,
	query,
	onSnapshot,
	Timestamp,
	deleteField,
	increment,
	type UpdateData,
} from 'firebase/firestore';
import { Account } from '../types';
import { normalizeAccount } from '../accounts/AccountModel';
import {
	TEXT_LIMITS,
	assertFiniteMoney,
	normalizeOptionalText,
	normalizeRequiredText,
} from '../validation';

const normalizeAccountFields = (
	account: Partial<Account>,
	allowFieldDelete = false
): Record<string, unknown> => {
	const normalized: Record<string, unknown> = {};
	if (account.name !== undefined) {
		normalized.name = normalizeRequiredText(account.name, 'Account name', TEXT_LIMITS.accountName);
	}
	if (Object.prototype.hasOwnProperty.call(account, 'bank')) {
		const bank = normalizeOptionalText(account.bank, 'Bank name', TEXT_LIMITS.bankName);
		if (bank) normalized.bank = bank;
		else if (allowFieldDelete) normalized.bank = deleteField();
	}
	if (account.type !== undefined) {
		if (!['debit', 'credit', 'savings', 'cash'].includes(account.type)) {
			throw new Error('Account type is invalid.');
		}
		normalized.type = account.type;
	}
	if (account.balance !== undefined) normalized.balance = assertFiniteMoney(account.balance, 'Balance');
	if (account.creditLimit !== undefined) {
		const creditLimit = assertFiniteMoney(account.creditLimit, 'Credit limit');
		if (creditLimit < 0) throw new Error('Credit limit cannot be negative.');
		normalized.creditLimit = creditLimit;
	}
	if (account.currency !== undefined) {
		if (!/^[A-Z]{3}$/.test(account.currency)) throw new Error('Currency is invalid.');
		normalized.currency = account.currency;
	}
	if (account.color !== undefined) {
		if (!/^#[0-9a-fA-F]{6}$/.test(account.color)) throw new Error('Account color is invalid.');
		normalized.color = account.color;
	}
	if (account.icon !== undefined) {
		const icon = normalizeOptionalText(account.icon, 'Account icon', 80);
		if (icon) normalized.icon = icon;
		else if (allowFieldDelete) normalized.icon = deleteField();
	}
	return normalized;
};

export const useAccounts = () => {
	const [accounts, setAccounts] = useState<Account[]>([]);
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
			setAccounts([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const col = collection(db, 'users', user.uid, 'accounts');
		const q = query(col);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetched = snapshot.docs.map((d) =>
				normalizeAccount({ id: d.id, ...d.data() })
			);
			setAccounts(fetched);
			setLoading(false);
		}, (error) => {
			console.error('Error fetching accounts:', error);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const addAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'userId'>) => {
		if (!user) throw new Error('User not authenticated');
		const normalized = normalizeAccountFields(account);
		if (!normalized.name || !normalized.type || normalized.balance === undefined) {
			throw new Error('Account name, type, and balance are required.');
		}

		const col = collection(db, 'users', user.uid, 'accounts');
		await addDoc(col, {
			...normalized,
			userId: user.uid,
			createdAt: Timestamp.now(),
		});
	};

	const updateAccount = async (id: string, updates: Partial<Account>) => {
		if (!user) throw new Error('User not authenticated');
		const accountId = normalizeRequiredText(id, 'Account ID', TEXT_LIMITS.documentId);
		const ref = doc(db, 'users', user.uid, 'accounts', accountId);
		await updateDoc(ref, normalizeAccountFields(updates, true) as UpdateData<Account>);
	};

	const deleteAccount = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		const accountId = normalizeRequiredText(id, 'Account ID', TEXT_LIMITS.documentId);
		const ref = doc(db, 'users', user.uid, 'accounts', accountId);
		await deleteDoc(ref);
	};

	const updateBalance = async (accountId: string, delta: number) => {
		if (!user) throw new Error('User not authenticated');
		const normalizedId = normalizeRequiredText(accountId, 'Account ID', TEXT_LIMITS.documentId);
		const normalizedDelta = assertFiniteMoney(delta, 'Balance change');
		const ref = doc(db, 'users', user.uid, 'accounts', normalizedId);
		await updateDoc(ref, { balance: increment(normalizedDelta) });
	};

	return {
		accounts,
		addAccount,
		updateAccount,
		deleteAccount,
		updateBalance,
		loading,
	};
};
