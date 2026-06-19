import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
	collection,
	query,
	onSnapshot,
} from 'firebase/firestore';
import { Account } from '../types';
import { normalizeAccount } from '../accounts/AccountModel';
import {
	TEXT_LIMITS,
	assertFiniteMoney,
	normalizeOptionalText,
	normalizeRequiredText,
} from '../validation';
import { runFinancialCommand, type FinancialCommandPayloads } from '../services/financialCommands';

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
		else if (allowFieldDelete) normalized.bank = null;
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
		else if (allowFieldDelete) normalized.icon = null;
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

		await runFinancialCommand(
			'createAccount',
			normalized as unknown as FinancialCommandPayloads['createAccount']
		);
	};

	const updateAccount = async (id: string, updates: Partial<Account>) => {
		if (!user) throw new Error('User not authenticated');
		const accountId = normalizeRequiredText(id, 'Account ID', TEXT_LIMITS.documentId);
		const normalized = normalizeAccountFields(updates, true);
		delete normalized.balance;
		await runFinancialCommand('updateAccount', {
			accountId,
			updates: normalized as FinancialCommandPayloads['updateAccount']['updates'],
		});
	};

	const deleteAccount = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		const accountId = normalizeRequiredText(id, 'Account ID', TEXT_LIMITS.documentId);
		await runFinancialCommand('deleteAccount', { accountId });
	};

	const updateBalance = async (accountId: string, delta: number) => {
		if (!user) throw new Error('User not authenticated');
		const normalizedId = normalizeRequiredText(accountId, 'Account ID', TEXT_LIMITS.documentId);
		const normalizedDelta = assertFiniteMoney(delta, 'Balance change');
		await runFinancialCommand('reconcileAccount', {
			accountId: normalizedId,
			balanceDelta: normalizedDelta,
			category: 'other',
			title: 'Reconciliation Adjustment',
		});
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
