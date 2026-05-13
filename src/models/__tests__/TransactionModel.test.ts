import {
	calculateTotals,
	filterByCategory,
	getUniqueCategories,
	groupByCategory,
	normalizeTransaction,
	sortByDateDesc,
} from '../TransactionModel';
import { Transaction } from '../../types';

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
	id: 'transaction-1',
	accountId: 'account-1',
	title: 'Groceries',
	amount: 250,
	type: 'expense',
	category: 'food',
	subcategory: 'groceries',
	date: new Date('2026-05-13T12:00:00Z'),
	...overrides,
});

describe('TransactionModel', () => {
	describe('normalizeTransaction', () => {
		it('preserves category and optional subcategory values', () => {
			const transaction = normalizeTransaction({
				id: 'transaction-1',
				accountId: 'account-1',
				title: 'Lunch',
				amount: 150,
				type: 'expense',
				category: 'food',
				subcategory: 'takeaways_eating_out',
			});

			expect(transaction).toEqual(
				expect.objectContaining({
					id: 'transaction-1',
					category: 'food',
					subcategory: 'takeaways_eating_out',
				})
			);
		});

		it('keeps legacy transactions valid when subcategory is missing', () => {
			const transaction = normalizeTransaction({
				id: 'legacy-transaction',
				category: 'food',
			});

			expect(transaction.category).toBe('food');
			expect(transaction.subcategory).toBeUndefined();
		});

		it('normalizes missing category to an empty string for backward compatibility', () => {
			const transaction = normalizeTransaction({ id: 'uncategorized-legacy' });

			expect(transaction.category).toBe('');
		});
	});

	describe('category helpers', () => {
		it('filters and groups by main category only', () => {
			const transactions = [
				makeTransaction({ id: 'groceries', subcategory: 'groceries' }),
				makeTransaction({
					id: 'takeaways',
					amount: 125,
					subcategory: 'takeaways_eating_out',
				}),
				makeTransaction({
					id: 'travel',
					amount: 500,
					category: 'travel',
					subcategory: undefined,
				}),
			];

			expect(filterByCategory(transactions, 'food')).toHaveLength(2);
			expect(groupByCategory(transactions).food.map((tx) => tx.id)).toEqual([
				'groceries',
				'takeaways',
			]);
		});

		it('returns unique main categories without splitting by subcategory', () => {
			const categories = getUniqueCategories([
				makeTransaction({ id: 'groceries', subcategory: 'groceries' }),
				makeTransaction({
					id: 'takeaways',
					subcategory: 'takeaways_eating_out',
				}),
			]);

			expect(categories).toEqual(['food']);
		});
	});

	describe('totals and sorting', () => {
		it('calculates totals across income and expense transactions', () => {
			const totals = calculateTotals([
				makeTransaction({ amount: 300, type: 'expense' }),
				makeTransaction({ id: 'salary', amount: 1000, type: 'income' }),
			]);

			expect(totals).toEqual({
				totalAmount: 1300,
				totalIncome: 1000,
				totalExpense: 300,
			});
		});

		it('sorts transactions by transaction date before created date', () => {
			const sorted = sortByDateDesc([
				makeTransaction({
					id: 'older-created',
					date: undefined,
					createdAt: new Date('2026-05-10T12:00:00Z'),
				}),
				makeTransaction({
					id: 'newer-date',
					date: new Date('2026-05-13T12:00:00Z'),
					createdAt: new Date('2026-05-01T12:00:00Z'),
				}),
			]);

			expect(sorted.map((transaction) => transaction.id)).toEqual([
				'newer-date',
				'older-created',
			]);
		});
	});
});
