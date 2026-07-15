import { Budget, BudgetProgress, BudgetStatus, Transaction } from '@/types';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';

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
	cycleDay?: number;
	startDay?: number;
	endDay?: number;
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

export const clampBudgetDay = (day: number): number => {
	if (!Number.isFinite(day)) return 1;
	return Math.min(31, Math.max(1, Math.round(day)));
};

const getDaysInMonth = (year: number, month: number): number =>
	new Date(year, month + 1, 0).getDate();

const createClampedDate = (year: number, month: number, day: number): Date =>
	new Date(year, month, Math.min(clampBudgetDay(day), getDaysInMonth(year, month)));

export const getBudgetCycleDateRange = (
	cycleDay: number,
	referenceDate = new Date()
): { startDate: string; endDate: string } => {
	const normalizedCycleDay = clampBudgetDay(cycleDay);
	const currentRenewal = createClampedDate(
		referenceDate.getFullYear(),
		referenceDate.getMonth(),
		normalizedCycleDay
	);
	const startsThisMonth = referenceDate >= currentRenewal;
	const startMonthOffset = startsThisMonth ? 0 : -1;
	const endMonthOffset = startsThisMonth ? 1 : 0;
	const start = createClampedDate(
		referenceDate.getFullYear(),
		referenceDate.getMonth() + startMonthOffset,
		normalizedCycleDay
	);
	const end = createClampedDate(
		referenceDate.getFullYear(),
		referenceDate.getMonth() + endMonthOffset,
		normalizedCycleDay
	);

	return { startDate: toDateKey(start), endDate: toDateKey(end) };
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
	const cycleDay =
		period === 'custom'
			? clampBudgetDay(
					doc.cycleDay ?? doc.startDay ?? Number(startDate.slice(-2))
				)
			: undefined;
	const startDay =
		period === 'custom'
			? clampBudgetDay(doc.startDay ?? cycleDay ?? Number(startDate.slice(-2)))
			: undefined;
	const endDay =
		period === 'custom'
			? clampBudgetDay(doc.endDay ?? Number(endDate.slice(-2)))
			: undefined;

	return {
		id: doc.id,
		userId: doc.userId ?? '',
		accountId: doc.accountId || undefined,
		categoryId: doc.categoryId ?? doc.category ?? '',
		subCategoryId: doc.subCategoryId ?? doc.subcategory ?? undefined,
		amount: doc.amount ?? 0,
		period,
		month: period === 'monthly' ? fallbackMonth : undefined,
		cycleDay,
		startDay,
		endDay,
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
	budget: Pick<
		Budget,
		'period' | 'startDate' | 'endDate' | 'cycleDay' | 'startDay'
	>,
	referenceDate = new Date()
): boolean => {
	const transactionDate =
		parseDbDateOrNull(transaction.date) ?? parseDbDateOrNull(transaction.createdAt);
	if (!transactionDate) return false;
	const range =
		budget.period === 'custom' && (budget.cycleDay || budget.startDay)
			? getBudgetCycleDateRange(
					budget.cycleDay ?? budget.startDay!,
					referenceDate
				)
			: budget;
	const dateKey = toDateKey(transactionDate);
	return budget.period === 'custom'
		? dateKey >= range.startDate && dateKey < range.endDate
		: dateKey >= range.startDate && dateKey <= range.endDate;
};

export const isTransactionInBudgetMonth = (
	transaction: Transaction,
	month: string
): boolean =>
	isTransactionInBudgetPeriod(transaction, {
		period: 'monthly',
		...getMonthDateRange(month),
	});

export const transactionMatchesBudget = (
	transaction: Transaction,
	budget: Budget,
	referenceDate = new Date()
): boolean =>
	transaction.type === 'expense' &&
	(!transaction.userId || transaction.userId === budget.userId) &&
	transaction.category === budget.categoryId &&
	(!budget.subCategoryId || transaction.subcategory === budget.subCategoryId) &&
	(!budget.accountId || transaction.accountId === budget.accountId) &&
	isTransactionInBudgetPeriod(transaction, budget, referenceDate);

export const calculateBudgetSpent = (
	transactions: Transaction[],
	budget: Budget,
	referenceDate = new Date()
): number =>
	transactions
		.filter((transaction) => transactionMatchesBudget(transaction, budget, referenceDate))
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
	const budgetRange =
		budget.period === 'custom' && (budget.cycleDay || budget.startDay)
			? getBudgetCycleDateRange(
					budget.cycleDay ?? budget.startDay!,
					new Date(`${month}-15T12:00:00`)
				)
			: budget;
	const monthEndExclusive = getMonthDateRange(getNextBudgetMonth(month)).startDate;
	return budget.period === 'custom'
		? budgetRange.startDate < monthEndExclusive &&
				budgetRange.endDate > range.startDate
		: budgetRange.startDate <= range.endDate &&
				budgetRange.endDate >= range.startDate;
};

export const isBudgetPeriodDone = (budget: Budget, now = new Date()): boolean =>
	budget.period === 'monthly' && budget.endDate < toDateKey(now);

export const isDuplicateBudget = (
	budgets: Budget[],
	candidate: Pick<
		Budget,
		| 'accountId'
		| 'categoryId'
		| 'subCategoryId'
		| 'period'
		| 'cycleDay'
		| 'startDay'
		| 'endDay'
		| 'startDate'
		| 'endDate'
	>,
	ignoreBudgetId?: string
): boolean =>
	budgets.some(
		(budget) =>
			budget.id !== ignoreBudgetId &&
			(budget.accountId ?? '') === (candidate.accountId ?? '') &&
			budget.categoryId === candidate.categoryId &&
			(budget.subCategoryId ?? '') === (candidate.subCategoryId ?? '') &&
			(budget.period === 'custom' && candidate.period === 'custom'
				? (budget.cycleDay ?? budget.startDay) ===
					(candidate.cycleDay ?? candidate.startDay)
				: budget.startDate === candidate.startDate &&
					budget.endDate === candidate.endDate)
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
	transactions: Transaction[],
	referenceDate = new Date()
): BudgetProgress => {
	const spent = calculateBudgetSpent(transactions, budget, referenceDate);
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
		.map((budget) =>
			calculateBudgetProgress(
				budget,
				transactions,
				new Date(`${month}-15T12:00:00`)
			)
		);

	return {
		totalBudget: progress.reduce((sum, item) => sum + item.budget.amount, 0),
		totalSpent: progress.reduce((sum, item) => sum + item.spent, 0),
		remaining: progress.reduce((sum, item) => sum + item.remaining, 0),
		overCount: progress.filter((item) => item.status === 'over').length,
		warningCount: progress.filter((item) => item.status === 'warning').length,
	};
};
