import { CategoryDefinition } from '@/types';

export const TRANSFER_CATEGORY_VALUE = 'transfer';

export const DEFAULT_CATEGORY_TEMPLATES: Array<
	Pick<CategoryDefinition, 'value' | 'label'> & Partial<Pick<CategoryDefinition, 'subcategories'>>
> = [
	{ value: 'personal', label: 'Personal' },
	{ value: 'cash_withdrawal', label: 'Cash Withdrawal' },
	{ value: 'other', label: 'Other' },
	{ value: 'debit_order', label: 'Debit Order' },
	{ value: 'travel', label: 'Travel' },
	{
		value: 'food',
		label: 'Food',
		subcategories: [
			{ value: 'groceries', label: 'Groceries' },
			{ value: 'takeaways_eating_out', label: 'Takeaways / Eating Out' },
		],
	},
	{ value: 'entertainment', label: 'Entertainment' },
];
