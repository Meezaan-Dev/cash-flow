import { getDueRecurringDrafts, getRecurringOccurrenceDateKey } from '../dueRecurringDrafts';

const today = new Date(2026, 4, 22);

describe('getDueRecurringDrafts', () => {
	it('matches expense templates on the current day of month', () => {
		const drafts = getDueRecurringDrafts(
			[
				{
					id: 'rent',
					title: 'Rent',
					amount: 9000,
					type: 'expense',
					category: 'home',
					expectedDate: 22,
				},
			],
			[],
			today
		);

		expect(drafts).toHaveLength(1);
		expect(drafts[0].occurrenceDateKey).toBe('2026-05-22');
	});

	it('ignores income templates and templates without an expected date', () => {
		const drafts = getDueRecurringDrafts(
			[
				{
					id: 'salary',
					title: 'Salary',
					amount: 10000,
					type: 'income',
					category: 'income',
					expectedDate: 22,
				},
				{
					id: 'unscheduled',
					title: 'Unscheduled',
					amount: 100,
					type: 'expense',
					category: 'misc',
				},
			],
			[],
			today
		);

		expect(drafts).toHaveLength(0);
	});

	it('hides templates already confirmed for the occurrence date', () => {
		const occurrenceDateKey = getRecurringOccurrenceDateKey(today);
		const drafts = getDueRecurringDrafts(
			[
				{
					id: 'rent',
					title: 'Rent',
					amount: 9000,
					type: 'expense',
					category: 'home',
					expectedDate: 22,
				},
			],
			[
				{
					id: 'tx-1',
					accountId: 'acc-1',
					title: 'Rent',
					amount: 9000,
					type: 'expense',
					category: 'home',
					recurringTransactionId: 'rent',
					recurringOccurrenceDate: occurrenceDateKey,
				},
			],
			today
		);

		expect(drafts).toHaveLength(0);
	});
});
