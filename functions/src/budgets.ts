import * as functions from 'firebase-functions';
import { db, Timestamp } from './firebase';
import { getRequestId, requirePostUser, setCorsHeaders } from './http';

const MAX_BUDGETS = 8;
const usersRef = (uid: string) => db.collection('users').doc(uid);
const budgetsRef = (uid: string) => usersRef(uid).collection('budgets');

interface CreateBudgetBody {
	accountId?: unknown;
	categoryId?: unknown;
	subCategoryId?: unknown;
	amount?: unknown;
	period?: unknown;
	month?: unknown;
	cycleDay?: unknown;
	startDate?: unknown;
	endDate?: unknown;
	lifecycleStatus?: unknown;
	displayOrder?: unknown;
}

const optionalText = (value: unknown, field: string, maxLength: number): string | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string' || value.length > maxLength) throw new Error(`${field} is invalid.`);
	return value;
};

const requiredText = (value: unknown, field: string, maxLength: number): string => {
	const normalized = optionalText(value, field, maxLength)?.trim();
	if (!normalized) throw new Error(`${field} is required.`);
	return normalized;
};

const day = (value: unknown): number | undefined => {
	if (value === undefined || value === null) return undefined;
	if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 31) {
		throw new Error('Cycle day is invalid.');
	}
	return value as number;
};

const dateKey = (value: unknown, field: string): string => {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(`${field} is invalid.`);
	}
	return value;
};

export const createBudget = functions.https.onRequest(async (req, res) => {
	const requestId = getRequestId(req);
	const decoded = await requirePostUser(req, res, requestId);
	if (!decoded) return;

	try {
		const body = (req.body || {}) as CreateBudgetBody;
		const categoryId = requiredText(body.categoryId, 'Category', 80);
		const accountId = optionalText(body.accountId, 'Account', 1500);
		const subCategoryId = optionalText(body.subCategoryId, 'Subcategory', 80);
		const amount = body.amount;
		if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) {
			throw new Error('Budget amount must be greater than zero.');
		}
		const period = body.period === 'custom' ? 'custom' : body.period === 'monthly' ? 'monthly' : null;
		if (!period) throw new Error('Budget period is invalid.');
		const month = period === 'monthly' ? requiredText(body.month, 'Month', 7) : undefined;
		if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Month is invalid.');
		const startDate = dateKey(body.startDate, 'Start date');
		const endDate = dateKey(body.endDate, 'End date');
		if (startDate > endDate) throw new Error('Budget end date must be on or after its start date.');
		const cycleDay = period === 'custom' ? day(body.cycleDay) : undefined;
		const lifecycleStatus = body.lifecycleStatus === 'published' ? 'published' : 'draft';

		let createdId = '';
		await db.runTransaction(async (transaction) => {
			const snapshot = await transaction.get(budgetsRef(decoded.uid));
			const budgets = snapshot.docs.map((budget) => budget.data());
			if (budgets.length >= MAX_BUDGETS) {
				throw new Error(`You can create up to ${MAX_BUDGETS} budgets.`);
			}
			const duplicate = budgets.some((budget) =>
				(budget.accountId ?? '') === (accountId ?? '') &&
				(budget.categoryId ?? budget.category) === categoryId &&
				(budget.subCategoryId ?? budget.subcategory ?? '') === (subCategoryId ?? '') &&
				budget.period === period &&
				(period === 'custom'
					? (budget.cycleDay ?? budget.startDay) === cycleDay
					: budget.startDate === startDate && budget.endDate === endDate)
			);
			if (duplicate) throw new Error('A budget already exists for this category and period.');

			createdId = budgetsRef(decoded.uid).doc().id;
			const highestOrder = budgets.reduce(
				(highest, budget) => Math.max(highest, typeof budget.displayOrder === 'number' ? budget.displayOrder : -1),
				-1
			);
			transaction.create(budgetsRef(decoded.uid).doc(createdId), {
				userId: decoded.uid,
				...(accountId ? { accountId } : {}),
				categoryId,
				...(subCategoryId ? { subCategoryId } : {}),
				amount,
				period,
				...(month ? { month } : {}),
				...(cycleDay ? { cycleDay } : {}),
				startDate,
				endDate,
				lifecycleStatus,
				displayOrder: typeof body.displayOrder === 'number' ? body.displayOrder : highestOrder + 1,
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			});
		});

		setCorsHeaders(res);
		res.status(200).json({ success: true, data: { id: createdId } });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Budget creation failed.';
		console.error('Budget creation failed:', { requestId, error });
		setCorsHeaders(res);
		res.status(400).json({
			success: false,
			error: message,
			code: 'BUDGET_CREATE_FAILED',
			details: message,
			retryable: false,
			requestId,
		});
	}
});
