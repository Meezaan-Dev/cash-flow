import {
	getCategoryBreakdown,
	getCurrentMonthDateRange,
	getMonthDateRange,
	getMonthlyAccountSummaries,
	getMonthlyCategorySummaries,
	getPreviousMonthDateRange,
	getNetWorth,
	getSpendingBySubcategory,
} from '../ReportsController';
import { Account, Transaction } from '@/types';

const baseTransaction: Transaction = {
	id: 'tx-1',
	accountId: 'account-1',
	title: 'Transaction',
	amount: 100,
	type: 'expense',
	category: 'food',
	date: new Date('2026-05-10T12:00:00Z'),
};

describe('ReportsController', () => {
	it('calculates net worth from signed balances without treating credit type as debt', () => {
		const accounts: Account[] = [
			{ id: 'account-1', name: 'Cheque', type: 'debit', balance: 1000 },
			{
				id: 'account-2',
				name: 'Credit',
				type: 'credit',
				balance: 3500,
				creditLimit: 300,
			},
			{ id: 'account-3', name: 'Overdrawn', type: 'credit', balance: -100 },
		];

		expect(getNetWorth(accounts)).toEqual({
			assets: 4500,
			liabilities: 100,
			netWorth: 4400,
		});
	});

	it('builds a current month range from day 1 through today', () => {
		expect(getCurrentMonthDateRange(new Date('2026-05-14T12:00:00Z'))).toEqual({
			startDate: '2026-05-01',
			endDate: '2026-05-14',
		});
	});

	it('builds full calendar month ranges', () => {
		expect(getMonthDateRange(2026, 1)).toEqual({
			startDate: '2026-02-01',
			endDate: '2026-02-28',
		});
		expect(getMonthDateRange(2024, 1)).toEqual({
			startDate: '2024-02-01',
			endDate: '2024-02-29',
		});
	});

	it('builds previous month ranges across month boundaries', () => {
		expect(
			getPreviousMonthDateRange({
				startDate: '2026-03-31',
				endDate: '2026-03-31',
			})
		).toEqual({
			startDate: '2026-02-28',
			endDate: '2026-02-28',
		});
		expect(
			getPreviousMonthDateRange({
				startDate: '2026-05-01',
				endDate: '2026-05-14',
			})
		).toEqual({
			startDate: '2026-04-01',
			endDate: '2026-04-14',
		});
	});

	it('groups spending by category and subcategory', () => {
		const result = getSpendingBySubcategory(
			[
				{ ...baseTransaction, id: 'tx-1', subcategory: 'groceries', amount: 120 },
				{ ...baseTransaction, id: 'tx-2', subcategory: 'groceries', amount: 80 },
				{ ...baseTransaction, id: 'tx-3', subcategory: 'takeaways_eating_out', amount: 50 },
			],
			{ startDate: '', endDate: '' }
		);

		expect(result).toEqual([
			expect.objectContaining({
				category: 'food',
				subcategory: 'groceries',
				amount: 200,
			}),
			expect.objectContaining({
				category: 'food',
				subcategory: 'takeaways_eating_out',
				amount: 50,
			}),
		]);
	});

	it('uses an undefined subcategory bucket when transactions have no subcategory', () => {
		const result = getSpendingBySubcategory(
			[
				{ ...baseTransaction, id: 'tx-1', amount: 40 },
				{ ...baseTransaction, id: 'tx-2', subcategory: '   ', amount: 60 },
			],
			{ startDate: '', endDate: '' }
		);

		expect(result).toEqual([
			expect.objectContaining({
				category: 'food',
				subcategory: undefined,
				amount: 100,
			}),
		]);
	});

	it('keeps main category totals while exposing subcategory rows', () => {
		const result = getCategoryBreakdown(
			[
				{ ...baseTransaction, id: 'tx-1', subcategory: 'groceries', amount: 75 },
				{ ...baseTransaction, id: 'tx-2', subcategory: 'takeaways_eating_out', amount: 25 },
			],
			{ startDate: '', endDate: '' }
		);

		expect(result).toEqual([
			expect.objectContaining({
				category: 'food',
				amount: 100,
				subcategories: [
					{
						category: 'food',
						subcategory: 'groceries',
						amount: 75,
						percentage: 75,
					},
					{
						category: 'food',
						subcategory: 'takeaways_eating_out',
						amount: 25,
						percentage: 25,
					},
				],
			}),
		]);
	});

	it('applies date range filtering to subcategory reports', () => {
		const result = getSpendingBySubcategory(
			[
				{
					...baseTransaction,
					id: 'tx-1',
					subcategory: 'groceries',
					amount: 120,
					date: new Date('2026-05-10T12:00:00Z'),
				},
				{
					...baseTransaction,
					id: 'tx-2',
					subcategory: 'groceries',
					amount: 80,
					date: new Date('2026-04-10T12:00:00Z'),
				},
			],
			{ startDate: '2026-05-01', endDate: '2026-05-31' }
		);

		expect(result).toEqual([
			expect.objectContaining({
				category: 'food',
				subcategory: 'groceries',
				amount: 120,
			}),
		]);
	});

	it('summarizes monthly category rows with percentages, counts, and deltas', () => {
		const result = getMonthlyCategorySummaries(
			[
				{ ...baseTransaction, id: 'tx-1', category: 'food', subcategory: 'groceries', amount: 150 },
				{ ...baseTransaction, id: 'tx-2', category: 'food', subcategory: 'takeaways_eating_out', amount: 50 },
				{ ...baseTransaction, id: 'tx-3', category: 'travel', amount: 100 },
				{
					...baseTransaction,
					id: 'tx-4',
					category: 'food',
					subcategory: 'groceries',
					amount: 80,
					date: new Date('2026-04-10T12:00:00Z'),
				},
			],
			{ startDate: '2026-05-01', endDate: '2026-05-31' },
			{ startDate: '2026-04-01', endDate: '2026-04-30' }
		);

		expect(result[0]).toEqual(
			expect.objectContaining({
				category: 'food',
				amount: 200,
				percentage: expect.closeTo(66.67, 2),
				transactionCount: 2,
				previousAmount: 80,
				deltaAmount: 120,
			})
		);
		expect(result[0].subcategories).toEqual([
			expect.objectContaining({
				category: 'food',
				subcategory: 'groceries',
				amount: 150,
				percentage: 75,
				transactionCount: 1,
				previousAmount: 80,
				deltaAmount: 70,
			}),
			expect.objectContaining({
				category: 'food',
				subcategory: 'takeaways_eating_out',
				amount: 50,
				percentage: 25,
				transactionCount: 1,
			}),
		]);
	});

	it('summarizes monthly account activity and filters by account', () => {
		const accounts: Account[] = [
			{ id: 'account-1', name: 'Cheque', type: 'debit', balance: 1000 },
			{ id: 'account-2', name: 'Savings', type: 'savings', balance: 500 },
		];

		const result = getMonthlyAccountSummaries(
			[
				{ ...baseTransaction, id: 'tx-1', accountId: 'account-1', amount: 120 },
				{
					...baseTransaction,
					id: 'tx-2',
					accountId: 'account-1',
					type: 'income',
					amount: 500,
				},
				{ ...baseTransaction, id: 'tx-3', accountId: 'account-2', amount: 40 },
				{
					...baseTransaction,
					id: 'tx-4',
					accountId: 'account-1',
					amount: 60,
					date: new Date('2026-04-10T12:00:00Z'),
				},
			],
			accounts,
			{ startDate: '2026-05-01', endDate: '2026-05-31' },
			'account-1'
		);

		expect(result).toEqual([
			expect.objectContaining({
				accountId: 'account-1',
				accountName: 'Cheque',
				income: 500,
				expense: 120,
				net: 380,
				transactionCount: 2,
			}),
		]);
	});
});
