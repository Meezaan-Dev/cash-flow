import { Budget, BudgetProgress, BudgetStatus, Transaction } from '@/types';
import { parseDbDateOrNull } from '@/utils/date';

export type { Budget };

type BudgetDoc = {
	id: string;
	userId?: string;
	accountId?: string;
	categoryId?: string;
	subCategoryId?: string;
	category?: string;
	subcategory?: string;
	amount?: number;
	period?: Budget['period'];
	month?: string;
	startDate?: string;
	endDate?: string;
	lifecycleStatus?: Budget['lifecycleStatus'];
	displayOrder?: number;
	status?: string;
	plannedStartDate?: string;
	plannedEndDate?: string;
	actualStartDate?: string;
	actualEndDate?: string;
	createdAt?: unknown;
	updatedAt?: unknown;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const MAX_BUDGETS = 8;

const toDateKey = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const getCurrentBudgetMonth = (date = new Date()): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const isValidBudgetMonth = (month: string): boolean => MONTH_PATTERN.test(month);

export const getMonthDateRange = (
	month: string
): { startDate: string; endDate: string } => {
	const [year, monthNumber] = month.split('-').map(Number);
	const start = new Date(year, monthNumber - 1, 1);
	const end = new Date(year, monthNumber, 0);
	return { startDate: toDateKey(start), endDate: toDateKey(end) };
};

export const getNextBudgetMonth = (month: string): string => {
	const [year, monthNumber] = month.split('-').map(Number);
	return getCurrentBudgetMonth(new Date(year, monthNumber, 1));
};

export const normalizeBudget = (doc: BudgetDoc): Budget => {
	const createdAt = parseDbDateOrNull(doc.createdAt);
	const updatedAt = parseDbDateOrNull(doc.updatedAt);
	const fallbackMonth =
		doc.month ??
		doc.plannedStartDate?.slice(0, 7) ??
		getCurrentBudgetMonth(createdAt ?? new Date());
	const period = doc.period === 'custom' ? 'custom' : 'monthly';
	const monthlyRange = getMonthDateRange(fallbackMonth);
	const startDate =
		doc.startDate ??
		doc.actualStartDate ??
		doc.plannedStartDate ??
		monthlyRange.startDate;
	const endDate =
		doc.endDate ??
		doc.actualEndDate ??
		doc.plannedEndDate ??
		monthlyRange.endDate;

	return {
		id: doc.id,
		userId: doc.userId ?? '',
		accountId: doc.accountId || undefined,
		categoryId: doc.categoryId ?? doc.category ?? '',
		subCategoryId: doc.subCategoryId ?? doc.subcategory ?? undefined,
		amount: doc.amount ?? 0,
		period,
		month: period === 'monthly' ? fallbackMonth : undefined,
		startDate,
		endDate,
		lifecycleStatus:
			doc.lifecycleStatus ?? (doc.status === 'draft' ? 'draft' : 'published'),
		displayOrder:
			typeof doc.displayOrder === 'number' ? doc.displayOrder : undefined,
		...(createdAt ? { createdAt } : {}),
		...(updatedAt ? { updatedAt } : {}),
	};
};

export const normalizeBudgets = (docs: BudgetDoc[]): Budget[] => docs.map(normalizeBudget);

export const isTransactionInBudgetPeriod = (
	transaction: Transaction,
	budget: Pick<Budget, 'startDate' | 'endDate'>
): boolean => {
	const transactionDate =
		parseDbDateOrNull(transaction.date) ?? parseDbDateOrNull(transaction.createdAt);
	if (!transactionDate) return false;
	const dateKey = toDateKey(transactionDate);
	return dateKey >= budget.startDate && dateKey <= budget.endDate;
};

export const isTransactionInBudgetMonth = (
	transaction: Transaction,
	month: string
): boolean =>
	isTransactionInBudgetPeriod(transaction, getMonthDateRange(month));

export const transactionMatchesBudget = (
	transaction: Transaction,
	budget: Budget
): boolean =>
	transaction.type === 'expense' &&
	(!transaction.userId || transaction.userId === budget.userId) &&
	transaction.category === budget.categoryId &&
	(!budget.subCategoryId || transaction.subcategory === budget.subCategoryId) &&
	(!budget.accountId || transaction.accountId === budget.accountId) &&
	isTransactionInBudgetPeriod(transaction, budget);

export const calculateBudgetSpent = (
	transactions: Transaction[],
	budget: Budget
): number =>
	transactions
		.filter((transaction) => transactionMatchesBudget(transaction, budget))
		.reduce((sum, transaction) => sum + transaction.amount, 0);

export const calculateBudgetRemaining = (
	budgetAmount: number,
	spent: number
): number => budgetAmount - spent;

export const calculateBudgetUsedPercentage = (
	budgetAmount: number,
	spent: number
): number => (budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0);

export const getBudgetStatus = (
	budgetAmount: number,
	spent: number
): BudgetStatus => {
	const percentage = calculateBudgetUsedPercentage(budgetAmount, spent);
	if (percentage >= 100) return 'over';
	if (percentage >= 75) return 'warning';
	return 'safe';
};

export const budgetOverlapsMonth = (budget: Budget, month: string): boolean => {
	const range = getMonthDateRange(month);
	return budget.startDate <= range.endDate && budget.endDate >= range.startDate;
};

export const isBudgetPeriodDone = (budget: Budget, now = new Date()): boolean =>
	budget.endDate < toDateKey(now);

export const isDuplicateBudget = (
	budgets: Budget[],
	candidate: Pick<
		Budget,
		'accountId' | 'categoryId' | 'subCategoryId' | 'startDate' | 'endDate'
	>,
	ignoreBudgetId?: string
): boolean =>
	budgets.some(
		(budget) =>
			budget.id !== ignoreBudgetId &&
			(budget.accountId ?? '') === (candidate.accountId ?? '') &&
			budget.categoryId === candidate.categoryId &&
			(budget.subCategoryId ?? '') === (candidate.subCategoryId ?? '') &&
			budget.startDate === candidate.startDate &&
			budget.endDate === candidate.endDate
	);

export const buildRepeatedBudget = (
	budget: Budget
): Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> => {
	const sourceStart = new Date(`${budget.startDate}T12:00:00`);
	const sourceEnd = new Date(`${budget.endDate}T12:00:00`);
	const month =
		budget.period === 'monthly'
			? getNextBudgetMonth(budget.month ?? budget.startDate.slice(0, 7))
			: undefined;
	let range = month ? getMonthDateRange(month) : undefined;

	if (!range) {
		const durationMs = sourceEnd.getTime() - sourceStart.getTime();
		const nextStart = new Date(sourceEnd);
		nextStart.setDate(nextStart.getDate() + 1);
		const nextEnd = new Date(nextStart.getTime() + durationMs);
		range = { startDate: toDateKey(nextStart), endDate: toDateKey(nextEnd) };
	}

	return {
		userId: budget.userId,
		accountId: budget.accountId,
		categoryId: budget.categoryId,
		subCategoryId: budget.subCategoryId,
		amount: budget.amount,
		period: budget.period,
		month,
		startDate: range.startDate,
		endDate: range.endDate,
		lifecycleStatus: 'draft',
	};
};

export const sortBudgetsByDisplayOrder = (budgets: Budget[]): Budget[] =>
	[...budgets].sort((left, right) => {
		const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
		const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
		if (leftOrder !== rightOrder) return leftOrder - rightOrder;

		const leftCreatedAt = parseDbDateOrNull(left.createdAt)?.getTime() ?? 0;
		const rightCreatedAt = parseDbDateOrNull(right.createdAt)?.getTime() ?? 0;
		if (leftCreatedAt !== rightCreatedAt) return leftCreatedAt - rightCreatedAt;
		return left.id.localeCompare(right.id);
	});

export const calculateBudgetProgress = (
	budget: Budget,
	transactions: Transaction[]
): BudgetProgress => {
	const spent = calculateBudgetSpent(transactions, budget);
	return {
		budget,
		spent,
		remaining: calculateBudgetRemaining(budget.amount, spent),
		usedPercentage: calculateBudgetUsedPercentage(budget.amount, spent),
		status: getBudgetStatus(budget.amount, spent),
	};
};

export const calculateBudgetSummary = (
	budgets: Budget[],
	transactions: Transaction[],
	month: string
) => {
	const progress = budgets
		.filter(
			(budget) =>
				budget.lifecycleStatus === 'published' &&
				budgetOverlapsMonth(budget, month)
		)
		.map((budget) => calculateBudgetProgress(budget, transactions));

	return {
		totalBudget: progress.reduce((sum, item) => sum + item.budget.amount, 0),
		totalSpent: progress.reduce((sum, item) => sum + item.spent, 0),
		remaining: progress.reduce((sum, item) => sum + item.remaining, 0),
		overCount: progress.filter((item) => item.status === 'over').length,
		warningCount: progress.filter((item) => item.status === 'warning').length,
	};
};
