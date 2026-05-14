import { Account, AccountType, NetWorthData } from '@/types';
import { parseDbDateOrNull } from '@/utils/date';

export type { Account };

type AccountDoc = {
	id: string;
	userId?: string;
	name?: string;
	bank?: string;
	type?: string;
	currency?: string;
	balance?: number;
	color?: string;
	icon?: string;
	createdAt?: unknown;
};

export const normalizeAccount = (doc: AccountDoc): Account => {
	const account: Account = {
		id: doc.id,
		userId: doc.userId,
		name: doc.name ?? '',
		bank: doc.bank,
		type: (doc.type as AccountType) ?? 'cash',
		currency: doc.currency ?? 'ZAR',
		balance: doc.balance ?? 0,
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
	const assets = accounts
		.filter((a) => a.type !== 'credit')
		.reduce((sum, a) => sum + a.balance, 0);

	const liabilities = accounts
		.filter((a) => a.type === 'credit')
		.reduce((sum, a) => sum + Math.abs(a.balance), 0);

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
