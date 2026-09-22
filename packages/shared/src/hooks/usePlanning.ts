import { useEffect, useState } from 'react';
import {
	addDoc,
	collection,
	deleteDoc,
	deleteField,
	doc,
	onSnapshot,
	query,
	Timestamp,
	updateDoc,
	writeBatch,
	type UpdateData,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
	normalizePaymentPlans,
	normalizePlannedExpenses,
	type PaymentPlan,
	type PlannedExpense,
} from '../planning/PlanningModel';
import {
	TEXT_LIMITS,
	assertFiniteMoney,
	assertPositiveMoney,
	assertValidDate,
	normalizeOptionalText,
	normalizeRequiredText,
} from '../validation';

export type AddPlannedExpenseData = Omit<
	PlannedExpense,
	'id' | 'createdAt' | 'updatedAt' | 'userId'
>;
export type UpdatePlannedExpenseData = Partial<AddPlannedExpenseData>;
export type AddPaymentPlanData = Omit<
	PaymentPlan,
	'id' | 'createdAt' | 'updatedAt' | 'userId'
>;
export type UpdatePaymentPlanData = Partial<AddPaymentPlanData>;

const URL_LIMIT = 2000;
const NOTES_LIMIT = 2000;

const toTimestamp = (date: Date | undefined) =>
	date ? Timestamp.fromDate(date) : undefined;

const sanitizeUrl = (url: unknown): string | undefined => {
	const normalized = normalizeOptionalText(url, 'URL', URL_LIMIT);
	if (!normalized) return undefined;
	try {
		const parsed = new URL(normalized);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error('URL must start with http:// or https://.');
		}
		return parsed.toString();
	} catch {
		throw new Error('URL must be a valid web address.');
	}
};

const sanitizePlannedExpense = (
	payload: UpdatePlannedExpenseData,
	allowFieldDelete: boolean
) => {
	const sanitized: Record<string, unknown> = {};

	if (payload.title !== undefined) {
		sanitized.title = normalizeRequiredText(payload.title, 'Title', TEXT_LIMITS.title);
	}
	if (payload.amount !== undefined) sanitized.amount = assertPositiveMoney(payload.amount);
	if (payload.targetMonth !== undefined) {
		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.targetMonth)) {
			throw new Error('Target month is invalid.');
		}
		sanitized.targetMonth = payload.targetMonth;
	}
	if (
		allowFieldDelete &&
		Object.prototype.hasOwnProperty.call(payload, 'targetMonth') &&
		payload.targetMonth === undefined
	) {
		sanitized.targetMonth = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'expectedDate')) {
		const date = assertValidDate(payload.expectedDate);
		if (date) sanitized.expectedDate = toTimestamp(date);
		else if (allowFieldDelete) sanitized.expectedDate = deleteField();
	}
	if (payload.category !== undefined) {
		sanitized.category = normalizeRequiredText(
			payload.category,
			'Category',
			TEXT_LIMITS.category
		);
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'subcategory')) {
		const subcategory = normalizeOptionalText(
			payload.subcategory,
			'Subcategory',
			TEXT_LIMITS.subcategory
		);
		if (subcategory) sanitized.subcategory = subcategory;
		else if (allowFieldDelete) sanitized.subcategory = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'accountId')) {
		const accountId = normalizeOptionalText(
			payload.accountId,
			'Account',
			TEXT_LIMITS.documentId
		);
		if (accountId) sanitized.accountId = accountId;
		else if (allowFieldDelete) sanitized.accountId = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
		const notes = normalizeOptionalText(payload.notes, 'Notes', NOTES_LIMIT);
		if (notes) sanitized.notes = notes;
		else if (allowFieldDelete) sanitized.notes = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'url')) {
		const url = sanitizeUrl(payload.url);
		if (url) sanitized.url = url;
		else if (allowFieldDelete) sanitized.url = deleteField();
	}
	if (payload.priority !== undefined) {
		if (!['low', 'medium', 'high'].includes(payload.priority)) {
			throw new Error('Priority is invalid.');
		}
		sanitized.priority = payload.priority;
	}
	if (
		allowFieldDelete &&
		Object.prototype.hasOwnProperty.call(payload, 'priority') &&
		payload.priority === undefined
	) {
		sanitized.priority = deleteField();
	}
	if (payload.status !== undefined) {
		if (!['wishlist', 'planned', 'purchased', 'cancelled'].includes(payload.status)) {
			throw new Error('Planned expense status is invalid.');
		}
		sanitized.status = payload.status;
	}
	if (payload.displayOrder !== undefined) {
		if (!Number.isInteger(payload.displayOrder) || payload.displayOrder < 0) {
			throw new Error('Display order is invalid.');
		}
		sanitized.displayOrder = payload.displayOrder;
	}
	if (
		allowFieldDelete &&
		Object.prototype.hasOwnProperty.call(payload, 'displayOrder') &&
		payload.displayOrder === undefined
	) {
		sanitized.displayOrder = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'transactionId')) {
		const transactionId = normalizeOptionalText(
			payload.transactionId,
			'Transaction',
			TEXT_LIMITS.documentId
		);
		if (transactionId) sanitized.transactionId = transactionId;
		else if (allowFieldDelete) sanitized.transactionId = deleteField();
	}

	return sanitized;
};

const sanitizePaymentPlan = (
	payload: UpdatePaymentPlanData,
	allowFieldDelete: boolean
) => {
	const sanitized: Record<string, unknown> = {};

	if (payload.itemName !== undefined) {
		sanitized.itemName = normalizeRequiredText(
			payload.itemName,
			'Item name',
			TEXT_LIMITS.title
		);
	}
	if (payload.originalTotal !== undefined) {
		sanitized.originalTotal = assertPositiveMoney(payload.originalTotal, 'Original total');
	}
	if (payload.basePaidAmount !== undefined) {
		const basePaidAmount = assertFiniteMoney(payload.basePaidAmount, 'Amount already paid');
		if (basePaidAmount < 0) throw new Error('Amount already paid cannot be negative.');
		sanitized.basePaidAmount = basePaidAmount;
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'expectedPaymentAmount')) {
		if (payload.expectedPaymentAmount === undefined) {
			if (allowFieldDelete) sanitized.expectedPaymentAmount = deleteField();
		} else {
			sanitized.expectedPaymentAmount = assertPositiveMoney(
				payload.expectedPaymentAmount,
				'Expected payment amount'
			);
		}
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'startDate')) {
		const date = assertValidDate(payload.startDate, 'Start date');
		if (date) sanitized.startDate = toTimestamp(date);
		else if (allowFieldDelete) sanitized.startDate = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'expectedCompletionDate')) {
		const date = assertValidDate(
			payload.expectedCompletionDate,
			'Expected completion date'
		);
		if (date) sanitized.expectedCompletionDate = toTimestamp(date);
		else if (allowFieldDelete) sanitized.expectedCompletionDate = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
		const category = normalizeOptionalText(
			payload.category,
			'Category',
			TEXT_LIMITS.category
		);
		if (category) sanitized.category = category;
		else if (allowFieldDelete) sanitized.category = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'url')) {
		const url = sanitizeUrl(payload.url);
		if (url) sanitized.url = url;
		else if (allowFieldDelete) sanitized.url = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
		const notes = normalizeOptionalText(payload.notes, 'Notes', NOTES_LIMIT);
		if (notes) sanitized.notes = notes;
		else if (allowFieldDelete) sanitized.notes = deleteField();
	}
	if (payload.status !== undefined) {
		if (!['active', 'completed', 'cancelled'].includes(payload.status)) {
			throw new Error('Payment plan status is invalid.');
		}
		sanitized.status = payload.status;
	}
	if (payload.linkedTransactionIds !== undefined) {
		sanitized.linkedTransactionIds = payload.linkedTransactionIds.map((transactionId) =>
			normalizeRequiredText(transactionId, 'Transaction', TEXT_LIMITS.documentId)
		);
	}

	return sanitized;
};

export const usePlanning = () => {
	const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
	const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(() => auth.currentUser);

	useEffect(() => auth.onAuthStateChanged((firebaseUser) => setUser(firebaseUser)), []);

	useEffect(() => {
		if (!user) {
			setPlannedExpenses([]);
			setPaymentPlans([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		let plannedLoaded = false;
		let paymentPlansLoaded = false;
		const markLoaded = () => {
			if (plannedLoaded && paymentPlansLoaded) setLoading(false);
		};

		const unsubscribePlanned = onSnapshot(
			query(collection(db, 'users', user.uid, 'plannedExpenses')),
			(snapshot) => {
				setPlannedExpenses(
					normalizePlannedExpenses(
						snapshot.docs.map((plannedDoc) => ({
							id: plannedDoc.id,
							...plannedDoc.data(),
						}))
					)
				);
				plannedLoaded = true;
				markLoaded();
			},
			(error) => {
				console.error('Error fetching planned expenses:', error);
				plannedLoaded = true;
				markLoaded();
			}
		);

		const unsubscribePaymentPlans = onSnapshot(
			query(collection(db, 'users', user.uid, 'paymentPlans')),
			(snapshot) => {
				setPaymentPlans(
					normalizePaymentPlans(
						snapshot.docs.map((planDoc) => ({
							id: planDoc.id,
							...planDoc.data(),
						}))
					)
				);
				paymentPlansLoaded = true;
				markLoaded();
			},
			(error) => {
				console.error('Error fetching payment plans:', error);
				paymentPlansLoaded = true;
				markLoaded();
			}
		);

		return () => {
			unsubscribePlanned();
			unsubscribePaymentPlans();
		};
	}, [user]);

	const addPlannedExpense = async (expense: AddPlannedExpenseData) => {
		if (!user) throw new Error('User not authenticated');
		const matchingStatus = plannedExpenses.filter(
			(item) => item.status === expense.status
		);
		const nextDisplayOrder =
			expense.displayOrder ??
			matchingStatus.reduce(
				(highest, item) => Math.max(highest, item.displayOrder ?? -1),
				-1
			) +
				1;
		await addDoc(collection(db, 'users', user.uid, 'plannedExpenses'), {
			...sanitizePlannedExpense(expense, false),
			displayOrder: nextDisplayOrder,
			status: expense.status,
			userId: user.uid,
			createdAt: Timestamp.now(),
		});
	};

	const updatePlannedExpense = async (
		id: string,
		updates: UpdatePlannedExpenseData
	) => {
		if (!user) throw new Error('User not authenticated');
		const expenseId = normalizeRequiredText(id, 'Planned expense', TEXT_LIMITS.documentId);
		await updateDoc(
			doc(db, 'users', user.uid, 'plannedExpenses', expenseId),
			{
				...sanitizePlannedExpense(updates, true),
				updatedAt: Timestamp.now(),
			} as UpdateData<PlannedExpense>
		);
	};

	const deletePlannedExpense = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		const expenseId = normalizeRequiredText(id, 'Planned expense', TEXT_LIMITS.documentId);
		await deleteDoc(doc(db, 'users', user.uid, 'plannedExpenses', expenseId));
	};

	const reorderPlannedExpenses = async (orderedExpenseIds: string[]) => {
		if (!user) throw new Error('User not authenticated');
		const uniqueIds = new Set(orderedExpenseIds);
		if (uniqueIds.size !== orderedExpenseIds.length) {
			throw new Error('Planned expense order contains duplicate entries.');
		}

		const batch = writeBatch(db);
		const updatedAt = Timestamp.now();
		orderedExpenseIds.forEach((expenseId, displayOrder) => {
			const normalizedId = normalizeRequiredText(
				expenseId,
				'Planned expense',
				TEXT_LIMITS.documentId
			);
			batch.update(doc(db, 'users', user.uid, 'plannedExpenses', normalizedId), {
				displayOrder,
				updatedAt,
			});
		});
		await batch.commit();
	};

	const addPaymentPlan = async (plan: AddPaymentPlanData) => {
		if (!user) throw new Error('User not authenticated');
		await addDoc(collection(db, 'users', user.uid, 'paymentPlans'), {
			...sanitizePaymentPlan(plan, false),
			status: plan.status,
			linkedTransactionIds: plan.linkedTransactionIds ?? [],
			userId: user.uid,
			createdAt: Timestamp.now(),
		});
	};

	const updatePaymentPlan = async (id: string, updates: UpdatePaymentPlanData) => {
		if (!user) throw new Error('User not authenticated');
		const planId = normalizeRequiredText(id, 'Payment plan', TEXT_LIMITS.documentId);
		await updateDoc(
			doc(db, 'users', user.uid, 'paymentPlans', planId),
			{
				...sanitizePaymentPlan(updates, true),
				updatedAt: Timestamp.now(),
			} as UpdateData<PaymentPlan>
		);
	};

	const deletePaymentPlan = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		const planId = normalizeRequiredText(id, 'Payment plan', TEXT_LIMITS.documentId);
		await deleteDoc(doc(db, 'users', user.uid, 'paymentPlans', planId));
	};

	return {
		plannedExpenses,
		paymentPlans,
		loading,
		addPlannedExpense,
		updatePlannedExpense,
		deletePlannedExpense,
		reorderPlannedExpenses,
		addPaymentPlan,
		updatePaymentPlan,
		deletePaymentPlan,
	};
};
