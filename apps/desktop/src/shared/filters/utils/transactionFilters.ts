import { Budget, Transaction, TransactionType } from '@/types';
import { getBudgetCycleDateRange } from '@/domains/budgets/models/BudgetModel';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';

export interface TransactionFilterDescriptor {
	accountId?: string;
	category?: string;
	subcategory?: string;
	type?: Exclude<TransactionType, 'transfer'>;
	startDate?: string;
	endDate?: string;
	endExclusive?: boolean;
}

const PARAMS = {
	accountId: 'account',
	category: 'category',
	subcategory: 'subcategory',
	type: 'type',
	startDate: 'from',
	endDate: 'to',
	endExclusive: 'endExclusive',
} as const;

export const transactionFiltersToSearch = (
	filters: TransactionFilterDescriptor
): string => {
	const params = new URLSearchParams();
	if (filters.accountId) params.set(PARAMS.accountId, filters.accountId);
	if (filters.category) params.set(PARAMS.category, filters.category);
	if (filters.subcategory) params.set(PARAMS.subcategory, filters.subcategory);
	if (filters.type) params.set(PARAMS.type, filters.type);
	if (filters.startDate) params.set(PARAMS.startDate, filters.startDate);
	if (filters.endDate) params.set(PARAMS.endDate, filters.endDate);
	if (filters.endExclusive) params.set(PARAMS.endExclusive, '1');
	const query = params.toString();
	return query ? `?${query}` : '';
};

export const transactionFiltersFromSearch = (
	search: string
): TransactionFilterDescriptor => {
	const params = new URLSearchParams(search);
	const type = params.get(PARAMS.type);
	return {
		accountId: params.get(PARAMS.accountId) || undefined,
		category: params.get(PARAMS.category) || undefined,
		subcategory: params.get(PARAMS.subcategory) || undefined,
		type: type === 'income' || type === 'expense' ? type : undefined,
		startDate: params.get(PARAMS.startDate) || undefined,
		endDate: params.get(PARAMS.endDate) || undefined,
		endExclusive: params.get(PARAMS.endExclusive) === '1',
	};
};

export const transactionMatchesFilters = (
	transaction: Transaction,
	filters: TransactionFilterDescriptor
): boolean => {
	if (filters.accountId && transaction.accountId !== filters.accountId) return false;
	if (filters.category && transaction.category !== filters.category) return false;
	if (
		filters.subcategory &&
		(transaction.subcategory ?? '') !== filters.subcategory
	) {
		return false;
	}
	if (filters.type && transaction.type !== filters.type) return false;

	if (filters.startDate || filters.endDate) {
		const date =
			parseDbDateOrNull(transaction.date) ??
			parseDbDateOrNull(transaction.createdAt);
		if (!date) return false;
		const dateKey = [
			date.getFullYear(),
			String(date.getMonth() + 1).padStart(2, '0'),
			String(date.getDate()).padStart(2, '0'),
		].join('-');
		if (filters.startDate && dateKey < filters.startDate) return false;
		if (filters.endDate) {
			if (filters.endExclusive ? dateKey >= filters.endDate : dateKey > filters.endDate) {
				return false;
			}
		}
	}

	return true;
};

export const getBudgetTransactionFilters = (
	budget: Budget,
	referenceDate = new Date()
): TransactionFilterDescriptor => {
	const recurringDay = budget.cycleDay ?? budget.startDay;
	const range =
		budget.period === 'custom' && recurringDay
			? getBudgetCycleDateRange(recurringDay, referenceDate)
			: budget;

	return {
		accountId: budget.accountId,
		category: budget.categoryId,
		subcategory: budget.subCategoryId,
		type: 'expense',
		startDate: range.startDate,
		endDate: range.endDate,
		endExclusive: budget.period === 'custom' && Boolean(recurringDay),
	};
};
