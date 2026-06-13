import {
	calculateAvailableBalance,
	calculateNetWorth,
} from '@/domains/accounts/models/AccountModel';
import {
	DashboardDigestPeriod,
	getDashboardDigestDateRange,
} from '@/pages/dashboard/utils/digestPeriod';
import { Account, Transaction } from '@/types';
import { parseDbDateOrNull } from '@/utils/date';

export interface DashboardSummary {
	income: number;
	expense: number;
	saved: number;
	transactionCount: number;
	availableBalance: number;
	netWorth: number;
	monthLabel: string;
	periodLabel: string;
	startDate: string;
	endDate: string;
	progressPercent: number;
}

const getTransactionDate = (transaction: Transaction): Date | null =>
	parseDbDateOrNull(transaction.date) ?? parseDbDateOrNull(transaction.createdAt);

const isInDateRange = (date: Date, startDate: string, endDate: string): boolean => {
	const start = new Date(startDate);
	const end = new Date(endDate);
	end.setHours(23, 59, 59, 999);

	return date >= start && date <= end;
};

const formatPeriodLabel = (startDate: string, endDate: string): string => {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const includeStartYear = start.getFullYear() !== end.getFullYear();
	const startLabel = start.toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
		...(includeStartYear ? { year: 'numeric' as const } : {}),
	});
	const endLabel = end.toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});

	return `${startLabel} - ${endLabel}`;
};

export const calculateDashboardSummary = (
	transactions: Transaction[],
	accounts: Account[],
	today = new Date(),
	digestPeriod?: DashboardDigestPeriod
): DashboardSummary => {
	const { startDate, endDate } = getDashboardDigestDateRange(digestPeriod, today);
	const monthTransactions = transactions.filter((transaction) => {
		const date = getTransactionDate(transaction);
		return date ? isInDateRange(date, startDate, endDate) : false;
	});

	const income = monthTransactions
		.filter((transaction) => transaction.type === 'income')
		.reduce((sum, transaction) => sum + transaction.amount, 0);
	const expense = monthTransactions
		.filter((transaction) => transaction.type === 'expense')
		.reduce((sum, transaction) => sum + transaction.amount, 0);
	const netWorth = calculateNetWorth(accounts).netWorth;
	const progressPercent =
		income > 0 ? Math.min(100, Math.max(0, ((income - expense) / income) * 100)) : 0;

	return {
		income,
		expense,
		saved: income - expense,
		transactionCount: monthTransactions.length,
		availableBalance: calculateAvailableBalance(accounts),
		netWorth,
		monthLabel: today.toLocaleDateString('en-ZA', {
			month: 'long',
			year: 'numeric',
		}),
		periodLabel: formatPeriodLabel(startDate, endDate),
		startDate,
		endDate,
		progressPercent,
	};
};
