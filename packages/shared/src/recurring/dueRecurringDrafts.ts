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

export const getDueRecurringDrafts = (
	recurringTransactions: RecurringTransaction[],
	transactions: Transaction[],
	today: Date
): DueRecurringDraft[] => {
	const occurrenceDateKey = getRecurringOccurrenceDateKey(today);
	const confirmedKeys = new Set(
		transactions
			.filter((transaction) => transaction.recurringTransactionId)
			.map(
				(transaction) =>
					`${transaction.recurringTransactionId}:${transaction.recurringOccurrenceDate}`
			)
	);

	return recurringTransactions
		.filter(
			(transaction) =>
				transaction.type === 'expense' &&
				transaction.expectedDate === today.getDate() &&
				transaction.id &&
				!confirmedKeys.has(`${transaction.id}:${occurrenceDateKey}`)
		)
		.map((recurringTransaction) => ({
			recurringTransaction,
			occurrenceDate: today,
			occurrenceDateKey,
		}));
};
