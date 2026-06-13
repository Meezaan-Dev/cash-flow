import { Budget } from '@/types';
import { getBudgetCycleDateRange } from '@/domains/budgets/models/BudgetModel';

type BudgetLabels = Pick<Budget, 'categoryId' | 'subCategoryId'>;

export const getBudgetTitle = (
	budget: BudgetLabels,
	getCategoryLabel: (categoryId: string) => string,
	getSubcategoryLabel: (
		categoryId: string,
		subCategoryId?: string
	) => string
): string => {
	const categoryLabel = getCategoryLabel(budget.categoryId);
	if (!budget.subCategoryId) return categoryLabel;

	return `${categoryLabel} · ${getSubcategoryLabel(
		budget.categoryId,
		budget.subCategoryId
	)}`;
};

const formatDate = (
	value: string,
	options: Intl.DateTimeFormatOptions
): string =>
	new Date(`${value}T12:00:00`)
		.toLocaleDateString('en-ZA', options)
		.replace(/^0/, '');

export const getBudgetPeriodLabel = (
	budget: Pick<
		Budget,
		| 'period'
		| 'month'
		| 'cycleDay'
		| 'startDay'
		| 'startDate'
		| 'endDate'
	>,
	referenceDate = new Date()
): string => {
	if (budget.period === 'monthly' && budget.month) {
		return formatDate(`${budget.month}-01`, {
			month: 'long',
			year: 'numeric',
		});
	}

	const cycleDay = budget.cycleDay ?? budget.startDay;
	if (cycleDay) {
		const range = getBudgetCycleDateRange(cycleDay, referenceDate);
		const startLabel = formatDate(range.startDate, {
			day: 'numeric',
			month: 'short',
		});
		const endLabel = formatDate(range.endDate, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
		return `${startLabel} – ${endLabel}`;
	}

	const sameYear = budget.startDate.slice(0, 4) === budget.endDate.slice(0, 4);
	const startLabel = formatDate(budget.startDate, {
		day: 'numeric',
		month: 'short',
		...(sameYear ? {} : { year: 'numeric' }),
	});
	const endLabel = formatDate(budget.endDate, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});

	return `${startLabel} – ${endLabel}`;
};

export const getBudgetScopeHelp = (
	budget: BudgetLabels,
	getCategoryLabel: (categoryId: string) => string
): string | null =>
	budget.subCategoryId
		? null
		: `Tracks all ${getCategoryLabel(budget.categoryId)} expenses`;
