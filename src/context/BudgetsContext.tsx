import React, { createContext, useContext, ReactNode } from 'react';
import { useBudgetsController } from '../controllers/BudgetsController';
import { Budget, BudgetProgress, DateRange, Transaction } from '../types';

type BudgetFormData = Omit<
	Budget,
	'id' | 'createdAt' | 'userId' | 'status' | 'actualStartDate' | 'actualEndDate'
>;

interface BudgetsContextValue {
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

const BudgetsContext = createContext<BudgetsContextValue | undefined>(undefined);

export const BudgetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const controller = useBudgetsController();

	return (
		<BudgetsContext.Provider value={controller}>
			{children}
		</BudgetsContext.Provider>
	);
};

export const useBudgetsContext = (): BudgetsContextValue => {
	const context = useContext(BudgetsContext);
	if (!context) {
		throw new Error('useBudgetsContext must be used within a BudgetsProvider');
	}
	return context;
};
