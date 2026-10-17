import type { Transaction, TransactionType } from '@/types';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';

export type ReportGrouping = 'month' | 'category' | 'subcategory';
export type ReportTransactionType = 'all' | TransactionType;

export interface ReportFilters {
	startDate: string;
	endDate: string;
	accountId: string;
	type: ReportTransactionType;
	groupBy: ReportGrouping;
}

export interface ReportBreakdownRow {
	key: string;
	label: string;
	income: number;
	expenses: number;
	transfers: number;
	net: number;
	count: number;
}

export const getReportMonthKeys = (startDate: string, endDate: string): string[] => {
	const start = new Date(`${startDate.slice(0, 7)}-01T00:00:00`);
	const end = new Date(`${endDate.slice(0, 7)}-01T00:00:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
	const months: string[] = [];
	const cursor = new Date(start);
	while (cursor <= end && months.length < 120) {
		months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
		cursor.setMonth(cursor.getMonth() + 1);
	}
	return months;
};

export const getReportTransactionDate = (transaction: Transaction): Date | null =>
	parseDbDateOrNull(transaction.date ?? transaction.createdAt);

export const filterReportTransactions = (
	transactions: Transaction[],
	filters: ReportFilters
): Transaction[] => {
	const start = new Date(`${filters.startDate}T00:00:00`);
	const end = new Date(`${filters.endDate}T23:59:59.999`);
	return transactions.filter((transaction) => {
		const date = getReportTransactionDate(transaction);
		return Boolean(
			date && date >= start && date <= end &&
			(filters.accountId === 'all' || transaction.accountId === filters.accountId) &&
			(filters.type === 'all' || transaction.type === filters.type)
		);
	});
};

export const getReportMatrixCellAmount = (
	transaction: Transaction,
	typeFilter: ReportTransactionType
): number => {
	if (typeFilter === 'all') {
		return transaction.type === 'expense' ? transaction.amount : 0;
	}
	return transaction.type === typeFilter ? transaction.amount : 0;
};

export const getReportGroupKey = (transaction: Transaction, grouping: ReportGrouping): string => {
	if (grouping === 'category') return transaction.category || 'uncategorised';
	if (grouping === 'subcategory') return `${transaction.category || 'uncategorised'}::${transaction.subcategory || 'other'}`;
	const date = getReportTransactionDate(transaction);
	return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'unknown';
};

export const buildReportBreakdown = (
	transactions: Transaction[],
	grouping: ReportGrouping,
	labelFor: (key: string) => string = (key) => key
): ReportBreakdownRow[] => {
	const groups = new Map<string, ReportBreakdownRow>();
	transactions.forEach((transaction) => {
		const key = getReportGroupKey(transaction, grouping);
		const row = groups.get(key) ?? {
			key,
			label: labelFor(key),
			income: 0,
			expenses: 0,
			transfers: 0,
			net: 0,
			count: 0,
		};
		if (transaction.type === 'income') row.income += transaction.amount;
		if (transaction.type === 'expense') row.expenses += transaction.amount;
		if (transaction.type === 'transfer') row.transfers += transaction.amount;
		row.net = row.income - row.expenses;
		row.count += 1;
		groups.set(key, row);
	});
	return [...groups.values()].sort((left, right) =>
		grouping === 'month' ? left.key.localeCompare(right.key) : right.expenses - left.expenses
	);
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const reportRowsToCsv = (rows: ReportBreakdownRow[]): string => [
	['Group', 'Income', 'Expenses', 'Transfers', 'Net', 'Transactions'].map(csvCell).join(','),
	...rows.map((row) => [row.label, row.income, row.expenses, row.transfers, row.net, row.count].map(csvCell).join(',')),
].join('\n');

export const reportTransactionsToCsv = (transactions: Transaction[]): string => [
	['Date', 'Title', 'Type', 'Account ID', 'Category', 'Subcategory', 'Amount', 'Notes'].map(csvCell).join(','),
	...transactions.map((transaction) => [
		getReportTransactionDate(transaction)?.toISOString().slice(0, 10) ?? '',
		transaction.title,
		transaction.type,
		transaction.accountId,
		transaction.category,
		transaction.subcategory ?? '',
		transaction.amount,
		transaction.description ?? '',
	].map(csvCell).join(',')),
].join('\n');
