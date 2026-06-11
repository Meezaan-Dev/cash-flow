import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiDollarSign, FiTarget } from 'react-icons/fi';
import { useBudgetsContext } from '@/domains/budgets/context/BudgetsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { Budget } from '@/types';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import {
	SidePanelClose,
	SidePanelContent,
	SidePanelDescription,
	SidePanelTitle,
} from '@/components/app/ui/side-panel';
import {
	getMonthDateRange,
	isDuplicateBudget,
	MAX_BUDGETS,
} from '@/domains/budgets/models/BudgetModel';
import {
	getBudgetScopeHelp,
	getBudgetTitle,
} from '@/domains/budgets/views/budgetDisplay';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/app/ui/use-toast';

interface BudgetFormProps {
	onClose: () => void;
	budget?: Budget;
	defaultMonth: string;
}

const NO_SUBCATEGORY = '__no_subcategory__';

const FieldError: React.FC<{ children?: string }> = ({ children }) =>
	children ? <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{children}</p> : null;

const BudgetForm: React.FC<BudgetFormProps> = ({
	onClose,
	budget,
	defaultMonth,
}) => {
	const { budgets, addBudget, updateBudget } = useBudgetsContext();
	const { toast } = useToast();
	const {
		categories,
		getCategoryLabel,
		getSubcategoryLabel,
	} = useCategoriesContext();
	const [period, setPeriod] = useState<Budget['period']>('monthly');
	const [month, setMonth] = useState(defaultMonth);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [subCategoryId, setSubCategoryId] = useState(NO_SUBCATEGORY);
	const [amount, setAmount] = useState('');
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const selectedCategory = useMemo(
		() => categories.find((category) => category.value === categoryId),
		[categories, categoryId]
	);
	const previewBudget = {
		categoryId,
		subCategoryId:
			subCategoryId === NO_SUBCATEGORY ? undefined : subCategoryId,
	};
	const previewTitle = categoryId
		? getBudgetTitle(previewBudget, getCategoryLabel, getSubcategoryLabel)
		: 'Choose a category';
	const scopeHelp = categoryId
		? getBudgetScopeHelp(previewBudget, getCategoryLabel)
		: null;

	useEffect(() => {
		const initialPeriod = budget?.period ?? 'monthly';
		const initialMonth = budget?.month ?? defaultMonth;
		const monthlyRange = getMonthDateRange(initialMonth);
		setPeriod(initialPeriod);
		setMonth(initialMonth);
		setStartDate(budget?.startDate ?? monthlyRange.startDate);
		setEndDate(budget?.endDate ?? monthlyRange.endDate);
		setCategoryId(budget?.categoryId ?? '');
		setSubCategoryId(budget?.subCategoryId ?? NO_SUBCATEGORY);
		setAmount(budget ? String(budget.amount) : '');
		setFormError('');
		setFieldErrors({});
	}, [budget, defaultMonth]);

	const handleMonthChange = (value: string) => {
		setMonth(value);
		const range = getMonthDateRange(value);
		setStartDate(range.startDate);
		setEndDate(range.endDate);
	};

	const handleCategoryChange = (value: string) => {
		setCategoryId(value);
		setSubCategoryId(NO_SUBCATEGORY);
		setFieldErrors((current) => ({ ...current, category: '' }));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const numericAmount = Number(amount);
		const finalRange =
			period === 'monthly' ? getMonthDateRange(month) : { startDate, endDate };
		const finalSubCategoryId =
			subCategoryId === NO_SUBCATEGORY ? undefined : subCategoryId;
		const nextErrors: Record<string, string> = {};

		if (!budget && budgets.length >= MAX_BUDGETS) {
			setFormError(`You can create up to ${MAX_BUDGETS} budgets.`);
			return;
		}
		if (!categoryId) nextErrors.category = 'Choose a category.';
		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			nextErrors.amount = 'Enter an amount greater than zero.';
		}
		if (!finalRange.startDate || !finalRange.endDate) {
			nextErrors.period = 'Choose a start and end date.';
		} else if (finalRange.startDate > finalRange.endDate) {
			nextErrors.period = 'End date must be on or after the start date.';
		}
		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors);
			return;
		}
		if (
			isDuplicateBudget(
				budgets,
				{
					accountId: budget?.accountId,
					categoryId,
					subCategoryId: finalSubCategoryId,
					startDate: finalRange.startDate,
					endDate: finalRange.endDate,
				},
				budget?.id
			)
		) {
			setFormError('A budget already exists for this category and period.');
			return;
		}

		setSaving(true);
		setFormError('');
		setFieldErrors({});
		try {
			const data = {
				accountId: budget?.accountId,
				categoryId,
				subCategoryId: finalSubCategoryId,
				amount: numericAmount,
				period,
				month: period === 'monthly' ? month : undefined,
				startDate: finalRange.startDate,
				endDate: finalRange.endDate,
				lifecycleStatus: budget?.lifecycleStatus ?? ('draft' as const),
			};
			if (budget) {
				await updateBudget(budget.id, data);
			} else {
				await addBudget(data);
			}
			toast({
				title: budget ? 'Budget updated' : 'Budget draft created',
				description: budget
					? `${previewTitle} was updated successfully.`
					: `${previewTitle} is ready for review and publishing.`,
				duration: 3500,
			});
			onClose();
		} catch (saveError) {
			setFormError(
				saveError instanceof Error
					? saveError.message
					: 'Failed to save budget. Please try again.'
			);
		} finally {
			setSaving(false);
		}
	};

	const sectionClass =
		'rounded-2xl border border-border bg-card p-5 text-card-foreground';
	const inputClass = 'h-11 rounded-xl border-border bg-background';

	return (
		<SidePanelContent>
			<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
				<header className="border-b border-border bg-muted/30 px-6 py-6 pr-16">
					<p className="text-xs font-semibold uppercase tracking-wider text-primary">
						{budget ? 'Update budget' : 'New draft'}
					</p>
					<SidePanelTitle className="mt-2 text-2xl font-semibold tracking-tight">
						{budget ? 'Edit budget' : 'Create a budget'}
					</SidePanelTitle>
					<SidePanelDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Set the spending goal, amount, and period. New budgets stay in draft
						until published.
					</SidePanelDescription>
				</header>

				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4 sm:p-6">
					{formError && (
						<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
							{formError}
						</div>
					)}

					<div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
								<FiTarget className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium uppercase tracking-wider text-primary">
									Budget preview
								</p>
								<p className="mt-1 truncate text-xl font-semibold text-gray-950 dark:text-white">
									{previewTitle}
								</p>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									{scopeHelp ?? 'Tracks expenses for this specific sub-category'}
								</p>
							</div>
						</div>
					</div>

					<section className={sectionClass}>
						<div className="mb-4 flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<FiTarget className="h-4 w-4" />
							</div>
							<div>
								<h2 className="font-semibold">What are you budgeting?</h2>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Choose a category, then optionally narrow the goal.
								</p>
							</div>
						</div>
						<div className="space-y-4">
							<div>
								<label className="mb-1.5 block text-sm font-medium">Category</label>
								<Select value={categoryId} onValueChange={handleCategoryChange}>
									<SelectTrigger className={inputClass}>
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										{categories.map((category) => (
											<SelectItem key={category.id} value={category.value}>
												{category.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError>{fieldErrors.category}</FieldError>
							</div>

							<div>
								<label className="mb-1.5 block text-sm font-medium">
									Sub-category <span className="font-normal text-gray-400">(optional)</span>
								</label>
								<Select
									value={subCategoryId}
									onValueChange={setSubCategoryId}
									disabled={!selectedCategory}
								>
									<SelectTrigger className={inputClass}>
										<SelectValue placeholder="No sub-category" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_SUBCATEGORY}>No sub-category</SelectItem>
										{selectedCategory?.subcategories.map((subcategory) => (
											<SelectItem key={subcategory.value} value={subcategory.value}>
												{subcategory.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{scopeHelp && (
									<p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
										{scopeHelp}
									</p>
								)}
							</div>
						</div>
					</section>

					<section className={sectionClass}>
						<div className="mb-4 flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<FiDollarSign className="h-4 w-4" />
							</div>
							<div>
								<h2 className="font-semibold">How much?</h2>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Set the maximum planned spend in ZAR.
								</p>
							</div>
						</div>
						<label htmlFor="budget-amount" className="mb-1.5 block text-sm font-medium">
							Budget amount
						</label>
						<div className="relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
								R
							</span>
							<Input
								id="budget-amount"
								type="number"
								step="0.01"
								min="0.01"
								value={amount}
								onChange={(event) => {
									setAmount(event.target.value);
									setFieldErrors((current) => ({ ...current, amount: '' }));
								}}
								placeholder="1 500"
								className={cn(inputClass, 'pl-8 text-base')}
								required
							/>
						</div>
						<FieldError>{fieldErrors.amount}</FieldError>
					</section>

					<section className={sectionClass}>
						<div className="mb-4 flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<FiCalendar className="h-4 w-4" />
							</div>
							<div>
								<h2 className="font-semibold">For when?</h2>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Use a calendar month or set exact dates.
								</p>
							</div>
						</div>
						<div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
							{(['monthly', 'custom'] as const).map((value) => (
								<button
									key={value}
									type="button"
									onClick={() => setPeriod(value)}
									className={cn(
										'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
										period === value
											? 'bg-background text-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'
									)}
								>
									{value === 'monthly' ? 'Monthly' : 'Custom dates'}
								</button>
							))}
						</div>

						{period === 'monthly' ? (
							<div>
								<label htmlFor="budget-month" className="mb-1.5 block text-sm font-medium">
									Month
								</label>
								<Input
									id="budget-month"
									type="month"
									value={month}
									onChange={(event) => handleMonthChange(event.target.value)}
									className={inputClass}
									required
								/>
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label htmlFor="budget-start" className="mb-1.5 block text-sm font-medium">
										Start date
									</label>
									<Input
										id="budget-start"
										type="date"
										value={startDate}
										onChange={(event) => setStartDate(event.target.value)}
										className={inputClass}
										required
									/>
								</div>
								<div>
									<label htmlFor="budget-end" className="mb-1.5 block text-sm font-medium">
										End date
									</label>
									<Input
										id="budget-end"
										type="date"
										value={endDate}
										onChange={(event) => setEndDate(event.target.value)}
										className={inputClass}
										required
									/>
								</div>
							</div>
						)}
						<FieldError>{fieldErrors.period}</FieldError>
					</section>
				</div>

				<footer className="sticky bottom-0 flex gap-3 border-t border-border bg-background px-4 py-4 sm:px-6">
					<SidePanelClose asChild>
						<Button type="button" variant="outline" className="h-11 flex-1 rounded-xl">
							Cancel
						</Button>
					</SidePanelClose>
					<Button type="submit" className="h-11 flex-[1.4] rounded-xl" disabled={saving}>
						{saving ? 'Saving...' : budget ? 'Update budget' : 'Save draft'}
					</Button>
				</footer>
			</form>
		</SidePanelContent>
	);
};

export default BudgetForm;
