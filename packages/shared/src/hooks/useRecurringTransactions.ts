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
	type UpdateData,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
	normalizeRecurringTransactions,
	type RecurringTransaction,
} from '../recurring/RecurringTransactionModel';
import {
	assertPositiveMoney,
	normalizeOptionalText,
	normalizeRequiredText,
	TEXT_LIMITS,
} from '../validation';

const sanitizeRecurringPayload = (
	payload: Partial<RecurringTransaction>,
	allowFieldDelete: boolean
) => {
	const sanitized: Record<string, unknown> = {};

	if (payload.title !== undefined) {
		sanitized.title = normalizeRequiredText(payload.title, 'Title', TEXT_LIMITS.title);
	}
	if (payload.amount !== undefined) sanitized.amount = assertPositiveMoney(payload.amount);
	if (payload.type !== undefined) {
		if (payload.type !== 'income' && payload.type !== 'expense') {
			throw new Error('Recurring transaction type must be income or expense.');
		}
		sanitized.type = payload.type;
	}
	if (payload.frequency !== undefined) {
		if (!['daily', 'weekly', 'monthly', 'yearly'].includes(payload.frequency)) {
			throw new Error('Recurring frequency is invalid.');
		}
		sanitized.frequency = payload.frequency;
	}
	if (payload.accountId !== undefined) {
		sanitized.accountId = normalizeRequiredText(
			payload.accountId,
			'Account',
			TEXT_LIMITS.documentId
		);
	} else if (
		allowFieldDelete &&
		Object.prototype.hasOwnProperty.call(payload, 'accountId')
	) {
		sanitized.accountId = deleteField();
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
		const description = normalizeOptionalText(
			payload.description,
			'Description',
			TEXT_LIMITS.description
		);
		if (description) sanitized.description = description;
		else if (allowFieldDelete) sanitized.description = deleteField();
	}
	if (payload.expectedDate !== undefined) {
		if (
			Number.isInteger(payload.expectedDate) &&
			payload.expectedDate >= 1 &&
			payload.expectedDate <= 31
		) {
			sanitized.expectedDate = payload.expectedDate;
		} else {
			throw new Error('Expected date must be a day between 1 and 31.');
		}
	}
	if (
		allowFieldDelete &&
		Object.prototype.hasOwnProperty.call(payload, 'expectedDate') &&
		payload.expectedDate === undefined
	) {
		sanitized.expectedDate = deleteField();
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

	return sanitized;
};

export const useRecurringTransactions = () => {
	const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(() => auth.currentUser);

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			setUser(firebaseUser);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!user) {
			setRecurringTransactions([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const col = collection(db, 'users', user.uid, 'recurringTransactions');
		const q = query(col);

		const unsubscribe = onSnapshot(
			q,
			(querySnapshot) => {
				const fetched = querySnapshot.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}));
				setRecurringTransactions(normalizeRecurringTransactions(fetched));
				setLoading(false);
			},
			(error) => {
				console.error('Error fetching recurring transactions:', error);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	const addRecurringTransaction = async (
		transaction: Omit<RecurringTransaction, 'id' | 'createdAt' | 'userId'>
	) => {
		if (!user) throw new Error('User not authenticated');

		const col = collection(db, 'users', user.uid, 'recurringTransactions');
		await addDoc(col, {
			...sanitizeRecurringPayload(transaction, false),
			createdAt: Timestamp.now(),
			userId: user.uid,
		});
	};

	const deleteRecurringTransaction = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		await deleteDoc(doc(db, 'users', user.uid, 'recurringTransactions', id));
	};

	const updateRecurringTransaction = async (
		id: string,
		updates: Partial<RecurringTransaction>
	) => {
		if (!user) throw new Error('User not authenticated');

		const ref = doc(db, 'users', user.uid, 'recurringTransactions', id);
		await updateDoc(
			ref,
			sanitizeRecurringPayload(updates, true) as UpdateData<RecurringTransaction>
		);
	};

	return {
		recurringTransactions,
		addRecurringTransaction,
		deleteRecurringTransaction,
		updateRecurringTransaction,
		loading,
	};
};
