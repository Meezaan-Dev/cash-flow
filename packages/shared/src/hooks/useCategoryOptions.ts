import { useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp, addDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { CategoryDefinition } from '../types';
import {
	buildCategoryLabelMap,
	getCategoryPathLabel,
	getDefaultCategories,
	normalizeCategoryDefinition,
} from '../categories/categories';

export const useCategoryOptions = () => {
	const [categories, setCategories] = useState<CategoryDefinition[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(() => auth.currentUser);
	const seededUsersRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			setUser(firebaseUser);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!user) {
			setCategories([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const categoriesRef = collection(db, 'users', user.uid, 'categories');
		const unsubscribe = onSnapshot(
			query(categoriesRef),
			async (snapshot) => {
				if (snapshot.empty && !seededUsersRef.current.has(user.uid)) {
					seededUsersRef.current.add(user.uid);
					await Promise.all(
						getDefaultCategories().map((category) =>
							addDoc(categoriesRef, {
								...category,
								createdAt: Timestamp.now(),
								updatedAt: Timestamp.now(),
							})
						)
					);
					return;
				}

				setCategories(
					snapshot.docs
						.map((categoryDoc) =>
							normalizeCategoryDefinition({
								id: categoryDoc.id,
								...categoryDoc.data(),
							})
						)
						.sort((left, right) => left.label.localeCompare(right.label))
				);
				setLoading(false);
			},
			(error) => {
				console.error('Error fetching categories:', error);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	const categoryOptions = useMemo(
		() => categories.map(({ label, value }) => ({ label, value })),
		[categories]
	);

	const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories), [categories]);

	return {
		categories,
		categoryOptions,
		categoryLabelMap,
		getCategoryPathLabel: (category: string, subcategory?: string) =>
			getCategoryPathLabel(categories, category, subcategory),
		loading,
	};
};
