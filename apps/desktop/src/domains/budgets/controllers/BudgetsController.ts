import { useBudgets, type BudgetFormData } from '@/domains/budgets/hooks/useBudgets';
import { Budget, BudgetProgress, Transaction } from '@/types';
import { calculateBudgetProgress } from '@/domains/budgets/models/BudgetModel';
import { UpdateBudgetInput } from '@/domains/budgets/services/budgetService';

export interface BudgetsControllerReturn {
	budgets: Budget[];
	loading: boolean;
	addBudget: (budget: BudgetFormData) => Promise<void>;
	updateBudget: (id: string, updates: UpdateBudgetInput) => Promise<void>;
	deleteBudget: (id: string) => Promise<void>;
	publishBudget: (id: string) => Promise<void>;
	repeatBudget: (id: string) => Promise<void>;
	reorderBudgets: (orderedBudgetIds: string[]) => Promise<void>;
	getBudgetProgress: (
		budgetId: string,
		transactions: Transaction[]
	) => BudgetProgress | null;
	getAllBudgetProgress: (transactions: Transaction[]) => BudgetProgress[];
}

export const useBudgetsController = (): BudgetsControllerReturn => {
	const data = useBudgets();
	return {
		...data,
		getBudgetProgress: (budgetId, transactions) => {
			const budget = data.budgets.find((item) => item.id === budgetId);
			return budget ? calculateBudgetProgress(budget, transactions) : null;
		},
		getAllBudgetProgress: (transactions) =>
			data.budgets.map((budget) => calculateBudgetProgress(budget, transactions)),
	};
};
