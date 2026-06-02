import type { FilterPreferences } from '@/shared/filters/context/FilterPreferencesContext';

export const DEFAULT_FILTER_PREFS: FilterPreferences = {
	recurring: {
		frequency: true,
		category: true,
		type: true,
		date: true,
		sortBy: true,
	},
	transactionsTable: {
		search: true,
		type: true,
		category: true,
		month: true,
		dateRange: true,
	},
	transactionsList: {
		search: true,
	},
	reports: {
		dateRange: true,
		summaryCards: true,
		incomeExpenseTrend: true,
		categoryBreakdown: true,
		subcategoryBreakdown: true,
		accountActivity: true,
		netWorth: true,
	},
};

type PartialFilterPreferences = {
	[V in keyof FilterPreferences]?: Partial<FilterPreferences[V]>;
};

export function mergeFilterPreferences(
	parsed: PartialFilterPreferences = {}
): FilterPreferences {
	return {
		recurring: { ...DEFAULT_FILTER_PREFS.recurring, ...parsed.recurring },
		transactionsTable: {
			...DEFAULT_FILTER_PREFS.transactionsTable,
			...parsed.transactionsTable,
		},
		transactionsList: {
			...DEFAULT_FILTER_PREFS.transactionsList,
			...parsed.transactionsList,
		},
		reports: { ...DEFAULT_FILTER_PREFS.reports, ...parsed.reports },
	};
}
