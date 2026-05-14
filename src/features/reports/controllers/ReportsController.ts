import { Transaction, Account, DateRange, CategoryReport, AccountReport, MonthlyTrend, NetWorthData } from '@/types';
import { parseDbDateOrNull } from '@/utils/date';

const CHART_COLORS = [
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

const getTransactionDate = (t: Transaction): Date => {
	const d = parseDbDateOrNull(t.date) ?? parseDbDateOrNull(t.createdAt);
	return d ?? new Date();
};

const isInDateRange = (date: Date, range: DateRange): boolean => {
	if (!range.startDate && !range.endDate) return true;
	if (range.startDate && date < new Date(range.startDate)) return false;
	if (range.endDate) {
		const end = new Date(range.endDate);
		end.setHours(23, 59, 59, 999);
		if (date > end) return false;
	}
	return true;
};

export const getSpendingByCategory = (
	transactions: Transaction[],
	dateRange: DateRange
): CategoryReport[] => {
	const map: Record<string, number> = {};

	transactions
		.filter((t) => t.type === 'expense')
		.filter((t) => isInDateRange(getTransactionDate(t), dateRange))
		.forEach((t) => {
			map[t.category] = (map[t.category] ?? 0) + t.amount;
		});

	return Object.entries(map).map(([category, amount], index) => ({
		category,
		amount,
		color: CHART_COLORS[index % CHART_COLORS.length],
	}));
};

export const getSpendingByAccount = (
	transactions: Transaction[],
	accounts: Account[],
	dateRange: DateRange
): AccountReport[] => {
	const map: Record<string, { income: number; expense: number }> = {};

	transactions
		.filter((t) => isInDateRange(getTransactionDate(t), dateRange))
		.forEach((t) => {
			if (!map[t.accountId]) map[t.accountId] = { income: 0, expense: 0 };
			if (t.type === 'income') map[t.accountId].income += t.amount;
			else if (t.type === 'expense') map[t.accountId].expense += t.amount;
		});

	return Object.entries(map).map(([accountId, data], index) => {
		const account = accounts.find((a) => a.id === accountId);
		return {
			accountId,
			accountName: account?.name ?? 'Unknown',
			color: account?.color ?? CHART_COLORS[index % CHART_COLORS.length],
			...data,
		};
	});
};

export const getMonthlyTrend = (
	transactions: Transaction[],
	months: number = 6
): MonthlyTrend[] => {
	const result: MonthlyTrend[] = [];
	const now = new Date();

	for (let i = months - 1; i >= 0; i--) {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
		const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

		const monthLabel = date.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });

		const inMonth = transactions.filter((t) => {
			const d = getTransactionDate(t);
			return d >= monthStart && d <= monthEnd;
		});

		const income = inMonth
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);

		const expense = inMonth
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);

		result.push({ month: monthLabel, income, expense });
	}

	return result;
};

export const getNetWorth = (accounts: Account[]): NetWorthData => {
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
