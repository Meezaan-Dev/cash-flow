import {
	buildReportBreakdown,
	filterReportTransactions,
	getReportMatrixCellAmount,
	getReportMonthKeys,
	reportRowsToCsv,
	reportTransactionsToCsv,
	type ReportFilters,
} from '../reportData';
import type { Transaction } from '@/types';

const transactions: Transaction[] = [
	{ id: '1', accountId: 'main', title: 'Salary', amount: 1000, type: 'income', category: 'income', date: new Date('2026-01-05T12:00:00') },
	{ id: '2', accountId: 'main', title: 'Groceries', amount: 250, type: 'expense', category: 'food', subcategory: 'groceries', date: new Date('2026-01-10T12:00:00') },
	{ id: '3', accountId: 'savings', title: 'Fuel', amount: 100, type: 'expense', category: 'transport', date: new Date('2026-02-10T12:00:00') },
];

const filters: ReportFilters = {
	startDate: '2026-01-01',
	endDate: '2026-01-31',
	accountId: 'all',
	type: 'all',
	groupBy: 'category',
};

describe('reportData', () => {
	it('sums matrix cells by the active type filter', () => {
		const income = transactions[0];
		expect(getReportMatrixCellAmount(income, 'all')).toBe(0);
		expect(getReportMatrixCellAmount(income, 'income')).toBe(1000);
		expect(getReportMatrixCellAmount(transactions[1], 'expense')).toBe(250);
	});

	it('filters by the active dates, account, and transaction type', () => {
		expect(filterReportTransactions(transactions, filters).map((item) => item.id)).toEqual(['1', '2']);
		expect(filterReportTransactions(transactions, { ...filters, accountId: 'main', type: 'expense' }).map((item) => item.id)).toEqual(['2']);
	});

	it('keeps empty months in the selected reporting range', () => {
		expect(getReportMonthKeys('2026-01-15', '2026-03-02')).toEqual(['2026-01', '2026-02', '2026-03']);
	});

	it('builds month, category, and subcategory summaries', () => {
		const monthly = buildReportBreakdown(transactions, 'month');
		expect(monthly).toEqual([
			expect.objectContaining({ key: '2026-01', income: 1000, expenses: 250, net: 750, count: 2 }),
			expect.objectContaining({ key: '2026-02', expenses: 100, net: -100, count: 1 }),
		]);
		expect(buildReportBreakdown(transactions, 'subcategory').map((row) => row.key)).toEqual(['food::groceries', 'transport::other', 'income::other']);
	});

	it('exports breakdown and matching-transaction CSV content', () => {
		const rows = buildReportBreakdown(transactions, 'category');
		expect(reportRowsToCsv(rows)).toContain('"Group","Income","Expenses"');
		expect(reportTransactionsToCsv(transactions)).toContain('"Groceries","expense","main","food","groceries","250"');
	});
});
