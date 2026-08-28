import {
	getDueRecurringDrafts,
	getRecurringOccurrenceDateKey,
	getUpcomingRecurringDrafts,
} from '../dueRecurringDrafts';

const today = new Date(2026, 4, 22);

describe('getDueRecurringDrafts', () => {
	it('matches scheduled templates on the current day of month', () => {
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
				{
					id: 'salary',
					title: 'Salary',
					amount: 10000,
					type: 'income',
					category: 'income',
					expectedDate: 22,
				},
			],
			[],
			today
		);

		expect(drafts.map((draft) => draft.recurringTransaction.id)).toEqual(['rent', 'salary']);
		expect(drafts.map((draft) => draft.occurrenceDateKey)).toEqual([
			'2026-05-22',
			'2026-05-22',
		]);
	});

	it('ignores templates without an expected date', () => {
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

		expect(drafts.map((draft) => draft.recurringTransaction.id)).toEqual(['salary']);
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

describe('getUpcomingRecurringDrafts', () => {
	it('returns unconfirmed templates from today through the next 7 days', () => {
		const drafts = getUpcomingRecurringDrafts(
			[
				{
					id: 'rent',
					title: 'Rent',
					amount: 9000,
					type: 'expense',
					category: 'home',
					expectedDate: 22,
				},
				{
					id: 'insurance',
					title: 'Insurance',
					amount: 1200,
					type: 'expense',
					category: 'transport',
					expectedDate: 25,
				},
				{
					id: 'outside-window',
					title: 'Outside window',
					amount: 300,
					type: 'expense',
					category: 'misc',
					expectedDate: 30,
				},
				{
					id: 'salary',
					title: 'Salary',
					amount: 10000,
					type: 'income',
					category: 'income',
					expectedDate: 24,
				},
			],
			[],
			today
		);

		expect(drafts.map((draft) => draft.recurringTransaction.id)).toEqual([
			'rent',
			'salary',
			'insurance',
		]);
		expect(drafts.map((draft) => draft.occurrenceDateKey)).toEqual([
			'2026-05-22',
			'2026-05-24',
			'2026-05-25',
		]);
	});

	it('excludes occurrences already confirmed within the preview window', () => {
		const drafts = getUpcomingRecurringDrafts(
			[
				{
					id: 'insurance',
					title: 'Insurance',
					amount: 1200,
					type: 'expense',
					category: 'transport',
					expectedDate: 25,
				},
			],
			[
				{
					id: 'tx-1',
					accountId: 'acc-1',
					title: 'Insurance',
					amount: 1200,
					type: 'expense',
					category: 'transport',
					recurringTransactionId: 'insurance',
					recurringOccurrenceDate: '2026-05-25',
				},
			],
			today
		);

		expect(drafts).toHaveLength(0);
	});

	it('uses the last day of shorter months for overflow expected dates', () => {
		const drafts = getUpcomingRecurringDrafts(
			[
				{
					id: 'month-end',
					title: 'Month end',
					amount: 500,
					type: 'expense',
					category: 'fees',
					expectedDate: 31,
				},
			],
			[],
			new Date(2026, 1, 24)
		);

		expect(drafts).toHaveLength(1);
		expect(drafts[0].occurrenceDateKey).toBe('2026-02-28');
	});
});
