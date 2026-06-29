import {
	budgetOverlapsMonth,
	buildRepeatedBudget,
	calculateBudgetProgress,
	calculateBudgetRemaining,
	calculateBudgetSpent,
	calculateBudgetUsedPercentage,
	getBudgetCycleDateRange,
	getBudgetStatus,
	getMonthDateRange,
	isDuplicateBudget,
	isTransactionInBudgetMonth,
	normalizeBudget,
	transactionMatchesBudget,
} from '../BudgetModel';
import { Budget, Transaction } from '@/types';

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
	id: 'budget-1',
	userId: 'user-1',
	categoryId: 'food',
	subCategoryId: 'takeaways',
	amount: 1500,
	period: 'monthly',
	month: '2026-05',
	startDate: '2026-05-01',
	endDate: '2026-05-31',
	lifecycleStatus: 'published',
	...overrides,
});

const makeTransaction = (
	overrides: Partial<Transaction> = {}
): Transaction => ({
	id: 'transaction-1',
	userId: 'user-1',
	accountId: 'account-1',
	title: 'Dinner',
	amount: 250,
	type: 'expense',
	category: 'food',
	subcategory: 'takeaways',
	date: new Date('2026-05-10T12:00:00Z'),
	...overrides,
});

describe('BudgetModel', () => {
	it('normalizes legacy monthly budgets and preserves draft state', () => {
		expect(
			normalizeBudget({
				id: 'budget-1',
				userId: 'user-1',
				category: 'food',
				amount: 1500,
				period: 'monthly',
				month: '2026-05',
				status: 'draft',
			})
		).toEqual(
			expect.objectContaining({
				categoryId: 'food',
				subCategoryId: undefined,
				startDate: '2026-05-01',
				endDate: '2026-05-31',
				lifecycleStatus: 'draft',
			})
		);
	});

	it('builds correct month date ranges', () => {
		expect(getMonthDateRange('2024-02')).toEqual({
			startDate: '2024-02-01',
			endDate: '2024-02-29',
		});
	});

	it('resolves a recurring monthly renewal cycle', () => {
		expect(
			getBudgetCycleDateRange(25, new Date('2026-06-13T12:00:00'))
		).toEqual({
			startDate: '2026-05-25',
			endDate: '2026-06-25',
		});
		expect(
			getBudgetCycleDateRange(25, new Date('2026-06-25T12:00:00'))
		).toEqual({
			startDate: '2026-06-25',
			endDate: '2026-07-25',
		});
	});

	it.each([
		['2026-05-18T12:00:00', '2026-04-26', '2026-05-26'],
		['2026-05-26T12:00:00', '2026-05-26', '2026-06-26'],
		['2026-06-27T12:00:00', '2026-06-26', '2026-07-26'],
	] as const)(
		'resolves a day 26 cycle around %s',
		(referenceDate, startDate, endDate) => {
			expect(getBudgetCycleDateRange(26, new Date(referenceDate))).toEqual({
				startDate,
				endDate,
			});
		}
	);

	it('includes the cycle start and excludes the renewal boundary', () => {
		const budget = makeBudget({
			period: 'custom',
			month: undefined,
			cycleDay: 25,
			startDate: '2026-05-25',
			endDate: '2026-06-25',
		});
		const referenceDate = new Date('2026-06-13T12:00:00');
		expect(
			transactionMatchesBudget(
				makeTransaction({ date: new Date('2026-05-25T12:00:00') }),
				budget,
				referenceDate
			)
		).toBe(true);
		expect(
			transactionMatchesBudget(
				makeTransaction({ date: new Date('2026-06-24T12:00:00') }),
				budget,
				referenceDate
			)
		).toBe(true);
		expect(
			transactionMatchesBudget(
				makeTransaction({ date: new Date('2026-06-25T12:00:00') }),
				budget,
				referenceDate
			)
		).toBe(false);
	});

	it.each([
		[28, '2026-02-28', '2026-03-28'],
		[29, '2026-02-28', '2026-03-29'],
		[30, '2026-02-28', '2026-03-30'],
		[31, '2026-02-28', '2026-03-31'],
	] as const)(
		'clamps renewal day %s to the end of a short month',
		(cycleDay, startDate, endDate) => {
			expect(
				getBudgetCycleDateRange(cycleDay, new Date('2026-02-28T12:00:00'))
			).toEqual({ startDate, endDate });
		}
	);

	it('handles a recurring cycle across December and January', () => {
		expect(
			getBudgetCycleDateRange(26, new Date('2026-01-02T12:00:00'))
		).toEqual({
			startDate: '2025-12-26',
			endDate: '2026-01-26',
		});
	});

	it('normalizes legacy cycle fields into the canonical renewal day', () => {
		expect(
			normalizeBudget({
				id: 'legacy-cycle',
				userId: 'user-1',
				categoryId: 'food',
				amount: 1000,
				period: 'custom',
				startDay: 25,
				endDay: 24,
				startDate: '2026-05-25',
				endDate: '2026-06-24',
			})
		).toEqual(
			expect.objectContaining({
				cycleDay: 25,
				startDay: 25,
				endDay: 24,
			})
		);
	});

	it('filters transactions by YYYY-MM using transaction date', () => {
		expect(isTransactionInBudgetMonth(makeTransaction(), '2026-05')).toBe(true);
		expect(isTransactionInBudgetMonth(makeTransaction(), '2026-06')).toBe(false);
	});

	it('matches category budgets without requiring a sub-category', () => {
		const categoryBudget = makeBudget({ subCategoryId: undefined });
		expect(transactionMatchesBudget(makeTransaction(), categoryBudget)).toBe(true);
		expect(
			transactionMatchesBudget(
				makeTransaction({ subcategory: 'groceries' }),
				categoryBudget
			)
		).toBe(true);
	});

	it('narrows matching when a sub-category is selected', () => {
		const budget = makeBudget({ accountId: 'account-1' });
		expect(transactionMatchesBudget(makeTransaction(), budget)).toBe(true);
		expect(
			transactionMatchesBudget(
				makeTransaction({ subcategory: 'groceries' }),
				budget
			)
		).toBe(false);
		expect(
			transactionMatchesBudget(
				makeTransaction({ accountId: 'account-2' }),
				budget
			)
		).toBe(false);
	});

	it('matches custom date ranges and filters outside transactions', () => {
		const budget = makeBudget({
			period: 'custom',
			month: undefined,
			startDate: '2026-05-10',
			endDate: '2026-05-20',
		});
		expect(transactionMatchesBudget(makeTransaction(), budget)).toBe(true);
		expect(
			transactionMatchesBudget(
				makeTransaction({ date: new Date('2026-05-21T12:00:00Z') }),
				budget
			)
		).toBe(false);
	});

	it('calculates spent, remaining, and percentage without capping overspend', () => {
		const budget = makeBudget({ amount: 400 });
		const transactions = [
			makeTransaction({ amount: 250 }),
			makeTransaction({ id: 'transaction-2', amount: 200 }),
		];
		expect(calculateBudgetSpent(transactions, budget)).toBe(450);
		expect(calculateBudgetRemaining(400, 450)).toBe(-50);
		expect(calculateBudgetUsedPercentage(400, 450)).toBe(112.5);
	});

	it('calculates progress only from transactions inside the active cycle', () => {
		const budget = makeBudget({
			amount: 1000,
			period: 'custom',
			month: undefined,
			cycleDay: 26,
			startDate: '2026-04-26',
			endDate: '2026-05-26',
		});
		const transactions = [
			makeTransaction({
				id: 'previous-cycle',
				amount: 100,
				date: new Date('2026-05-25T12:00:00'),
			}),
			makeTransaction({
				id: 'cycle-start',
				amount: 200,
				date: new Date('2026-05-26T12:00:00'),
			}),
			makeTransaction({
				id: 'inside-cycle',
				amount: 300,
				date: new Date('2026-06-10T12:00:00'),
			}),
			makeTransaction({
				id: 'renewal-boundary',
				amount: 400,
				date: new Date('2026-06-26T12:00:00'),
			}),
		];

		const progress = calculateBudgetProgress(
			budget,
			transactions,
			new Date('2026-06-13T12:00:00')
		);

		expect(progress.spent).toBe(500);
		expect(progress.remaining).toBe(500);
		expect(progress.usedPercentage).toBe(50);
	});

	it.each([
		[1000, 749, 'safe'],
		[1000, 750, 'warning'],
		[1000, 999, 'warning'],
		[1000, 1000, 'over'],
	] as const)(
		'returns the expected status for %s budget and %s spent',
		(amount, spent, expected) => {
			expect(getBudgetStatus(amount, spent)).toBe(expected);
		}
	);

	it('detects duplicates by optional sub-category and exact date range', () => {
		const budgets = [makeBudget({ subCategoryId: undefined })];
		expect(
			isDuplicateBudget(budgets, makeBudget({ subCategoryId: undefined }))
		).toBe(true);
		expect(
			isDuplicateBudget(
				budgets,
				makeBudget({ subCategoryId: undefined, startDate: '2026-06-01' })
			)
		).toBe(false);
	});

	it('detects recurring cycle duplicates across different calendar months', () => {
		const budgets = [
			makeBudget({
				period: 'custom',
				month: undefined,
				cycleDay: 25,
				startDate: '2026-05-25',
				endDate: '2026-06-25',
			}),
		];
		expect(
			isDuplicateBudget(
				budgets,
				makeBudget({
					period: 'custom',
					month: undefined,
					cycleDay: 25,
					startDate: '2026-06-25',
					endDate: '2026-07-25',
				})
			)
		).toBe(true);
	});

	it('finds custom budgets that overlap the selected month', () => {
		const budget = makeBudget({
			period: 'custom',
			month: undefined,
			startDate: '2026-05-20',
			endDate: '2026-06-10',
		});
		expect(budgetOverlapsMonth(budget, '2026-05')).toBe(true);
		expect(budgetOverlapsMonth(budget, '2026-06')).toBe(true);
		expect(budgetOverlapsMonth(budget, '2026-07')).toBe(false);
	});

	it('repeats a monthly budget into the next month as a draft', () => {
		expect(buildRepeatedBudget(makeBudget())).toEqual(
			expect.objectContaining({
				month: '2026-06',
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				lifecycleStatus: 'draft',
			})
		);
	});
});
