import {
	Timestamp,
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	updateDoc,
	writeBatch,
	type UpdateData,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Budget } from '@/types';
import {
	budgetOverlapsMonth,
	buildRepeatedBudget,
	isDuplicateBudget,
	MAX_BUDGETS,
	normalizeBudget,
} from '@/domains/budgets/models/BudgetModel';

export type CreateBudgetInput = Omit<
	Budget,
	'id' | 'createdAt' | 'updatedAt'
>;

export type UpdateBudgetInput = Partial<
	Pick<
		Budget,
		| 'accountId'
		| 'categoryId'
		| 'subCategoryId'
		| 'amount'
		| 'period'
		| 'month'
		| 'startDate'
		| 'endDate'
		| 'lifecycleStatus'
		| 'displayOrder'
	>
>;

const budgetCollection = (userId: string) =>
	collection(db, 'users', userId, 'budgets');

const omitUndefined = <T extends Record<string, unknown>>(value: T) =>
	Object.fromEntries(
		Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
	);

const validateBudget = (
	budget: Pick<Budget, 'amount' | 'categoryId' | 'startDate' | 'endDate'>
) => {
	if (!budget.categoryId) throw new Error('Please select a category.');
	if (budget.amount <= 0) throw new Error('Budget amount must be greater than zero.');
	if (!budget.startDate || !budget.endDate) {
		throw new Error('Please select a budget start and end date.');
	}
	if (budget.startDate > budget.endDate) {
		throw new Error('Budget end date must be on or after its start date.');
	}
};

export const getBudgets = async (
	userId: string,
	month?: string
): Promise<Budget[]> => {
	const snapshot = await getDocs(query(budgetCollection(userId)));
	const budgets = snapshot.docs.map((budgetDoc) =>
		normalizeBudget({ id: budgetDoc.id, ...budgetDoc.data() })
	);
	return month
		? budgets.filter((budget) => budgetOverlapsMonth(budget, month))
		: budgets;
};

export const createBudget = async (
	input: CreateBudgetInput
): Promise<string> => {
	validateBudget(input);
	const existing = await getBudgets(input.userId);
	if (existing.length >= MAX_BUDGETS) {
		throw new Error(`You can create up to ${MAX_BUDGETS} budgets.`);
	}
	if (isDuplicateBudget(existing, input)) {
		throw new Error('A budget already exists for this category and period.');
	}

	const created = await addDoc(
		budgetCollection(input.userId),
		omitUndefined({
			...input,
			displayOrder:
				input.displayOrder ??
				existing.reduce(
					(highest, budget) =>
						Math.max(highest, budget.displayOrder ?? -1),
					-1
				) +
					1,
			subCategoryId: input.subCategoryId || null,
			month: input.period === 'monthly' ? input.month : null,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
		})
	);
	return created.id;
};

export const reorderBudgets = async (
	userId: string,
	orderedBudgetIds: string[]
): Promise<void> => {
	const uniqueIds = new Set(orderedBudgetIds);
	if (uniqueIds.size !== orderedBudgetIds.length) {
		throw new Error('Budget order contains duplicate entries.');
	}

	const batch = writeBatch(db);
	const updatedAt = Timestamp.now();
	orderedBudgetIds.forEach((budgetId, displayOrder) => {
		batch.update(doc(db, 'users', userId, 'budgets', budgetId), {
			displayOrder,
			updatedAt,
		});
	});
	await batch.commit();
};

export const updateBudget = async (
	userId: string,
	id: string,
	input: UpdateBudgetInput
): Promise<void> => {
	const budgetRef = doc(db, 'users', userId, 'budgets', id);
	const snapshot = await getDoc(budgetRef);
	if (!snapshot.exists()) throw new Error('Budget not found.');

	const current = normalizeBudget({ id: snapshot.id, ...snapshot.data() });
	const next = { ...current, ...input };
	validateBudget(next);
	const existing = await getBudgets(userId);
	if (isDuplicateBudget(existing, next, id)) {
		throw new Error('A budget already exists for this category and period.');
	}

	const updatesSubCategory = Object.prototype.hasOwnProperty.call(
		input,
		'subCategoryId'
	);
	const updatesAccount = Object.prototype.hasOwnProperty.call(input, 'accountId');
	await updateDoc(
		budgetRef,
		omitUndefined({
			...input,
			...(updatesAccount ? { accountId: input.accountId || null } : {}),
			...(updatesSubCategory
				? { subCategoryId: input.subCategoryId || null }
				: {}),
			...(input.period === 'custom' ? { month: null } : {}),
			updatedAt: Timestamp.now(),
		}) as UpdateData<Budget>
	);
};

export const publishBudget = async (
	userId: string,
	id: string
): Promise<void> => {
	await updateBudget(userId, id, { lifecycleStatus: 'published' });
};

export const repeatBudget = async (
	userId: string,
	id: string
): Promise<string> => {
	const snapshot = await getDoc(doc(db, 'users', userId, 'budgets', id));
	if (!snapshot.exists()) throw new Error('Budget not found.');
	const budget = normalizeBudget({ id: snapshot.id, ...snapshot.data() });
	if (budget.lifecycleStatus !== 'published') {
		throw new Error('Publish this budget before repeating it.');
	}
	return createBudget(buildRepeatedBudget(budget));
};

export const deleteBudget = async (
	userId: string,
	id: string
): Promise<void> => {
	await deleteDoc(doc(db, 'users', userId, 'budgets', id));
};

export const getBudgetForSubCategory = async (
	userId: string,
	subCategoryId: string,
	month: string
): Promise<Budget | null> => {
	const budgets = await getBudgets(userId, month);
	return budgets.find((budget) => budget.subCategoryId === subCategoryId) ?? null;
};
