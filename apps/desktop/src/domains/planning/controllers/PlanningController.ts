import {
	calculatePaymentPlansProgress,
	calculatePlannedExpenseTotal,
	getRemainingPlannedExpenses,
	getMonthKey,
	type PaymentPlan,
	type PaymentPlanProgress,
	type PlannedExpense,
} from '@cash-flow/shared/planning/PlanningModel';
import {
	usePlanning,
	type AddPaymentPlanData,
	type AddPlannedExpenseData,
	type UpdatePaymentPlanData,
	type UpdatePlannedExpenseData,
} from '@cash-flow/shared/hooks/usePlanning';
import type { Transaction } from '@/types';

export interface PlanningControllerReturn {
	plannedExpenses: PlannedExpense[];
	paymentPlans: PaymentPlan[];
	loading: boolean;
	addPlannedExpense: (expense: AddPlannedExpenseData) => Promise<void>;
	updatePlannedExpense: (
		id: string,
		updates: UpdatePlannedExpenseData
	) => Promise<void>;
	deletePlannedExpense: (id: string) => Promise<void>;
	addPaymentPlan: (plan: AddPaymentPlanData) => Promise<void>;
	updatePaymentPlan: (id: string, updates: UpdatePaymentPlanData) => Promise<void>;
	deletePaymentPlan: (id: string) => Promise<void>;
	convertPlannedExpense: (
		expense: PlannedExpense,
		transactionId: string
	) => Promise<void>;
	linkPaymentTransaction: (
		plan: PaymentPlan,
		transactionId: string
	) => Promise<void>;
	unlinkPaymentTransaction: (
		plan: PaymentPlan,
		transactionId: string
	) => Promise<void>;
	getRemainingPlannedExpenses: (month?: string) => PlannedExpense[];
	calculatePlannedExpenseTotal: (month?: string) => number;
	calculatePaymentPlansProgress: (
		transactions: Transaction[]
	) => PaymentPlanProgress[];
	getCurrentMonthKey: () => string;
}

export const usePlanningController = (): PlanningControllerReturn => {
	const data = usePlanning();

	return {
		...data,
		convertPlannedExpense: (expense, transactionId) =>
			data.updatePlannedExpense(expense.id, {
				status: 'purchased',
				transactionId,
			}),
		linkPaymentTransaction: (plan, transactionId) =>
			data.updatePaymentPlan(plan.id, {
				linkedTransactionIds: Array.from(
					new Set([...plan.linkedTransactionIds, transactionId])
				),
			}),
		unlinkPaymentTransaction: (plan, transactionId) =>
			data.updatePaymentPlan(plan.id, {
				linkedTransactionIds: plan.linkedTransactionIds.filter(
					(id) => id !== transactionId
				),
			}),
		getRemainingPlannedExpenses: (month = getMonthKey()) =>
			getRemainingPlannedExpenses(data.plannedExpenses, month),
		calculatePlannedExpenseTotal: (month = getMonthKey()) =>
			calculatePlannedExpenseTotal(data.plannedExpenses, month),
		calculatePaymentPlansProgress: (transactions) =>
			calculatePaymentPlansProgress(data.paymentPlans, transactions),
		getCurrentMonthKey: () => getMonthKey(),
	};
};
