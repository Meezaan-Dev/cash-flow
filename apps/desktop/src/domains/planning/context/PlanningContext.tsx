import React, { createContext, useContext, type ReactNode } from 'react';
import {
	usePlanningController,
	type PlanningControllerReturn,
} from '@/domains/planning/controllers/PlanningController';

const PlanningContext = createContext<PlanningControllerReturn | undefined>(undefined);

export const PlanningProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
	<PlanningContext.Provider value={usePlanningController()}>
		{children}
	</PlanningContext.Provider>
);

export const usePlanningContext = (): PlanningControllerReturn => {
	const context = useContext(PlanningContext);
	if (!context) {
		throw new Error('usePlanningContext must be used within a PlanningProvider');
	}
	return context;
};
