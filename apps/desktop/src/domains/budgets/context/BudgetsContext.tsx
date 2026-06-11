import React, { createContext, useContext, type ReactNode } from 'react';
import {
	useBudgetsController,
	type BudgetsControllerReturn,
} from '@/domains/budgets/controllers/BudgetsController';

const BudgetsContext = createContext<BudgetsControllerReturn | undefined>(undefined);

export const BudgetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
	<BudgetsContext.Provider value={useBudgetsController()}>
		{children}
	</BudgetsContext.Provider>
);

export const useBudgetsContext = (): BudgetsControllerReturn => {
	const context = useContext(BudgetsContext);
	if (!context) throw new Error('useBudgetsContext must be used within a BudgetsProvider');
	return context;
};
