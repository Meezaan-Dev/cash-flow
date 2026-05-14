import { DateRange, Transaction } from '@/types';
import { parseDbDateOrNull } from '@/utils/date';

export const filterTransactionsByDateRange = (
	transactions: Transaction[],
	startDate?: string,
	endDate?: string
): Transaction[] => {
	// If no date range is provided, return all transactions
	if (!startDate && !endDate) {
		return transactions;
	}

	let start: Date | null = null;
	let end: Date | null = null;

	if (startDate) {
		start = new Date(startDate);
		start.setHours(0, 0, 0, 0);
	}

	if (endDate) {
		end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
	}

	return transactions.filter((transaction) => {
		const transactionDate =
			parseDbDateOrNull(transaction.date) ??
			parseDbDateOrNull(transaction.createdAt);

		// Skip transactions without a valid date
		if (!transactionDate || isNaN(transactionDate.getTime())) {
			return false;
		}

		// Apply date range filters
		if (start && transactionDate < start) {
			return false;
		}
		if (end && transactionDate > end) {
			return false;
		}

		return true;
	});
};

export const filterTransactionsByDateRangeObject = (
	transactions: Transaction[],
	dateRange: DateRange
): Transaction[] => {
	return filterTransactionsByDateRange(transactions, dateRange.startDate, dateRange.endDate);
};

export const formatDateRange = (dateRange: DateRange): string => {
	if (!dateRange.startDate || !dateRange.endDate) {
		return 'All time';
	}

	const start = new Date(dateRange.startDate).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	});
	const end = new Date(dateRange.endDate).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});

	return `${start} - ${end}`;
};
