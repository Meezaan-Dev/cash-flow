import { Budget, BudgetProgress, DateRange, Transaction } from '../types';
import { filterTransactionsByDateRangeObject } from '../utils/dateRangeFilter';
import { parseDbDateOrNull } from '../utils/date';

export type { Budget };

const toIsoDate = (value: Date): string => value.toISOString().split('T')[0];

const getMonthBounds = (baseDate: Date): DateRange => {
	const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
	const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

	return {
		startDate: toIsoDate(start),
		endDate: toIsoDate(end),
	};
};

type BudgetDocForLegacy = {
	createdAt?: unknown;
	updatedAt?: unknown;
};

const getLegacyBudgetRange = (doc: BudgetDocForLegacy): DateRange => {
	const createdAt =
		parseDbDateOrNull(doc.createdAt) ??
		parseDbDateOrNull(doc.updatedAt) ??
		new Date();

	return getMonthBounds(createdAt);
};

type BudgetDoc = {
	id: string;
	userId?: string;
	category?: string;
	amount?: number;
	period?: Budget['period'];
	status?: Budget['status'];
	plannedStartDate?: string;
	plannedEndDate?: string;
	actualStartDate?: string;
	actualEndDate?: string;
	createdAt?: unknown;
	updatedAt?: unknown;
};

export const normalizeBudget = (doc: BudgetDoc): Budget => {
	const legacyRange = getLegacyBudgetRange(doc);
	const budget: Budget = {
		id: doc.id,
		userId: doc.userId,
		category: doc.category ?? '',
		amount: doc.amount ?? 0,
		period: doc.period ?? 'monthly',
		status: doc.status ?? 'published',
		plannedStartDate: doc.plannedStartDate ?? legacyRange.startDate,
		plannedEndDate: doc.plannedEndDate ?? legacyRange.endDate,
		actualStartDate: doc.actualStartDate ?? undefined,
		actualEndDate: doc.actualEndDate ?? undefined,
	};

	const createdParsed = doc.createdAt != null ? parseDbDateOrNull(doc.createdAt) : null;
	if (createdParsed) {
		budget.createdAt = createdParsed;
	}

	return budget;
};

export const normalizeBudgets = (docs: BudgetDoc[]): Budget[] => docs.map(normalizeBudget);

export const calculateBudgetUsage = (
	budget: Budget,
	transactions: Transaction[]
): BudgetProgress => {
	const isDraft = budget.status === 'draft';
	const started = Boolean(budget.actualStartDate && budget.actualEndDate);
	const calculating = isDraft || started;
	const comparisonRange: DateRange = {
		startDate: isDraft ? budget.plannedStartDate : budget.actualStartDate ?? '',
		endDate: isDraft ? budget.plannedEndDate : budget.actualEndDate ?? '',
	};

	const actualSpent = calculating
		? filterTransactionsByDateRangeObject(
				transactions.filter(
					(transaction) =>
						transaction.type === 'expense' && transaction.category === budget.category
				),
				comparisonRange
		  ).reduce((sum, transaction) => sum + transaction.amount, 0)
		: 0;

	const remaining = calculating ? Math.max(0, budget.amount - actualSpent) : budget.amount;
	const overBudget = calculating ? Math.max(0, actualSpent - budget.amount) : 0;
	const percent =
		calculating && budget.amount > 0
			? Math.min(100, (actualSpent / budget.amount) * 100)
			: 0;

	return {
		budget,
		status: budget.status,
		isDraft,
		plannedAmount: budget.amount,
		plannedStartDate: budget.plannedStartDate,
		plannedEndDate: budget.plannedEndDate,
		actualStartDate: budget.actualStartDate,
		actualEndDate: budget.actualEndDate,
		comparisonStartDate: comparisonRange.startDate,
		comparisonEndDate: comparisonRange.endDate,
		started,
		calculating,
		actualSpent,
		remaining,
		overBudget,
		percent,
	};
};
