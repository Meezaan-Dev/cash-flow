import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
	collection,
	addDoc,
	deleteDoc,
	updateDoc,
	doc,
	query,
	onSnapshot,
	Timestamp,
	type UpdateData,
} from 'firebase/firestore';
import { Budget, DateRange } from '../types';
import { normalizeBudget } from '../models/BudgetModel';

type BudgetFormData = Omit<
	Budget,
	'id' | 'createdAt' | 'userId' | 'status' | 'actualStartDate' | 'actualEndDate'
>;

export const useBudgets = () => {
	const [budgets, setBudgets] = useState<Budget[]>([]);
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
			setBudgets([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const col = collection(db, 'users', user.uid, 'budgets');
		const q = query(col);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetched = snapshot.docs.map((d) =>
				normalizeBudget({ id: d.id, ...d.data() })
			);
			setBudgets(fetched);
			setLoading(false);
		}, (error) => {
			console.error('Error fetching budgets:', error);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const addBudget = async (budget: BudgetFormData) => {
		if (!user) throw new Error('User not authenticated');

		const col = collection(db, 'users', user.uid, 'budgets');
		await addDoc(col, {
			...budget,
			status: 'published',
			userId: user.uid,
			createdAt: Timestamp.now(),
		});
	};

	const addDraftBudget = async (budget: BudgetFormData) => {
		if (!user) throw new Error('User not authenticated');

		const col = collection(db, 'users', user.uid, 'budgets');
		await addDoc(col, {
			...budget,
			status: 'draft',
			userId: user.uid,
			createdAt: Timestamp.now(),
		});
	};

	const updateBudget = async (id: string, updates: Partial<Budget>) => {
		if (!user) throw new Error('User not authenticated');
		const ref = doc(db, 'users', user.uid, 'budgets', id);
		await updateDoc(ref, updates as UpdateData<Budget>);
	};

	const startBudget = async (id: string, actualRange: DateRange) => {
		if (!user) throw new Error('User not authenticated');
		if (!actualRange.startDate || !actualRange.endDate) {
			throw new Error('Please select a start and end date before starting a budget.');
		}

		const ref = doc(db, 'users', user.uid, 'budgets', id);
		await updateDoc(ref, {
			actualStartDate: actualRange.startDate,
			actualEndDate: actualRange.endDate,
		});
	};

	const publishBudget = async (id: string) => {
		if (!user) throw new Error('User not authenticated');

		const budget = budgets.find((item) => item.id === id);
		if (!budget) throw new Error('Budget not found');

		const ref = doc(db, 'users', user.uid, 'budgets', id);
		await updateDoc(ref, {
			status: 'published',
			actualStartDate: budget.plannedStartDate,
			actualEndDate: budget.plannedEndDate,
		});
	};

	const deleteBudget = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		const ref = doc(db, 'users', user.uid, 'budgets', id);
		await deleteDoc(ref);
	};

	return {
		budgets,
		addBudget,
		addDraftBudget,
		updateBudget,
		startBudget,
		publishBudget,
		deleteBudget,
		loading,
	};
};
