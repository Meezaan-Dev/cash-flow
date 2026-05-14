import { Category, CategoryDefinition } from '@/types';
import { DEFAULT_CATEGORY_TEMPLATES, TRANSFER_CATEGORY_VALUE } from '@/features/categories/constants/categories';
import { parseDbDateOrNull } from '@/utils/date';

export interface CategoryPathOption {
	value: string;
	category: string;
	subcategory?: string;
	label: string;
}

export const slugifyCategoryLabel = (label: string): string =>
	label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

export const formatCategoryLabel = (value: string): string =>
	value
		.split('_')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

type CategoryDoc = {
	id: string;
	value?: string;
	label?: string;
	subcategories?: unknown;
	createdAt?: unknown;
	updatedAt?: unknown;
};

const normalizeCategoryOption = (option: unknown): Category | null => {
	if (!option || typeof option !== 'object') return null;

	const value = 'value' in option ? String(option.value ?? '') : '';
	const label = 'label' in option ? String(option.label ?? '') : '';
	const normalizedValue = value || slugifyCategoryLabel(label);

	if (!normalizedValue) return null;

	return {
		value: normalizedValue,
		label: label || formatCategoryLabel(normalizedValue),
	};
};

export const normalizeCategoryOptions = (options: unknown): Category[] => {
	if (!Array.isArray(options)) return [];

	const merged = new Map<string, Category>();

	for (const option of options) {
		const normalized = normalizeCategoryOption(option);
		if (!normalized || normalized.value === TRANSFER_CATEGORY_VALUE) continue;
		merged.set(normalized.value, normalized);
	}

	return Array.from(merged.values()).sort((left, right) =>
		left.label.localeCompare(right.label)
	);
};

export const normalizeCategoryDefinition = (doc: CategoryDoc): CategoryDefinition => {
	const category: CategoryDefinition = {
		id: doc.id,
		value: doc.value ?? doc.id,
		label: doc.label ?? formatCategoryLabel(doc.value ?? doc.id ?? ''),
		subcategories: normalizeCategoryOptions(doc.subcategories),
	};

	const createdParsed = doc.createdAt != null ? parseDbDateOrNull(doc.createdAt) : null;
	if (createdParsed) {
		category.createdAt = createdParsed;
	}

	const updatedParsed = doc.updatedAt != null ? parseDbDateOrNull(doc.updatedAt) : null;
	if (updatedParsed) {
		category.updatedAt = updatedParsed;
	}

	return category;
};

export const toCategoryOption = (category: Pick<CategoryDefinition, 'value' | 'label'>): Category => ({
	value: category.value,
	label: category.label,
});

export const mergeCategoryOptions = (
	categories: Pick<CategoryDefinition, 'value' | 'label'>[],
	extraValues: string[] = []
): Category[] => {
	const merged = new Map<string, Category>();

	for (const category of categories) {
		if (category.value === TRANSFER_CATEGORY_VALUE) continue;
		merged.set(category.value, toCategoryOption(category));
	}

	for (const value of extraValues) {
		if (!value || value === TRANSFER_CATEGORY_VALUE || merged.has(value)) continue;
		merged.set(value, {
			value,
			label: formatCategoryLabel(value),
		});
	}

	return Array.from(merged.values()).sort((left, right) =>
		left.label.localeCompare(right.label)
	);
};

export const buildCategoryLabelMap = (
	categories: Pick<CategoryDefinition, 'value' | 'label'>[]
): Record<string, string> =>
	Object.fromEntries(
		categories
			.filter((category) => category.value !== TRANSFER_CATEGORY_VALUE)
			.map((category) => [category.value, category.label])
		);

export const getSubcategoryLabel = (
	categories: Pick<CategoryDefinition, 'value' | 'subcategories'>[],
	categoryValue: string,
	subcategoryValue?: string
): string => {
	if (!subcategoryValue) return '';

	const category = categories.find((item) => item.value === categoryValue);
	const subcategory = category?.subcategories.find((item) => item.value === subcategoryValue);

	return subcategory?.label ?? formatCategoryLabel(subcategoryValue);
};

export const getCategoryPathLabel = (
	categories: Pick<CategoryDefinition, 'value' | 'label' | 'subcategories'>[],
	categoryValue: string,
	subcategoryValue?: string
): string => {
	const categoryLabel =
		categories.find((item) => item.value === categoryValue)?.label ??
		formatCategoryLabel(categoryValue);
	const subcategoryLabel = getSubcategoryLabel(categories, categoryValue, subcategoryValue);

	return subcategoryLabel ? `${categoryLabel} / ${subcategoryLabel}` : categoryLabel;
};

export const buildCategoryPathOptions = (
	categories: Pick<CategoryDefinition, 'value' | 'label' | 'subcategories'>[]
): CategoryPathOption[] =>
	categories
		.filter((category) => category.value !== TRANSFER_CATEGORY_VALUE)
		.flatMap((category) => {
			const categoryOption: CategoryPathOption = {
				value: category.value,
				category: category.value,
				label: category.label,
			};

			const subcategoryOptions = category.subcategories.map((subcategory) => ({
				value: `${category.value}/${subcategory.value}`,
				category: category.value,
				subcategory: subcategory.value,
				label: `${category.label} / ${subcategory.label}`,
			}));

			return [categoryOption, ...subcategoryOptions];
		});

export const getDefaultCategories = (): Array<Pick<CategoryDefinition, 'value' | 'label' | 'subcategories'>> =>
	DEFAULT_CATEGORY_TEMPLATES.map((category) => ({
		...category,
		subcategories: category.subcategories?.map((subcategory) => ({ ...subcategory })) ?? [],
	}));
