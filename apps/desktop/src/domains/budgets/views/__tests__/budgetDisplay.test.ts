import {
	getBudgetPeriodLabel,
	getBudgetScopeHelp,
	getBudgetTitle,
} from '../budgetDisplay';

const getCategoryLabel = (value: string) =>
	value === 'food' ? 'Food' : 'Petrol';
const getSubcategoryLabel = () => 'Takeaways';

describe('budgetDisplay', () => {
	it('uses only the category for category-wide budgets', () => {
		const budget = { categoryId: 'petrol' };
		expect(
			getBudgetTitle(budget, getCategoryLabel, getSubcategoryLabel)
		).toBe('Petrol');
		expect(getBudgetScopeHelp(budget, getCategoryLabel)).toBe(
			'Tracks all Petrol expenses'
		);
	});

	it('uses the explicit category and sub-category path', () => {
		const budget = { categoryId: 'food', subCategoryId: 'takeaways' };
		expect(
			getBudgetTitle(budget, getCategoryLabel, getSubcategoryLabel)
		).toBe('Food · Takeaways');
		expect(getBudgetScopeHelp(budget, getCategoryLabel)).toBeNull();
	});

	it('formats monthly and custom periods concisely', () => {
		expect(
			getBudgetPeriodLabel({
				period: 'monthly',
				month: '2026-06',
				startDate: '2026-06-01',
				endDate: '2026-06-30',
			})
		).toBe('June 2026');
		expect(
			getBudgetPeriodLabel({
				period: 'custom',
				startDate: '2026-06-01',
				endDate: '2026-07-18',
			})
		).toBe('1 Jun – 18 Jul 2026');
		expect(
			getBudgetPeriodLabel({
				period: 'custom',
				cycleDay: 25,
				startDate: '2026-05-25',
				endDate: '2026-06-25',
			}, new Date('2026-06-13T12:00:00'))
		).toBe('25 May – 25 Jun 2026');
	});
});
