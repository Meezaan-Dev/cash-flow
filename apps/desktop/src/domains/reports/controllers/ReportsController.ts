import {
	Account,
	AccountReport,
	CategoryBreakdownReport,
	CategoryReport,
	DateRange,
	MonthlyAccountSummary,
	MonthlyCategorySummary,
	MonthlyTrend,
	NetWorthData,
	SubcategoryReport,
	Transaction,
} from '@/types';
import { calculateNetWorth } from '@cash-flow/shared/accounts/AccountModel';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';

const CHART_COLORS = [
	'#6366f1',
	'#8b5cf6',
	'#ec4899',
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#14b8a6',
	'#0ea5e9',
	'#3b82f6',
];

const getTransactionDate = (t: Transaction): Date => {
	const d = parseDbDateOrNull(t.date) ?? parseDbDateOrNull(t.createdAt);
	return d ?? new Date();
};

const formatDateInput = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const isInDateRange = (date: Date, range: DateRange): boolean => {
	if (!range.startDate && !range.endDate) return true;
	if (range.startDate && date < new Date(range.startDate)) return false;
	if (range.endDate) {
		const end = new Date(range.endDate);
		end.setHours(23, 59, 59, 999);
		if (date > end) return false;
	}
	return true;
};

const NO_SUBCATEGORY_KEY = '__none__';

const getSubcategoryKey = (subcategory?: string): string =>
	subcategory?.trim() || NO_SUBCATEGORY_KEY;

const getSubcategoryValue = (subcategoryKey: string): string | undefined =>
	subcategoryKey === NO_SUBCATEGORY_KEY ? undefined : subcategoryKey;

type CurrentCategoryBucket = {
	amount: number;
	transactionCount: number;
	subcategories: Record<string, { amount: number; transactionCount: number }>;
};

type PreviousCategoryBucket = {
	amount: number;
	subcategories: Record<string, number>;
};

export const getMonthDateRange = (year: number, monthIndex: number): DateRange => {
	const start = new Date(year, monthIndex, 1);
	const end = new Date(year, monthIndex + 1, 0);

	return {
		startDate: formatDateInput(start),
		endDate: formatDateInput(end),
	};
};

export const getCurrentMonthDateRange = (today = new Date()): DateRange => ({
	startDate: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
	endDate: formatDateInput(today),
});

export const getPreviousMonthDateRange = (dateRange: DateRange): DateRange => {
	const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date();
	const end = dateRange.endDate ? new Date(dateRange.endDate) : start;
	const previousMonthIndex = start.getMonth() - 1;
	const previousMonthLastDay = new Date(
		start.getFullYear(),
		previousMonthIndex + 1,
		0
	).getDate();
	const previousStart = new Date(
		start.getFullYear(),
		previousMonthIndex,
		Math.min(start.getDate(), previousMonthLastDay)
	);
	const previousEnd = new Date(
		start.getFullYear(),
		previousMonthIndex,
		Math.min(end.getDate(), previousMonthLastDay)
	);

	return {
		startDate: formatDateInput(previousStart),
		endDate: formatDateInput(previousEnd),
	};
};

export const getSpendingByCategory = (
	transactions: Transaction[],
	dateRange: DateRange
): CategoryReport[] => {
	const map: Record<string, number> = {};

	transactions
		.filter((t) => t.type === 'expense')
		.filter((t) => isInDateRange(getTransactionDate(t), dateRange))
		.forEach((t) => {
			map[t.category] = (map[t.category] ?? 0) + t.amount;
		});

	return Object.entries(map).map(([category, amount], index) => ({
		category,
		amount,
		color: CHART_COLORS[index % CHART_COLORS.length],
	}));
};

export const getSpendingBySubcategory = (
	transactions: Transaction[],
	dateRange: DateRange
): SubcategoryReport[] => {
	const map: Record<string, { category: string; subcategoryKey: string; amount: number }> = {};

	transactions
		.filter((t) => t.type === 'expense')
		.filter((t) => isInDateRange(getTransactionDate(t), dateRange))
		.forEach((t) => {
			const subcategoryKey = getSubcategoryKey(t.subcategory);
			const key = `${t.category}::${subcategoryKey}`;
			if (!map[key]) {
				map[key] = { category: t.category, subcategoryKey, amount: 0 };
			}
			map[key].amount += t.amount;
		});

	return Object.values(map)
		.sort((left, right) => right.amount - left.amount)
		.map((item, index) => ({
			category: item.category,
			subcategory: getSubcategoryValue(item.subcategoryKey),
			amount: item.amount,
			color: CHART_COLORS[index % CHART_COLORS.length],
		}));
};

export const getCategoryBreakdown = (
	transactions: Transaction[],
	dateRange: DateRange
): CategoryBreakdownReport[] => {
	const map: Record<
		string,
		{ amount: number; subcategories: Record<string, number> }
	> = {};

	transactions
		.filter((t) => t.type === 'expense')
		.filter((t) => isInDateRange(getTransactionDate(t), dateRange))
		.forEach((t) => {
			if (!map[t.category]) {
				map[t.category] = { amount: 0, subcategories: {} };
			}

			const subcategoryKey = getSubcategoryKey(t.subcategory);
			map[t.category].amount += t.amount;
			map[t.category].subcategories[subcategoryKey] =
				(map[t.category].subcategories[subcategoryKey] ?? 0) + t.amount;
		});

	return Object.entries(map)
		.sort(([, left], [, right]) => right.amount - left.amount)
		.map(([category, data], index) => ({
			category,
			amount: data.amount,
			color: CHART_COLORS[index % CHART_COLORS.length],
			subcategories: Object.entries(data.subcategories)
				.sort(([, leftAmount], [, rightAmount]) => rightAmount - leftAmount)
				.map(([subcategoryKey, amount]) => ({
					category,
					subcategory: getSubcategoryValue(subcategoryKey),
					amount,
					percentage: data.amount > 0 ? (amount / data.amount) * 100 : 0,
				})),
		}));
};

export const getMonthlyCategorySummaries = (
	transactions: Transaction[],
	dateRange: DateRange,
	previousDateRange: DateRange = getPreviousMonthDateRange(dateRange)
): MonthlyCategorySummary[] => {
	const currentTotals: Record<string, CurrentCategoryBucket> = {};
	const previousTotals: Record<string, PreviousCategoryBucket> = {};

	transactions
		.filter((transaction) => transaction.type === 'expense')
		.forEach((transaction) => {
			const date = getTransactionDate(transaction);
			const category = transaction.category;
			const subcategoryKey = getSubcategoryKey(transaction.subcategory);

			if (isInDateRange(date, dateRange)) {
				if (!currentTotals[category]) {
					currentTotals[category] = {
						amount: 0,
						transactionCount: 0,
						subcategories: {},
					};
				}
				if (!currentTotals[category].subcategories[subcategoryKey]) {
					currentTotals[category].subcategories[subcategoryKey] = {
						amount: 0,
						transactionCount: 0,
					};
				}
				currentTotals[category].amount += transaction.amount;
				currentTotals[category].transactionCount += 1;
				currentTotals[category].subcategories[subcategoryKey].amount += transaction.amount;
				currentTotals[category].subcategories[subcategoryKey].transactionCount += 1;
			}

			if (isInDateRange(date, previousDateRange)) {
				if (!previousTotals[category]) {
					previousTotals[category] = { amount: 0, subcategories: {} };
				}
				previousTotals[category].amount += transaction.amount;
				previousTotals[category].subcategories[subcategoryKey] =
					(previousTotals[category].subcategories[subcategoryKey] ?? 0) +
					transaction.amount;
			}
		});

	const totalExpense = Object.values(currentTotals).reduce(
		(sum, category) => sum + category.amount,
		0
	);

	return Object.entries(currentTotals)
		.sort(([, left], [, right]) => right.amount - left.amount)
		.map(([category, data], index) => ({
			category,
			amount: data.amount,
			percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
			transactionCount: data.transactionCount,
			previousAmount: previousTotals[category]?.amount ?? 0,
			deltaAmount: data.amount - (previousTotals[category]?.amount ?? 0),
			color: CHART_COLORS[index % CHART_COLORS.length],
			subcategories: Object.entries(data.subcategories)
				.sort(([, left], [, right]) => right.amount - left.amount)
				.map(([subcategoryKey, subcategory]) => ({
					category,
					subcategory: getSubcategoryValue(subcategoryKey),
					amount: subcategory.amount,
					percentage: data.amount > 0 ? (subcategory.amount / data.amount) * 100 : 0,
					transactionCount: subcategory.transactionCount,
					previousAmount:
						previousTotals[category]?.subcategories[subcategoryKey] ?? 0,
					deltaAmount:
						subcategory.amount -
						(previousTotals[category]?.subcategories[subcategoryKey] ?? 0),
				})),
		}));
};

export const getMonthlyAccountSummaries = (
	transactions: Transaction[],
	accounts: Account[],
	dateRange: DateRange,
	accountId?: string
): MonthlyAccountSummary[] => {
	const summaries = new Map<string, MonthlyAccountSummary>();

	for (const account of accounts) {
		if (!account.id) continue;
		if (accountId && account.id !== accountId) continue;
		summaries.set(account.id, {
			accountId: account.id,
			accountName: account.name,
			color: account.color ?? CHART_COLORS[summaries.size % CHART_COLORS.length],
			income: 0,
			expense: 0,
			net: 0,
			transactionCount: 0,
		});
	}

	transactions
		.filter((transaction) => isInDateRange(getTransactionDate(transaction), dateRange))
		.filter((transaction) => !accountId || transaction.accountId === accountId)
		.forEach((transaction) => {
			if (!summaries.has(transaction.accountId)) {
				summaries.set(transaction.accountId, {
					accountId: transaction.accountId,
					accountName: 'Unknown',
					color: CHART_COLORS[summaries.size % CHART_COLORS.length],
					income: 0,
					expense: 0,
					net: 0,
					transactionCount: 0,
				});
			}

			const summary = summaries.get(transaction.accountId)!;
			if (transaction.type === 'income') summary.income += transaction.amount;
			if (transaction.type === 'expense') summary.expense += transaction.amount;
			summary.net = summary.income - summary.expense;
			summary.transactionCount += 1;
		});

	return Array.from(summaries.values()).sort((left, right) =>
		right.transactionCount - left.transactionCount || right.expense - left.expense
	);
};

export const getSpendingByAccount = (
	transactions: Transaction[],
	accounts: Account[],
	dateRange: DateRange
): AccountReport[] => {
	const map: Record<string, { income: number; expense: number }> = {};

	transactions
		.filter((t) => isInDateRange(getTransactionDate(t), dateRange))
		.forEach((t) => {
			if (!map[t.accountId]) map[t.accountId] = { income: 0, expense: 0 };
			if (t.type === 'income') map[t.accountId].income += t.amount;
			else if (t.type === 'expense') map[t.accountId].expense += t.amount;
		});

	return Object.entries(map).map(([accountId, data], index) => {
		const account = accounts.find((a) => a.id === accountId);
		return {
			accountId,
			accountName: account?.name ?? 'Unknown',
			color: account?.color ?? CHART_COLORS[index % CHART_COLORS.length],
			...data,
		};
	});
};

export const getMonthlyTrend = (
	transactions: Transaction[],
	months: number = 6
): MonthlyTrend[] => {
	const result: MonthlyTrend[] = [];
	const now = new Date();

	for (let i = months - 1; i >= 0; i--) {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
		const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

		const monthLabel = date.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });

		const inMonth = transactions.filter((t) => {
			const d = getTransactionDate(t);
			return d >= monthStart && d <= monthEnd;
		});

		const income = inMonth
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);

		const expense = inMonth
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);

		result.push({ month: monthLabel, income, expense });
	}

	return result;
};

export const getNetWorth = (accounts: Account[]): NetWorthData => {
	return calculateNetWorth(accounts);
};
