import { Account, Transaction } from '@/types';
import { calculateDashboardSummary } from '@/features/dashboard/utils/dashboardSummary';

describe('calculateDashboardSummary', () => {
	const accounts: Account[] = [
		{
			id: 'cheque',
			name: 'FNB Cheque',
			type: 'debit',
			balance: 2410,
		},
		{
			id: 'savings',
			name: 'Savings',
			type: 'savings',
			balance: 1872,
		},
		{
			id: 'credit',
			name: 'Credit Card',
			type: 'credit',
			balance: -700,
		},
	];

	it('totals current-month income, expenses, saved amount, and net worth', () => {
		const transactions: Transaction[] = [
			{
				id: 'salary',
				accountId: 'cheque',
				title: 'Salary',
				amount: 8500,
				type: 'income',
				category: 'personal',
				date: new Date('2026-05-01T10:00:00'),
			},
			{
				id: 'groceries',
				accountId: 'cheque',
				title: 'Groceries',
				amount: 480,
				type: 'expense',
				category: 'food',
				date: new Date('2026-05-05T10:00:00'),
			},
			{
				id: 'transfer',
				accountId: 'cheque',
				title: 'Savings transfer',
				amount: 1500,
				type: 'transfer',
				category: 'transfer',
				date: new Date('2026-05-06T10:00:00'),
			},
			{
				id: 'old',
				accountId: 'cheque',
				title: 'April expense',
				amount: 100,
				type: 'expense',
				category: 'food',
				date: new Date('2026-04-30T10:00:00'),
			},
		];

		const summary = calculateDashboardSummary(
			transactions,
			accounts,
			new Date('2026-05-14T12:00:00')
		);

		expect(summary.income).toBe(8500);
		expect(summary.expense).toBe(480);
		expect(summary.saved).toBe(8020);
		expect(summary.transactionCount).toBe(3);
		expect(summary.netWorth).toBe(3582);
		expect(summary.progressPercent).toBeCloseTo(94.35, 2);
	});

	it('returns empty-state totals when there is no current-month activity', () => {
		const summary = calculateDashboardSummary([], [], new Date('2026-05-14T12:00:00'));

		expect(summary.income).toBe(0);
		expect(summary.expense).toBe(0);
		expect(summary.saved).toBe(0);
		expect(summary.transactionCount).toBe(0);
		expect(summary.netWorth).toBe(0);
		expect(summary.progressPercent).toBe(0);
	});
});
