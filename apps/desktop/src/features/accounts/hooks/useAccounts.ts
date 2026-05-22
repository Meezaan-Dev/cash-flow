import { useState, useEffect } from 'react';
import { db, auth } from '@/services/firebase';
import {
	collection,
	addDoc,
	deleteDoc,
	updateDoc,
	doc,
	query,
	onSnapshot,
	Timestamp,
	increment,
	type UpdateData,
} from 'firebase/firestore';
import { Account } from '@/types';
import { normalizeAccount } from '@/features/accounts/models/AccountModel';

export const useAccounts = () => {
	const [accounts, setAccounts] = useState<Account[]>([]);
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
			setAccounts([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const col = collection(db, 'users', user.uid, 'accounts');
		const q = query(col);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetched = snapshot.docs.map((d) =>
				normalizeAccount({ id: d.id, ...d.data() })
			);
			setAccounts(fetched);
			setLoading(false);
		}, (error) => {
			console.error('Error fetching accounts:', error);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const addAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'userId'>) => {
		if (!user) throw new Error('User not authenticated');

		const col = collection(db, 'users', user.uid, 'accounts');
		await addDoc(col, {
			...account,
			userId: user.uid,
			createdAt: Timestamp.now(),
		});
	};

	const updateAccount = async (id: string, updates: Partial<Account>) => {
		if (!user) throw new Error('User not authenticated');
		const ref = doc(db, 'users', user.uid, 'accounts', id);
		await updateDoc(ref, updates as UpdateData<Account>);
	};

	const deleteAccount = async (id: string) => {
		if (!user) throw new Error('User not authenticated');
		const ref = doc(db, 'users', user.uid, 'accounts', id);
		await deleteDoc(ref);
	};

	const updateBalance = async (accountId: string, delta: number) => {
		if (!user) throw new Error('User not authenticated');
		const ref = doc(db, 'users', user.uid, 'accounts', accountId);
		await updateDoc(ref, { balance: increment(delta) });
	};

	return {
		accounts,
		addAccount,
		updateAccount,
		deleteAccount,
		updateBalance,
		loading,
	};
};
