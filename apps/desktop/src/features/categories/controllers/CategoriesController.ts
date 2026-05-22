import { useCategories } from '@/features/categories/hooks/useCategories';
import { Category, CategoryDefinition } from '@/types';

interface CategoriesControllerReturn {
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

export const useCategoriesController = (): CategoriesControllerReturn => {
	const {
		categories,
		categoryOptions,
		categoryLabelMap,
		loading,
		getCategoryLabel,
		getSubcategoryLabel,
		getCategoryPathLabel,
		addCategory,
		renameCategory,
		deleteCategory,
		addSubcategory,
		renameSubcategory,
		deleteSubcategory,
	} = useCategories();

	return {
		categories,
		categoryOptions,
		categoryLabelMap,
		loading,
		getCategoryLabel,
		getSubcategoryLabel,
		getCategoryPathLabel,
		addCategory,
		renameCategory,
		deleteCategory,
		addSubcategory,
		renameSubcategory,
		deleteSubcategory,
	};
};
