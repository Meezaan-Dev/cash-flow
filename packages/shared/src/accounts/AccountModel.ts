import { Account, AccountType, NetWorthData } from '../types';
import { parseDbDateOrNull } from '../utils/date';

export type { Account };

type AccountDoc = {
	id: string;
	userId?: string;
	name?: string;
	bank?: string;
	type?: string;
	currency?: string;
	balance?: number;
	creditLimit?: number;
	color?: string;
	icon?: string;
	createdAt?: unknown;
};

const normalizePositiveAmount = (amount?: number): number =>
	Math.max(Number(amount ?? 0), 0);

export const normalizeAccountType = (type?: string): AccountType => {
	const normalized = (type ?? '').toLowerCase().trim();
	if (normalized === 'credit') return 'credit';
	if (normalized === 'debit') return 'debit';
	if (normalized === 'savings') return 'savings';
	if (normalized === 'cash') return 'cash';
	return 'cash';
};

export const getAccountCreditLimit = (account: Account): number =>
	account.type === 'credit' ? normalizePositiveAmount(account.creditLimit) : 0;

export const getAccountAvailableBalance = (account: Account): number =>
	account.balance + getAccountCreditLimit(account);

export const getAccountLiability = (account: Account): number =>
	Math.max(-account.balance, 0);

export const getAccountAssetValue = (account: Account): number =>
	Math.max(account.balance, 0);

export const calculateAvailableBalance = (accounts: Account[]): number =>
	accounts.reduce((sum, account) => sum + getAccountAvailableBalance(account), 0);

export const normalizeAccount = (doc: AccountDoc): Account => {
	const normalizedType = normalizeAccountType(doc.type);
	const account: Account = {
		id: doc.id,
		userId: doc.userId,
		name: doc.name ?? '',
		bank: doc.bank,
		type: normalizedType,
		currency: doc.currency ?? 'ZAR',
		balance: doc.balance ?? 0,
		creditLimit: normalizePositiveAmount(doc.creditLimit),
		color: doc.color,
		icon: doc.icon,
	};

	const createdParsed = doc.createdAt != null ? parseDbDateOrNull(doc.createdAt) : null;
	if (createdParsed) {
		account.createdAt = createdParsed;
	}

	return account;
};

export const normalizeAccounts = (docs: AccountDoc[]): Account[] => docs.map(normalizeAccount);

export const calculateNetWorth = (accounts: Account[]): NetWorthData => {
	const assets = accounts.reduce(
		(sum, account) => sum + getAccountAssetValue(account),
		0
	);

	const liabilities = accounts.reduce(
		(sum, account) => sum + getAccountLiability(account),
		0
	);

	return {
		assets,
		liabilities,
		netWorth: assets - liabilities,
	};
};

export const ACCOUNT_COLORS = [
	'#6366f1',
	'#8b5cf6',
	'#ec4899',
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#14b8a6',
	'#0ea5e9',
	'#3b82f6',
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
	debit: 'Debit',
	credit: 'Credit',
	savings: 'Savings',
	cash: 'Cash',
};
