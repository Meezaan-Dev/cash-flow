import React, { createContext, ReactNode, useContext } from 'react';
import { useCategoriesController } from '@/features/categories/controllers/CategoriesController';
import { Category, CategoryDefinition } from '@/types';

interface CategoriesContextValue {
	categories: CategoryDefinition[];
	categoryOptions: Category[];
	categoryLabelMap: Record<string, string>;
	loading: boolean;
	getCategoryLabel: (value: string) => string;
	getSubcategoryLabel: (categoryValue: string, subcategoryValue?: string) => string;
	getCategoryPathLabel: (categoryValue: string, subcategoryValue?: string) => string;
	addCategory: (label: string) => Promise<void>;
	renameCategory: (id: string, label: string) => Promise<void>;
	deleteCategory: (id: string) => Promise<void>;
	addSubcategory: (categoryId: string, label: string) => Promise<void>;
	renameSubcategory: (categoryId: string, value: string, label: string) => Promise<void>;
	deleteSubcategory: (categoryId: string, value: string) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

export const CategoriesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const controller = useCategoriesController();

	return (
		<CategoriesContext.Provider value={controller}>
			{children}
		</CategoriesContext.Provider>
	);
};

export const useCategoriesContext = (): CategoriesContextValue => {
	const context = useContext(CategoriesContext);

	if (!context) {
		throw new Error('useCategoriesContext must be used within a CategoriesProvider');
	}

	return context;
};
