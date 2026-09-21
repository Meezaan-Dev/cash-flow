import { Transaction } from '../types';
import { parseDbDateOrNull } from '../utils/date';

export type PlannedExpenseStatus = 'wishlist' | 'planned' | 'purchased' | 'cancelled';
export type PlannedExpensePriority = 'low' | 'medium' | 'high';
export type PaymentPlanStatus = 'active' | 'completed' | 'cancelled';

export interface PlannedExpense {
	id: string;
	userId: string;
	title: string;
	amount: number;
	targetMonth?: string;
	expectedDate?: Date;
	category: string;
	subcategory?: string;
	accountId?: string;
	notes?: string;
	url?: string;
	priority?: PlannedExpensePriority;
	status: PlannedExpenseStatus;
	transactionId?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface PaymentPlan {
	id: string;
	userId: string;
	itemName: string;
	originalTotal: number;
	basePaidAmount: number;
	expectedPaymentAmount?: number;
	startDate?: Date;
	expectedCompletionDate?: Date;
	category?: string;
	url?: string;
	notes?: string;
	status: PaymentPlanStatus;
	linkedTransactionIds: string[];
	createdAt?: Date;
	updatedAt?: Date;
}

export interface PaymentPlanProgress {
	plan: PaymentPlan;
	paid: number;
	remaining: number;
	percentComplete: number;
	paymentsRemaining?: number;
}

type PlannedExpenseDoc = {
	id: string;
	userId?: string;
	title?: string;
	amount?: number;
	targetMonth?: string;
	expectedDate?: unknown;
	category?: string;
	subcategory?: string;
	accountId?: string;
	notes?: string;
	url?: string;
	priority?: string;
	status?: string;
	transactionId?: string;
	createdAt?: unknown;
	updatedAt?: unknown;
};

type PaymentPlanDoc = {
	id: string;
	userId?: string;
	itemName?: string;
	originalTotal?: number;
	basePaidAmount?: number;
	expectedPaymentAmount?: number;
	startDate?: unknown;
	expectedCompletionDate?: unknown;
	category?: string;
	url?: string;
	notes?: string;
	status?: string;
	linkedTransactionIds?: unknown;
	createdAt?: unknown;
	updatedAt?: unknown;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const getMonthKey = (date = new Date()): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const isValidMonthKey = (month: string): boolean => MONTH_PATTERN.test(month);

export const normalizePlannedExpense = (doc: PlannedExpenseDoc): PlannedExpense => {
	const status: PlannedExpenseStatus =
		doc.status === 'wishlist' ||
		doc.status === 'planned' ||
		doc.status === 'purchased' ||
		doc.status === 'cancelled'
			? doc.status
			: 'planned';
	const priority =
		doc.priority === 'low' || doc.priority === 'medium' || doc.priority === 'high'
			? doc.priority
			: undefined;
	const expectedDate = parseDbDateOrNull(doc.expectedDate);
	const createdAt = parseDbDateOrNull(doc.createdAt);
	const updatedAt = parseDbDateOrNull(doc.updatedAt);

	return {
		id: doc.id,
		userId: doc.userId ?? '',
		title: doc.title ?? '',
		amount: doc.amount ?? 0,
		targetMonth: doc.targetMonth && isValidMonthKey(doc.targetMonth) ? doc.targetMonth : undefined,
		...(expectedDate ? { expectedDate } : {}),
		category: doc.category ?? '',
		subcategory: doc.subcategory || undefined,
		accountId: doc.accountId || undefined,
		notes: doc.notes || undefined,
		url: doc.url || undefined,
		priority,
		status,
		transactionId: doc.transactionId || undefined,
		...(createdAt ? { createdAt } : {}),
		...(updatedAt ? { updatedAt } : {}),
	};
};

export const normalizePlannedExpenses = (docs: PlannedExpenseDoc[]): PlannedExpense[] =>
	docs.map(normalizePlannedExpense);

export const normalizePaymentPlan = (doc: PaymentPlanDoc): PaymentPlan => {
	const startDate = parseDbDateOrNull(doc.startDate);
	const expectedCompletionDate = parseDbDateOrNull(doc.expectedCompletionDate);
	const createdAt = parseDbDateOrNull(doc.createdAt);
	const updatedAt = parseDbDateOrNull(doc.updatedAt);
	const status: PaymentPlanStatus =
		doc.status === 'completed' || doc.status === 'cancelled' ? doc.status : 'active';
	const linkedTransactionIds = Array.isArray(doc.linkedTransactionIds)
		? doc.linkedTransactionIds.filter((id): id is string => typeof id === 'string')
		: [];

	return {
		id: doc.id,
		userId: doc.userId ?? '',
		itemName: doc.itemName ?? '',
		originalTotal: doc.originalTotal ?? 0,
		basePaidAmount: doc.basePaidAmount ?? 0,
		expectedPaymentAmount: doc.expectedPaymentAmount,
		...(startDate ? { startDate } : {}),
		...(expectedCompletionDate ? { expectedCompletionDate } : {}),
		category: doc.category || undefined,
		url: doc.url || undefined,
		notes: doc.notes || undefined,
		status,
		linkedTransactionIds,
		...(createdAt ? { createdAt } : {}),
		...(updatedAt ? { updatedAt } : {}),
	};
};

export const normalizePaymentPlans = (docs: PaymentPlanDoc[]): PaymentPlan[] =>
	docs.map(normalizePaymentPlan);

export const plannedExpenseMonth = (expense: PlannedExpense): string | undefined =>
	expense.targetMonth ?? (expense.expectedDate ? getMonthKey(expense.expectedDate) : undefined);

export const isPlannedExpenseInMonth = (
	expense: PlannedExpense,
	month = getMonthKey()
): boolean => plannedExpenseMonth(expense) === month;

export const getRemainingPlannedExpenses = (
	expenses: PlannedExpense[],
	month = getMonthKey()
): PlannedExpense[] =>
	expenses.filter(
		(expense) =>
			expense.status === 'planned' && isPlannedExpenseInMonth(expense, month)
	);

export const calculatePlannedExpenseTotal = (
	expenses: PlannedExpense[],
	month = getMonthKey()
): number =>
	getRemainingPlannedExpenses(expenses, month).reduce(
		(sum, expense) => sum + expense.amount,
		0
	);

export const calculatePaymentPlanProgress = (
	plan: PaymentPlan,
	transactions: Transaction[]
): PaymentPlanProgress => {
	const linkedPaid = transactions
		.filter(
			(transaction) =>
				transaction.id &&
				plan.linkedTransactionIds.includes(transaction.id) &&
				transaction.type === 'expense'
		)
		.reduce((sum, transaction) => sum + transaction.amount, 0);
	const paid = plan.basePaidAmount + linkedPaid;
	const remaining = Math.max(plan.originalTotal - paid, 0);
	const percentComplete =
		plan.originalTotal > 0
			? Math.min(100, Math.max(0, (paid / plan.originalTotal) * 100))
			: 0;
	const paymentsRemaining =
		plan.expectedPaymentAmount && plan.expectedPaymentAmount > 0
			? Math.ceil(remaining / plan.expectedPaymentAmount)
			: undefined;

	return { plan, paid, remaining, percentComplete, paymentsRemaining };
};

export const calculatePaymentPlansProgress = (
	plans: PaymentPlan[],
	transactions: Transaction[]
): PaymentPlanProgress[] =>
	plans.map((plan) => calculatePaymentPlanProgress(plan, transactions));
