import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Timestamp,
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	onSnapshot,
	query,
	updateDoc,
	where,
	writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { CategoryDefinition } from '@/types';
import { TRANSFER_CATEGORY_VALUE } from '@/domains/categories/constants/categories';
import {
	buildCategoryLabelMap,
	formatCategoryLabel,
	getCategoryPathLabel as getCategoryPathLabelFromDefinitions,
	getDefaultCategories,
	getSubcategoryLabel as getSubcategoryLabelFromDefinitions,
	mergeCategoryOptions,
	normalizeCategoryDefinition,
	slugifyCategoryLabel,
} from '@/domains/categories/utils/categories';

const USERS_COLLECTION = 'users';

const chunkArray = <T,>(items: T[], size: number): T[][] => {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
};

export const useCategories = () => {
	const [categories, setCategories] = useState<CategoryDefinition[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<typeof auth.currentUser | null>(null);
	const [authReady, setAuthReady] = useState(false);
	const seededUsersRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			setUser(firebaseUser);
			setAuthReady(true);
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!authReady) return;
		if (!user) {
			setCategories([]);
			setLoading(false);
			return;
		}

		setLoading(true);

		const categoriesRef = collection(db, USERS_COLLECTION, user.uid, 'categories');
		const unsubscribe = onSnapshot(
			query(categoriesRef),
			async (snapshot) => {
				if (
					snapshot.empty &&
					!seededUsersRef.current.has(user.uid)
				) {
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

				const normalized = snapshot.docs
					.map((categoryDoc) =>
						normalizeCategoryDefinition({ id: categoryDoc.id, ...categoryDoc.data() })
					)
					.sort((left, right) => left.label.localeCompare(right.label));

				setCategories(normalized);
				setLoading(false);
			},
			(error) => {
				console.error('Error fetching categories:', error);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user, authReady]);

	const ensureAuthenticated = () => {
		if (!user) throw new Error('User not authenticated');
	};

	const getSanitizedCategoryPayload = (label: string) => {
		const trimmedLabel = label.trim();
		const value = slugifyCategoryLabel(trimmedLabel);

		if (!trimmedLabel) {
			throw new Error('Category name cannot be empty.');
		}

		if (!value) {
			throw new Error('Category name must include at least one letter or number.');
		}

		if (value === TRANSFER_CATEGORY_VALUE) {
			throw new Error('Transfer is reserved and cannot be used as a category.');
		}

		return {
			label: trimmedLabel,
			value,
		};
	};

	const getSanitizedSubcategoryPayload = (label: string) => {
		const trimmedLabel = label.trim();
		const value = slugifyCategoryLabel(trimmedLabel);

		if (!trimmedLabel) {
			throw new Error('Subcategory name cannot be empty.');
		}

		if (!value) {
			throw new Error('Subcategory name must include at least one letter or number.');
		}

		if (value === TRANSFER_CATEGORY_VALUE) {
			throw new Error('Transfer is reserved and cannot be used as a subcategory.');
		}

		return {
			label: trimmedLabel,
			value,
		};
	};

	const assertCategoryIsUnique = (value: string, categoryIdToIgnore?: string) => {
		const conflict = categories.find(
			(category) =>
				category.id !== categoryIdToIgnore &&
				category.value.toLowerCase() === value.toLowerCase()
		);

		if (conflict) {
			throw new Error(`"${conflict.label}" already exists.`);
		}
	};

	const assertSubcategoryIsUnique = (
		category: CategoryDefinition,
		value: string,
		subcategoryValueToIgnore?: string
	) => {
		const conflict = category.subcategories.find(
			(subcategory) =>
				subcategory.value !== subcategoryValueToIgnore &&
				subcategory.value.toLowerCase() === value.toLowerCase()
		);

		if (conflict) {
			throw new Error(`"${conflict.label}" already exists under ${category.label}.`);
		}
	};

	const addCategory = async (label: string) => {
		ensureAuthenticated();

		const payload = getSanitizedCategoryPayload(label);
		assertCategoryIsUnique(payload.value);

		await addDoc(collection(db, USERS_COLLECTION, user!.uid, 'categories'), {
			...payload,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
		});
	};

	const renameCategory = async (id: string, label: string) => {
		ensureAuthenticated();

		const category = categories.find((item) => item.id === id);
		if (!category) {
			throw new Error('Category not found.');
		}

		const payload = getSanitizedCategoryPayload(label);
		assertCategoryIsUnique(payload.value, id);

		if (category.value === payload.value && category.label === payload.label) {
			return;
		}

		const transactionsRef = collection(db, USERS_COLLECTION, user!.uid, 'transactions');
		const recurringRef = collection(
			db,
			USERS_COLLECTION,
			user!.uid,
			'recurringTransactions'
		);
		const budgetsRef = collection(db, USERS_COLLECTION, user!.uid, 'budgets');

		const [transactionDocs, recurringDocs, budgetDocs, legacyBudgetDocs] = await Promise.all([
			getDocs(query(transactionsRef, where('category', '==', category.value))),
			getDocs(query(recurringRef, where('category', '==', category.value))),
			getDocs(query(budgetsRef, where('categoryId', '==', category.value))),
			getDocs(query(budgetsRef, where('category', '==', category.value))),
		]);

		const allRefs = [
			...transactionDocs.docs.map((docRef) => docRef.ref),
			...recurringDocs.docs.map((docRef) => docRef.ref),
			...budgetDocs.docs.map((docRef) => docRef.ref),
			...legacyBudgetDocs.docs.map((docRef) => docRef.ref),
		];

		const categoryRef = doc(db, USERS_COLLECTION, user!.uid, 'categories', id);
		const refChunks = chunkArray(allRefs, 400);

		if (refChunks.length === 0) {
			await updateDoc(categoryRef, {
				...payload,
				updatedAt: Timestamp.now(),
			});
			return;
		}

		for (let index = 0; index < refChunks.length; index += 1) {
			const batch = writeBatch(db);
			const chunk = refChunks[index];

			if (index === 0) {
				batch.update(categoryRef, {
					...payload,
					updatedAt: Timestamp.now(),
				});
			}

			for (const ref of chunk) {
				if (ref.parent.id === 'budgets') {
					batch.update(ref, { categoryId: payload.value });
				} else {
					batch.update(ref, { category: payload.value });
				}
			}

			await batch.commit();
		}
	};

	const deleteCategory = async (id: string) => {
		ensureAuthenticated();

		const category = categories.find((item) => item.id === id);
		if (!category) {
			throw new Error('Category not found.');
		}

		const transactionsRef = collection(db, USERS_COLLECTION, user!.uid, 'transactions');
		const recurringRef = collection(
			db,
			USERS_COLLECTION,
			user!.uid,
			'recurringTransactions'
		);
		const budgetsRef = collection(db, USERS_COLLECTION, user!.uid, 'budgets');

		const [transactionDocs, recurringDocs, budgetDocs, legacyBudgetDocs] = await Promise.all([
			getDocs(query(transactionsRef, where('category', '==', category.value))),
			getDocs(query(recurringRef, where('category', '==', category.value))),
			getDocs(query(budgetsRef, where('categoryId', '==', category.value))),
			getDocs(query(budgetsRef, where('category', '==', category.value))),
		]);

		const usageCount =
			transactionDocs.size +
			recurringDocs.size +
			budgetDocs.size +
			legacyBudgetDocs.size;

		if (usageCount > 0) {
			throw new Error(
				`"${category.label}" is still in use and cannot be deleted yet.`
			);
		}

		await deleteDoc(doc(db, USERS_COLLECTION, user!.uid, 'categories', id));
	};

	const addSubcategory = async (categoryId: string, label: string) => {
		ensureAuthenticated();

		const category = categories.find((item) => item.id === categoryId);
		if (!category) {
			throw new Error('Category not found.');
		}

		const payload = getSanitizedSubcategoryPayload(label);
		assertSubcategoryIsUnique(category, payload.value);

		await updateDoc(doc(db, USERS_COLLECTION, user!.uid, 'categories', categoryId), {
			subcategories: [...category.subcategories, payload].sort((left, right) =>
				left.label.localeCompare(right.label)
			),
			updatedAt: Timestamp.now(),
		});
	};

	const renameSubcategory = async (categoryId: string, value: string, label: string) => {
		ensureAuthenticated();

		const category = categories.find((item) => item.id === categoryId);
		if (!category) {
			throw new Error('Category not found.');
		}

		const subcategory = category.subcategories.find((item) => item.value === value);
		if (!subcategory) {
			throw new Error('Subcategory not found.');
		}

		const payload = getSanitizedSubcategoryPayload(label);
		assertSubcategoryIsUnique(category, payload.value, value);

		if (subcategory.value === payload.value && subcategory.label === payload.label) {
			return;
		}

		const transactionsRef = collection(db, USERS_COLLECTION, user!.uid, 'transactions');
		const recurringRef = collection(
			db,
			USERS_COLLECTION,
			user!.uid,
			'recurringTransactions'
		);
		const budgetsRef = collection(db, USERS_COLLECTION, user!.uid, 'budgets');

		const [transactionDocs, recurringDocs, budgetDocs] = await Promise.all([
			getDocs(query(transactionsRef, where('category', '==', category.value))),
			getDocs(query(recurringRef, where('category', '==', category.value))),
			getDocs(query(budgetsRef, where('categoryId', '==', category.value))),
		]);

		const allRefs = [
			...transactionDocs.docs
				.filter((docRef) => docRef.data().subcategory === subcategory.value)
				.map((docRef) => docRef.ref),
			...recurringDocs.docs
				.filter((docRef) => docRef.data().subcategory === subcategory.value)
				.map((docRef) => docRef.ref),
			...budgetDocs.docs
				.filter((docRef) => docRef.data().subCategoryId === subcategory.value)
				.map((docRef) => docRef.ref),
		];
		const categoryRef = doc(db, USERS_COLLECTION, user!.uid, 'categories', categoryId);
		const subcategories = category.subcategories
			.map((item) => (item.value === value ? payload : item))
			.sort((left, right) => left.label.localeCompare(right.label));
		const refChunks = chunkArray(allRefs, 400);

		if (refChunks.length === 0) {
			await updateDoc(categoryRef, {
				subcategories,
				updatedAt: Timestamp.now(),
			});
			return;
		}

		for (let index = 0; index < refChunks.length; index += 1) {
			const batch = writeBatch(db);
			const chunk = refChunks[index];

			if (index === 0) {
				batch.update(categoryRef, {
					subcategories,
					updatedAt: Timestamp.now(),
				});
			}

			for (const ref of chunk) {
				if (ref.parent.id === 'budgets') {
					batch.update(ref, { subCategoryId: payload.value });
				} else {
					batch.update(ref, { subcategory: payload.value });
				}
			}

			await batch.commit();
		}
	};

	const deleteSubcategory = async (categoryId: string, value: string) => {
		ensureAuthenticated();

		const category = categories.find((item) => item.id === categoryId);
		if (!category) {
			throw new Error('Category not found.');
		}

		const subcategory = category.subcategories.find((item) => item.value === value);
		if (!subcategory) {
			throw new Error('Subcategory not found.');
		}

		const transactionsRef = collection(db, USERS_COLLECTION, user!.uid, 'transactions');
		const recurringRef = collection(
			db,
			USERS_COLLECTION,
			user!.uid,
			'recurringTransactions'
		);
		const budgetsRef = collection(db, USERS_COLLECTION, user!.uid, 'budgets');

		const [transactionDocs, recurringDocs, budgetDocs] = await Promise.all([
			getDocs(query(transactionsRef, where('category', '==', category.value))),
			getDocs(query(recurringRef, where('category', '==', category.value))),
			getDocs(query(budgetsRef, where('categoryId', '==', category.value))),
		]);

		const usageCount =
			transactionDocs.docs.filter((docRef) => docRef.data().subcategory === subcategory.value)
				.length +
			recurringDocs.docs.filter((docRef) => docRef.data().subcategory === subcategory.value)
				.length +
			budgetDocs.docs.filter(
				(docRef) => docRef.data().subCategoryId === subcategory.value
			).length;

		if (usageCount > 0) {
			throw new Error(
				`"${subcategory.label}" is still in use and cannot be deleted yet.`
			);
		}

		await updateDoc(doc(db, USERS_COLLECTION, user!.uid, 'categories', categoryId), {
			subcategories: category.subcategories.filter((item) => item.value !== value),
			updatedAt: Timestamp.now(),
		});
	};

	const categoryOptions = useMemo(() => mergeCategoryOptions(categories), [categories]);
	const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories), [categories]);

	const getCategoryLabel = (value: string) =>
		categoryLabelMap[value] ?? formatCategoryLabel(value);

	const getSubcategoryLabel = (categoryValue: string, subcategoryValue?: string) =>
		getSubcategoryLabelFromDefinitions(categories, categoryValue, subcategoryValue);

	const getCategoryPathLabel = (categoryValue: string, subcategoryValue?: string) =>
		getCategoryPathLabelFromDefinitions(categories, categoryValue, subcategoryValue);

	return {
		categories,
		categoryOptions,
		categoryLabelMap,
		getCategoryLabel,
		getSubcategoryLabel,
		getCategoryPathLabel,
		addCategory,
		renameCategory,
		deleteCategory,
		addSubcategory,
		renameSubcategory,
		deleteSubcategory,
		loading,
	};
};
