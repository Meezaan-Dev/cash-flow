import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { Budget } from '@/types';
import { normalizeBudget } from '@/domains/budgets/models/BudgetModel';
import {
	createBudget,
	deleteBudget as deleteBudgetDocument,
	publishBudget as publishBudgetDocument,
	repeatBudget as repeatBudgetDocument,
	reorderBudgets as reorderBudgetsDocument,
	updateBudget as updateBudgetDocument,
	type CreateBudgetInput,
	type UpdateBudgetInput,
} from '@/domains/budgets/services/budgetService';

export type BudgetFormData = Omit<CreateBudgetInput, 'userId'>;

export const useBudgets = () => {
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(() => auth.currentUser);

	useEffect(
		() => auth.onAuthStateChanged((firebaseUser) => setUser(firebaseUser)),
		[]
	);

	useEffect(() => {
		if (!user) {
			setBudgets([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		return onSnapshot(
			query(collection(db, 'users', user.uid, 'budgets')),
			(snapshot) => {
				setBudgets(
					snapshot.docs.map((budgetDoc) =>
						normalizeBudget({ id: budgetDoc.id, ...budgetDoc.data() })
					)
				);
				setLoading(false);
			},
			(error) => {
				console.error('Error fetching budgets:', error);
				setLoading(false);
			}
		);
	}, [user]);

	const addBudget = async (budget: BudgetFormData) => {
		if (!user) throw new Error('User not authenticated');
		await createBudget({ ...budget, userId: user.uid });
	};

	const updateBudget = async (id: string, updates: UpdateBudgetInput) => {
		if (!user) throw new Error('User not authenticated');
		await updateBudgetDocument(user.uid, id, updates);
	};

	const deleteBudget = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		await deleteBudgetDocument(user.uid, id);
	};

	const publishBudget = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		await publishBudgetDocument(user.uid, id);
	};

	const repeatBudget = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		await repeatBudgetDocument(user.uid, id);
	};

	const reorderBudgets = async (orderedBudgetIds: string[]) => {
		if (!user) throw new Error('User not authenticated');
		await reorderBudgetsDocument(user.uid, orderedBudgetIds);
	};

	return {
		budgets,
		addBudget,
		updateBudget,
		deleteBudget,
		publishBudget,
		repeatBudget,
		reorderBudgets,
		loading,
	};
};
