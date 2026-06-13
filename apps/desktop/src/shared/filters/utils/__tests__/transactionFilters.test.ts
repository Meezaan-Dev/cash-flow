import {
	getBudgetTransactionFilters,
	transactionFiltersFromSearch,
	transactionFiltersToSearch,
	transactionMatchesFilters,
} from '@/shared/filters/utils/transactionFilters';
import { Budget, Transaction } from '@/types';

const transaction: Transaction = {
	id: 'tx-1',
	accountId: 'account-1',
	title: 'Groceries',
	amount: 400,
	type: 'expense',
	category: 'food',
	subcategory: 'groceries',
	date: new Date('2026-06-24T12:00:00'),
};

describe('transactionFilters', () => {
	it('round trips supported filters through the route query', () => {
		const search = transactionFiltersToSearch({
			accountId: 'account-1',
			category: 'food',
			subcategory: 'groceries',
			type: 'expense',
			startDate: '2026-05-25',
			endDate: '2026-06-25',
			endExclusive: true,
		});

		expect(transactionFiltersFromSearch(search)).toEqual({
			accountId: 'account-1',
			category: 'food',
			subcategory: 'groceries',
			type: 'expense',
			startDate: '2026-05-25',
			endDate: '2026-06-25',
			endExclusive: true,
		});
	});

	it('applies an exclusive budget renewal boundary', () => {
		const filters = {
			startDate: '2026-05-25',
			endDate: '2026-06-25',
			endExclusive: true,
		};
		expect(transactionMatchesFilters(transaction, filters)).toBe(true);
		expect(
			transactionMatchesFilters(
				{ ...transaction, date: new Date('2026-06-25T12:00:00') },
				filters
			)
		).toBe(false);
	});

	it('builds scoped filters from a recurring budget', () => {
		const budget: Budget = {
			id: 'budget-1',
			userId: 'user-1',
			accountId: 'account-1',
			categoryId: 'food',
			subCategoryId: 'groceries',
			amount: 1000,
			period: 'custom',
			cycleDay: 25,
			startDate: '2026-05-25',
			endDate: '2026-06-25',
			lifecycleStatus: 'published',
		};

		expect(
			getBudgetTransactionFilters(
				budget,
				new Date('2026-06-13T12:00:00')
			)
		).toEqual({
			accountId: 'account-1',
			category: 'food',
			subcategory: 'groceries',
			type: 'expense',
			startDate: '2026-05-25',
			endDate: '2026-06-25',
			endExclusive: true,
		});
	});
});
