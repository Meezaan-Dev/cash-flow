import {
	calculatePaymentPlanProgress,
	calculatePlannedExpenseTotal,
	getRemainingPlannedExpenses,
	normalizePaymentPlan,
	normalizePlannedExpense,
	type PaymentPlan,
	type PlannedExpense,
} from '../PlanningModel';
import type { Transaction } from '../../types';

const makePlannedExpense = (
	overrides: Partial<PlannedExpense> = {}
): PlannedExpense => ({
	id: 'plan-1',
	userId: 'user-1',
	title: 'Shoes',
	amount: 800,
	targetMonth: '2026-09',
	category: 'clothes',
	status: 'planned',
	...overrides,
});

const makePaymentPlan = (overrides: Partial<PaymentPlan> = {}): PaymentPlan => ({
	id: 'payment-plan-1',
	userId: 'user-1',
	itemName: 'Laptop',
	originalTotal: 12000,
	basePaidAmount: 3000,
	expectedPaymentAmount: 1500,
	status: 'active',
	linkedTransactionIds: ['tx-1', 'tx-2'],
	...overrides,
});

describe('PlanningModel', () => {
	it('normalizes planned expense fallbacks and valid optional fields', () => {
		const expense = normalizePlannedExpense({
			id: 'planned-1',
			userId: 'user-1',
			title: 'Car service',
			amount: 1500,
			targetMonth: '2026-09',
			expectedDate: new Date('2026-09-12T12:00:00'),
			category: 'transport',
			status: 'wishlist',
			priority: 'high',
		});

		expect(expense).toMatchObject({
			id: 'planned-1',
			title: 'Car service',
			amount: 1500,
			targetMonth: '2026-09',
			category: 'transport',
			status: 'wishlist',
			priority: 'high',
		});
		expect(expense.expectedDate).toEqual(new Date('2026-09-12T12:00:00'));
	});

	it('only includes planned expenses for the selected month in projection totals', () => {
		const expenses = [
			makePlannedExpense({ id: 'current', amount: 800 }),
			makePlannedExpense({ id: 'wishlist', amount: 1200, status: 'wishlist' }),
			makePlannedExpense({ id: 'cancelled', amount: 600, status: 'cancelled' }),
			makePlannedExpense({ id: 'purchased', amount: 500, status: 'purchased' }),
			makePlannedExpense({ id: 'future', amount: 1000, targetMonth: '2026-10' }),
		];

		expect(getRemainingPlannedExpenses(expenses, '2026-09').map((item) => item.id)).toEqual([
			'current',
		]);
		expect(calculatePlannedExpenseTotal(expenses, '2026-09')).toBe(800);
	});

	it('calculates payment plan progress from base paid amount plus linked expense transactions', () => {
		const transactions: Transaction[] = [
			{
				id: 'tx-1',
				accountId: 'acc-1',
				title: 'Laptop payment',
				amount: 1500,
				type: 'expense',
				category: 'tech',
			},
			{
				id: 'tx-2',
				accountId: 'acc-1',
				title: 'Ignored income',
				amount: 1000,
				type: 'income',
				category: 'salary',
			},
			{
				id: 'tx-3',
				accountId: 'acc-1',
				title: 'Unlinked payment',
				amount: 500,
				type: 'expense',
				category: 'tech',
			},
		];

		const progress = calculatePaymentPlanProgress(makePaymentPlan(), transactions);

		expect(progress.paid).toBe(4500);
		expect(progress.remaining).toBe(7500);
		expect(progress.percentComplete).toBe(37.5);
		expect(progress.paymentsRemaining).toBe(5);
	});

	it('normalizes payment plans with linked transaction id arrays', () => {
		const plan = normalizePaymentPlan({
			id: 'plan-1',
			userId: 'user-1',
			itemName: 'Course',
			originalTotal: 6000,
			basePaidAmount: 1000,
			status: 'completed',
			linkedTransactionIds: ['tx-1', 2, 'tx-2'],
		});

		expect(plan.linkedTransactionIds).toEqual(['tx-1', 'tx-2']);
		expect(plan.status).toBe('completed');
	});
});
