import { useBudgets } from '../hooks/useBudgets';
import { Budget, BudgetProgress, DateRange, Transaction } from '../types';
import { calculateBudgetUsage } from '../models/BudgetModel';

type BudgetFormData = Omit<
	Budget,
	'id' | 'createdAt' | 'userId' | 'status' | 'actualStartDate' | 'actualEndDate'
>;

interface BudgetsControllerReturn {
	budgets: Budget[];
	loading: boolean;
	addBudget: (budget: BudgetFormData) => Promise<void>;
	addDraftBudget: (budget: BudgetFormData) => Promise<void>;
	updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
	startBudget: (id: string, actualRange: DateRange) => Promise<void>;
	publishBudget: (id: string) => Promise<void>;
	deleteBudget: (id: string) => Promise<void>;
	getBudgetProgress: (budgetId: string, transactions: Transaction[]) => BudgetProgress | null;
	getAllBudgetProgress: (transactions: Transaction[]) => BudgetProgress[];
}

export const useBudgetsController = (): BudgetsControllerReturn => {
	const {
		budgets,
		addBudget,
		addDraftBudget,
		updateBudget,
		startBudget,
		publishBudget,
		deleteBudget,
		loading,
	} = useBudgets();

	return {
		budgets,
		loading,
		addBudget,
		addDraftBudget,
		updateBudget,
		startBudget,
		publishBudget,
		deleteBudget,
		getBudgetProgress: (budgetId, transactions) => {
			const budget = budgets.find((b) => b.id === budgetId);
			if (!budget) return null;
			return calculateBudgetUsage(budget, transactions);
		},
		getAllBudgetProgress: (transactions) =>
			budgets.map((b) => calculateBudgetUsage(b, transactions)),
	};
};
