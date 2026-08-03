import { Transaction } from '../types';
import { RecurringTransaction } from './RecurringTransactionModel';

export interface DueRecurringDraft {
	recurringTransaction: RecurringTransaction;
	occurrenceDate: Date;
	occurrenceDateKey: string;
}

export const getRecurringOccurrenceDateKey = (date: Date): string => {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const getConfirmedRecurringOccurrenceKeys = (transactions: Transaction[]): Set<string> =>
	new Set(
		transactions
			.filter((transaction) => transaction.recurringTransactionId)
			.map(
				(transaction) =>
					`${transaction.recurringTransactionId}:${transaction.recurringOccurrenceDate}`
			)
	);

const getDaysInMonth = (date: Date): number =>
	new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const isExpectedOnDate = (expectedDate: number | undefined, date: Date): boolean => {
	if (!expectedDate) return false;

	const daysInMonth = getDaysInMonth(date);
	const dateDay = date.getDate();

	return expectedDate === dateDay || (expectedDate > daysInMonth && dateDay === daysInMonth);
};

const addDays = (date: Date, days: number): Date =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const getDueRecurringDrafts = (
	recurringTransactions: RecurringTransaction[],
	transactions: Transaction[],
	today: Date
): DueRecurringDraft[] => {
	const occurrenceDateKey = getRecurringOccurrenceDateKey(today);
	const confirmedKeys = getConfirmedRecurringOccurrenceKeys(transactions);

	return recurringTransactions
		.filter(
			(transaction) =>
				transaction.type === 'expense' &&
				isExpectedOnDate(transaction.expectedDate, today) &&
				transaction.id &&
				!confirmedKeys.has(`${transaction.id}:${occurrenceDateKey}`)
		)
		.map((recurringTransaction) => ({
			recurringTransaction,
			occurrenceDate: today,
			occurrenceDateKey,
		}));
};

export const getUpcomingRecurringDrafts = (
	recurringTransactions: RecurringTransaction[],
	transactions: Transaction[],
	today: Date,
	daysAhead = 7
): DueRecurringDraft[] => {
	const confirmedKeys = getConfirmedRecurringOccurrenceKeys(transactions);
	const windowDates = Array.from({ length: daysAhead + 1 }, (_, index) =>
		addDays(today, index)
	);

	return windowDates
		.flatMap((occurrenceDate) => {
			const occurrenceDateKey = getRecurringOccurrenceDateKey(occurrenceDate);

			return recurringTransactions
				.filter(
					(transaction) =>
						transaction.type === 'expense' &&
						transaction.id &&
						isExpectedOnDate(transaction.expectedDate, occurrenceDate) &&
						!confirmedKeys.has(`${transaction.id}:${occurrenceDateKey}`)
				)
				.map((recurringTransaction) => ({
					recurringTransaction,
					occurrenceDate,
					occurrenceDateKey,
				}));
		})
		.sort((left, right) => {
			const dateDiff = left.occurrenceDate.getTime() - right.occurrenceDate.getTime();
			if (dateDiff !== 0) return dateDiff;
			return left.recurringTransaction.title.localeCompare(right.recurringTransaction.title);
		});
};
