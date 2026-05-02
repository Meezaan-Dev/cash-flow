import { calculateBudgetUsage, normalizeBudget } from '../BudgetModel';
import { Budget, Transaction } from '../../types';

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
	id: 'budget-1',
	category: 'groceries',
	amount: 1000,
	period: 'monthly',
	status: 'published',
	plannedStartDate: '2026-05-01',
	plannedEndDate: '2026-05-31',
	...overrides,
});

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
	id: 'transaction-1',
	accountId: 'account-1',
	title: 'Groceries',
	amount: 250,
	type: 'expense',
	category: 'groceries',
	date: new Date('2026-05-10T12:00:00Z'),
	...overrides,
});

describe('BudgetModel', () => {
	describe('normalizeBudget', () => {
		it('defaults legacy budgets to published status', () => {
			const budget = normalizeBudget({
				id: 'legacy-budget',
				category: 'groceries',
				amount: 1000,
				plannedStartDate: '2026-05-01',
				plannedEndDate: '2026-05-31',
			});

			expect(budget.status).toBe('published');
		});

		it('preserves draft status', () => {
			const budget = normalizeBudget({
				id: 'draft-budget',
				category: 'groceries',
				amount: 1000,
				status: 'draft',
				plannedStartDate: '2026-05-01',
				plannedEndDate: '2026-05-31',
			});

			expect(budget.status).toBe('draft');
		});
	});

	describe('calculateBudgetUsage', () => {
		it('uses the planned range for draft live calculations', () => {
			const budget = makeBudget({ status: 'draft' });
			const progress = calculateBudgetUsage(budget, [
				makeTransaction(),
				makeTransaction({
					id: 'outside-range',
					amount: 300,
					date: new Date('2026-06-01T12:00:00Z'),
				}),
			]);

			expect(progress.isDraft).toBe(true);
			expect(progress.comparisonStartDate).toBe('2026-05-01');
			expect(progress.comparisonEndDate).toBe('2026-05-31');
			expect(progress.actualSpent).toBe(250);
			expect(progress.remaining).toBe(750);
		});

		it('uses the active actual range for published calculations', () => {
			const budget = makeBudget({
				actualStartDate: '2026-06-01',
				actualEndDate: '2026-06-30',
			});
			const progress = calculateBudgetUsage(budget, [
				makeTransaction({
					id: 'planned-range-only',
					amount: 250,
					date: new Date('2026-05-10T12:00:00Z'),
				}),
				makeTransaction({
					id: 'actual-range',
					amount: 400,
					date: new Date('2026-06-10T12:00:00Z'),
				}),
			]);

			expect(progress.isDraft).toBe(false);
			expect(progress.started).toBe(true);
			expect(progress.comparisonStartDate).toBe('2026-06-01');
			expect(progress.comparisonEndDate).toBe('2026-06-30');
			expect(progress.actualSpent).toBe(400);
			expect(progress.remaining).toBe(600);
		});

		it('returns zero spend and the full remaining amount when nothing matches', () => {
			const budget = makeBudget({ status: 'draft' });
			const progress = calculateBudgetUsage(budget, [
				makeTransaction({
					category: 'transport',
					amount: 500,
				}),
			]);

			expect(progress.actualSpent).toBe(0);
			expect(progress.remaining).toBe(1000);
			expect(progress.overBudget).toBe(0);
			expect(progress.percent).toBe(0);
		});
	});
});
