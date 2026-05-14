import { Account, Transaction } from '@/types';
import { parseDbDateOrNull } from '@/utils/date';

export interface DashboardSummary {
	income: number;
	expense: number;
	saved: number;
	transactionCount: number;
	netWorth: number;
	monthLabel: string;
	progressPercent: number;
}

const formatDateInput = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const getCurrentMonthDateRange = (today = new Date()) => ({
	startDate: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
	endDate: formatDateInput(today),
});

const getTransactionDate = (transaction: Transaction): Date | null =>
	parseDbDateOrNull(transaction.date) ?? parseDbDateOrNull(transaction.createdAt);

const isInDateRange = (date: Date, startDate: string, endDate: string): boolean => {
	const start = new Date(startDate);
	const end = new Date(endDate);
	end.setHours(23, 59, 59, 999);

	return date >= start && date <= end;
};

export const calculateDashboardSummary = (
	transactions: Transaction[],
	accounts: Account[],
	today = new Date()
): DashboardSummary => {
	const { startDate, endDate } = getCurrentMonthDateRange(today);
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
	const netWorth = accounts.reduce((sum, account) => {
		if (account.type === 'credit') return sum - Math.abs(account.balance);
		return sum + account.balance;
	}, 0);
	const progressPercent =
		income > 0 ? Math.min(100, Math.max(0, ((income - expense) / income) * 100)) : 0;

	return {
		income,
		expense,
		saved: income - expense,
		transactionCount: monthTransactions.length,
		netWorth,
		monthLabel: today.toLocaleDateString('en-ZA', {
			month: 'long',
			year: 'numeric',
		}),
		progressPercent,
	};
};
