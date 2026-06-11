import {
	budgetOverlapsMonth,
	buildRepeatedBudget,
	calculateBudgetRemaining,
	calculateBudgetSpent,
	calculateBudgetUsedPercentage,
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
