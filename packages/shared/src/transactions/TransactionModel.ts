import { Transaction, TransactionType } from '../types';
import { parseDbDateOrNull } from '../utils/date';

export type { Transaction };

type TransactionDoc = {
	id: string;
	userId?: string;
	accountId?: string;
	title?: string;
	amount?: number;
	type?: string;
	category?: string;
	subcategory?: string;
	description?: string;
	transferAccountId?: string;
	transferId?: string;
	transferDirection?: string;
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
	date?: unknown;
	createdAt?: unknown;
	updatedAt?: unknown;
};

export const normalizeTransaction = (doc: TransactionDoc): Transaction => {
	const transaction: Transaction = {
		id: doc.id,
		userId: doc.userId,
		accountId: doc.accountId ?? '',
		title: doc.title ?? '',
		amount: doc.amount ?? 0,
		type: (doc.type as TransactionType) ?? 'expense',
		category: doc.category ?? '',
		subcategory: doc.subcategory || undefined,
		description: doc.description,
		transferAccountId: doc.transferAccountId,
		transferId: doc.transferId,
		transferDirection:
			doc.transferDirection === 'out' || doc.transferDirection === 'in'
				? doc.transferDirection
				: undefined,
		recurringTransactionId: doc.recurringTransactionId,
		recurringOccurrenceDate: doc.recurringOccurrenceDate,
	};

	const dateParsed = doc.date != null ? parseDbDateOrNull(doc.date) : null;
	if (dateParsed) {
		transaction.date = dateParsed;
	}

	const createdParsed = doc.createdAt != null ? parseDbDateOrNull(doc.createdAt) : null;
	if (createdParsed) {
		transaction.createdAt = createdParsed;
	}

	return transaction;
};

export const normalizeTransactions = (docs: TransactionDoc[]): Transaction[] =>
	docs.map(normalizeTransaction);

export const filterExpenses = (transactions: Transaction[]): Transaction[] =>
	transactions.filter((t) => t.type === 'expense');

export const filterIncome = (transactions: Transaction[]): Transaction[] =>
	transactions.filter((t) => t.type === 'income');

export const filterTransfers = (transactions: Transaction[]): Transaction[] =>
	transactions.filter((t) => t.type === 'transfer');

export const filterByCategory = (transactions: Transaction[], category: string): Transaction[] =>
	transactions.filter((t) => t.category === category);

export const filterByType = (
	transactions: Transaction[],
	type: TransactionType
): Transaction[] => transactions.filter((t) => t.type === type);

export const filterByAccount = (transactions: Transaction[], accountId: string): Transaction[] =>
	transactions.filter((t) => t.accountId === accountId);

export const getUniqueCategories = (transactions: Transaction[]): string[] =>
	Array.from(new Set(transactions.map((t) => t.category))).sort();

export const calculateTotals = (transactions: Transaction[]) => {
	const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
	const totalIncome = filterIncome(transactions).reduce((sum, tx) => sum + tx.amount, 0);
	const totalExpense = filterExpenses(transactions).reduce((sum, tx) => sum + tx.amount, 0);

	return {
		totalAmount,
		totalIncome,
		totalExpense,
	};
};

export const groupByCategory = (transactions: Transaction[]): Record<string, Transaction[]> => {
	return transactions.reduce(
		(acc, tx) => {
			if (!acc[tx.category]) {
				acc[tx.category] = [];
			}
			acc[tx.category].push(tx);
			return acc;
		},
		{} as Record<string, Transaction[]>
	);
};

export const sortByDateDesc = (transactions: Transaction[]): Transaction[] => {
	return [...transactions].sort((a, b) => {
		const dateA =
			parseDbDateOrNull(a.date) ?? parseDbDateOrNull(a.createdAt) ?? new Date(0);
		const dateB =
			parseDbDateOrNull(b.date) ?? parseDbDateOrNull(b.createdAt) ?? new Date(0);
		const diff = dateB.getTime() - dateA.getTime();
		if (diff !== 0) return diff;

		const createdA = parseDbDateOrNull(a.createdAt)?.getTime() ?? 0;
		const createdB = parseDbDateOrNull(b.createdAt)?.getTime() ?? 0;
		return createdB - createdA;
	});
};
