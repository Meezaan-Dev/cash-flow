import { mergeFilterPreferences } from '@/features/filters/utils/filterPreferences';

describe('FilterPreferencesContext', () => {
	it('merges report defaults into older stored preferences', () => {
		expect(
			mergeFilterPreferences({
				transactionsTable: {
					search: false,
					type: true,
					category: true,
					month: true,
					dateRange: true,
				},
			}).reports
		).toEqual({
			dateRange: true,
			summaryCards: true,
			incomeExpenseTrend: true,
			categoryBreakdown: true,
			subcategoryBreakdown: true,
			accountActivity: true,
			netWorth: true,
		});
	});

	it('preserves stored report preferences while filling missing keys', () => {
		expect(
			mergeFilterPreferences({
				reports: {
					dateRange: false,
					summaryCards: false,
				},
			}).reports
		).toEqual({
			dateRange: false,
			summaryCards: false,
			incomeExpenseTrend: true,
			categoryBreakdown: true,
			subcategoryBreakdown: true,
			accountActivity: true,
			netWorth: true,
		});
	});
});
