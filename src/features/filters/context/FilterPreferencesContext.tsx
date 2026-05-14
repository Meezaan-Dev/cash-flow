import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
	DEFAULT_FILTER_PREFS,
	mergeFilterPreferences,
} from '@/features/filters/utils/filterPreferences';

export interface FilterPreferences {
	recurring: {
		frequency: boolean;
		category: boolean;
		type: boolean;
		date: boolean;
		sortBy: boolean;
	};
	transactionsTable: {
		search: boolean;
		type: boolean;
		category: boolean;
		month: boolean;
		dateRange: boolean;
	};
	transactionsList: {
		search: boolean;
	};
	reports: {
		dateRange: boolean;
		summaryCards: boolean;
		incomeExpenseTrend: boolean;
		categoryBreakdown: boolean;
		subcategoryBreakdown: boolean;
		accountActivity: boolean;
		netWorth: boolean;
	};
}

const STORAGE_KEY = 'cashflow_filter_prefs';

function loadPrefs(): FilterPreferences {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_FILTER_PREFS;
		const parsed = JSON.parse(raw);
		return mergeFilterPreferences(parsed);
	} catch {
		return DEFAULT_FILTER_PREFS;
	}
}

interface FilterPreferencesContextType {
	prefs: FilterPreferences;
	setFilterVisible: <
		V extends keyof FilterPreferences,
		F extends keyof FilterPreferences[V],
	>(
		view: V,
		filter: F,
		visible: boolean,
	) => void;
	resetPrefs: () => void;
}

const FilterPreferencesContext = createContext<FilterPreferencesContextType | undefined>(undefined);

export const FilterPreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [prefs, setPrefs] = useState<FilterPreferences>(loadPrefs);

	const setFilterVisible = useCallback(
		<V extends keyof FilterPreferences, F extends keyof FilterPreferences[V]>(
			view: V,
			filter: F,
			visible: boolean,
		) => {
			setPrefs((prev) => {
				const updated: FilterPreferences = {
					...prev,
					[view]: {
						...prev[view],
						[filter]: visible,
					},
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
				return updated;
			});
		},
		[],
	);

	const resetPrefs = useCallback(() => {
		localStorage.removeItem(STORAGE_KEY);
		setPrefs(DEFAULT_FILTER_PREFS);
	}, []);

	return (
		<FilterPreferencesContext.Provider value={{ prefs, setFilterVisible, resetPrefs }}>
			{children}
		</FilterPreferencesContext.Provider>
	);
};

export const useFilterPreferences = () => {
	const context = useContext(FilterPreferencesContext);
	if (!context) {
		throw new Error('useFilterPreferences must be used within a FilterPreferencesProvider');
	}
	return context;
};
