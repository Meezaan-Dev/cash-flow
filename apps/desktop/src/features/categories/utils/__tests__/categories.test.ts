import {
	buildCategoryPathOptions,
	getCategoryPathLabel,
	getSubcategoryLabel,
	normalizeCategoryDefinition,
	normalizeCategoryOptions,
} from '../categories';

describe('category utilities', () => {
	it('normalizes subcategories on category definitions', () => {
		const category = normalizeCategoryDefinition({
			id: 'food-id',
			value: 'food',
			label: 'Food',
			subcategories: [
				{ value: 'takeaways_eating_out', label: 'Takeaways / Eating Out' },
				{ value: 'groceries', label: 'Groceries' },
				{ value: '', label: '' },
			],
		});

		expect(category.subcategories).toEqual([
			{ value: 'groceries', label: 'Groceries' },
			{ value: 'takeaways_eating_out', label: 'Takeaways / Eating Out' },
		]);
	});

	it('formats main category and subcategory labels together', () => {
		const categories = [
			{
				id: 'food-id',
				value: 'food',
				label: 'Food',
				subcategories: [{ value: 'groceries', label: 'Groceries' }],
			},
		];

		expect(getSubcategoryLabel(categories, 'food', 'groceries')).toBe('Groceries');
		expect(getCategoryPathLabel(categories, 'food', 'groceries')).toBe(
			'Food / Groceries'
		);
		expect(getCategoryPathLabel(categories, 'food')).toBe('Food');
	});

	it('deduplicates category options by value', () => {
		expect(
			normalizeCategoryOptions([
				{ value: 'groceries', label: 'Groceries' },
				{ value: 'groceries', label: 'Duplicate Groceries' },
			])
		).toEqual([{ value: 'groceries', label: 'Duplicate Groceries' }]);
	});

	it('builds category and subcategory path options for quick editing', () => {
		expect(
			buildCategoryPathOptions([
				{
					value: 'food',
					label: 'Food',
					subcategories: [
						{ value: 'groceries', label: 'Groceries' },
						{ value: 'takeaways_eating_out', label: 'Takeaways / Eating Out' },
					],
				},
				{
					value: 'transfer',
					label: 'Transfer',
					subcategories: [],
				},
			])
		).toEqual([
			{
				value: 'food',
				category: 'food',
				label: 'Food',
			},
			{
				value: 'food/groceries',
				category: 'food',
				subcategory: 'groceries',
				label: 'Food / Groceries',
			},
			{
				value: 'food/takeaways_eating_out',
				category: 'food',
				subcategory: 'takeaways_eating_out',
				label: 'Food / Takeaways / Eating Out',
			},
		]);
	});
});
