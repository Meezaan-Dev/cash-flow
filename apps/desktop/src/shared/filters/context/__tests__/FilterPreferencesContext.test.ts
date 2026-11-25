import { mergeFilterPreferences } from '@/shared/filters/utils/filterPreferences';

describe('FilterPreferencesContext', () => {
	it('defaults the recurring account filter to visible', () => {
		expect(mergeFilterPreferences().recurring.account).toBe(true);
	});

	it('preserves the stored recurring account filter preference', () => {
		expect(
			mergeFilterPreferences({ recurring: { account: false } }).recurring.account
		).toBe(false);
	});

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
