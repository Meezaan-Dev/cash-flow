import React, { useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useBudgetsContext } from '@/domains/budgets/context/BudgetsContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import BudgetForm from '@/domains/budgets/views/BudgetForm';
import {
	budgetOverlapsMonth,
	calculateBudgetProgress,
	MAX_BUDGETS,
	sortBudgetsByDisplayOrder,
} from '@/domains/budgets/models/BudgetModel';
import {
	getBudgetPeriodLabel,
	getBudgetTitle,
} from '@/domains/budgets/views/budgetDisplay';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { EmptyState, SummaryCard, SummaryCardGrid } from '@/components/app/page-layout';
import { SensitiveText, SensitiveValue } from '@/app/privacy/SensitiveValue';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { modalShell } from '@/styles/marketingStyles';
import type { Budget } from '@/types';

interface PlanBudgetsTabProps {
	defaultMonth: string;
}

const PlanBudgetsTab: React.FC<PlanBudgetsTabProps> = ({ defaultMonth }) => {
	const { budgets, deleteBudget, publishBudget } = useBudgetsContext();
	const { transactions } = useTransactionsContext();
	const { getCategoryLabel, getSubcategoryLabel } = useCategoriesContext();
	const referenceDate = useCurrentDate();
	const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
	const [view, setView] = useState<'list' | 'form'>('list');
	const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
	const [budgetToDelete, setBudgetToDelete] = useState<Budget | undefined>();

	const orderedBudgets = useMemo(
		() => sortBudgetsByDisplayOrder(budgets),
		[budgets]
	);

	const monthProgress = useMemo(() => {
		const selectedMonthReferenceDate = new Date(`${selectedMonth}-15T12:00:00`);
		return orderedBudgets
			.filter((budget) => Boolean(budget.categoryId))
			.map((budget) =>
				calculateBudgetProgress(budget, transactions, selectedMonthReferenceDate)
			)
			.filter((item) => budgetOverlapsMonth(item.budget, selectedMonth));
	}, [orderedBudgets, referenceDate, selectedMonth, transactions]);

	const draftItems = monthProgress.filter(
		(item) => item.budget.lifecycleStatus === 'draft'
	);
	const publishedItems = monthProgress.filter(
		(item) => item.budget.lifecycleStatus === 'published'
	);

	const totals = useMemo(
		() => ({
			budgeted: publishedItems.reduce((sum, item) => sum + item.budget.amount, 0),
			spent: publishedItems.reduce((sum, item) => sum + item.spent, 0),
			remaining: publishedItems.reduce((sum, item) => sum + item.remaining, 0),
		}),
		[publishedItems]
	);

	const closeForm = () => {
		setView('list');
		setEditingBudget(undefined);
	};

	const openCreate = () => {
		setEditingBudget(undefined);
		setView('form');
	};

	const openEdit = (budget: Budget) => {
		setEditingBudget(budget);
		setView('form');
	};

	const confirmDelete = async () => {
		if (budgetToDelete) await deleteBudget(budgetToDelete.id);
		setBudgetToDelete(undefined);
	};

	const atBudgetLimit = budgets.length >= MAX_BUDGETS;

	if (view === 'form') {
		return (
			<section className="space-y-4">
				<button
					type="button"
					onClick={closeForm}
					className="text-sm font-medium text-muted-foreground hover:text-foreground"
				>
					← Back to budgets
				</button>
				<BudgetForm
					layout="page"
					budget={editingBudget}
					defaultMonth={selectedMonth}
					onClose={closeForm}
				/>
			</section>
		);
	}

	return (
		<section className="space-y-5">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<label htmlFor="plan-budget-month" className="mb-1.5 block text-sm font-medium">
						Month
					</label>
					<Input
						id="plan-budget-month"
						type="month"
						value={selectedMonth}
						onChange={(event) => setSelectedMonth(event.target.value)}
						className="h-11 w-full max-w-[12rem] rounded-xl"
					/>
				</div>
				<Button
					type="button"
					variant="marketing"
					onClick={openCreate}
					disabled={atBudgetLimit}
				>
					<FiPlus className="h-4 w-4" />
					Add budget
				</Button>
			</div>

			{atBudgetLimit && (
				<p className="text-sm text-muted-foreground">
					You have reached the maximum of {MAX_BUDGETS} budgets. Delete one to add another.
				</p>
			)}

			<SummaryCardGrid>
				<SummaryCard label="Budgeted" amount={totals.budgeted} />
				<SummaryCard label="Spent" amount={totals.spent} tone="expense" />
				<SummaryCard
					label="Remaining"
					amount={totals.remaining}
					tone={totals.remaining >= 0 ? 'balance-positive' : 'balance-negative'}
				/>
			</SummaryCardGrid>

			{monthProgress.length === 0 ? (
				<EmptyState
					title="No budgets this month"
					description="Add a budget to set spending limits for your categories."
				/>
			) : (
				<div className="divide-y rounded-2xl border bg-card dark:divide-gray-800">
					{draftItems.map((item) => {
						const title = getBudgetTitle(
							item.budget,
							getCategoryLabel,
							getSubcategoryLabel
						);
						return (
							<div
								key={item.budget.id}
								className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
							>
								<div className="min-w-0">
									<p className="font-semibold">
										<SensitiveText widthClassName="w-32">{title}</SensitiveText>
									</p>
									<p className="text-sm text-muted-foreground">
										Draft · {formatCurrency(item.budget.amount)} · not active until
										you publish
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button type="button" variant="outline" onClick={() => openEdit(item.budget)}>
										Edit
									</Button>
									<Button
										type="button"
										variant="marketing"
										onClick={() => publishBudget(item.budget.id)}
									>
										Activate
									</Button>
									<Button
										type="button"
										variant="ghost"
										className="text-red-600 hover:text-red-700 dark:text-red-400"
										onClick={() => setBudgetToDelete(item.budget)}
									>
										Delete
									</Button>
								</div>
							</div>
						);
					})}
					{publishedItems.map((item) => {
						const title = getBudgetTitle(
							item.budget,
							getCategoryLabel,
							getSubcategoryLabel
						);
						const usedPct = Math.min(Math.max(item.usedPercentage, 0), 100);
						const overBudget = item.remaining < 0;
						return (
							<div
								key={item.budget.id}
								className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
							>
								<div className="min-w-0 flex-1 sm:max-w-md">
									<p className="font-semibold">
										<SensitiveText widthClassName="w-32">{title}</SensitiveText>
									</p>
									<p className="mt-0.5 text-xs text-muted-foreground">
										{getBudgetPeriodLabel(item.budget, referenceDate)}
									</p>
									<div
										className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
										role="img"
										aria-label={`${Math.round(item.usedPercentage)} percent used`}
									>
										<div
											className={cn(
												'h-full rounded-full transition-all',
												overBudget ? 'bg-red-500' : 'bg-blue-500'
											)}
											style={{ width: `${usedPct}%` }}
										/>
									</div>
								</div>
								<div className="text-sm">
									<p className="font-medium">
										<SensitiveValue widthClassName="w-40">
											{formatCurrency(item.spent)} of {formatCurrency(item.budget.amount)}
										</SensitiveValue>
									</p>
									<p
										className={cn(
											'text-xs font-medium',
											overBudget
												? 'text-red-600 dark:text-red-400'
												: 'text-muted-foreground'
										)}
									>
										{overBudget
											? `${formatCurrency(Math.abs(item.remaining))} over`
											: `${formatCurrency(item.remaining)} left`}
									</p>
								</div>
								<div className="flex gap-2">
									<Button type="button" variant="outline" onClick={() => openEdit(item.budget)}>
										Edit
									</Button>
									<Button
										type="button"
										variant="ghost"
										className="text-red-600 hover:text-red-700 dark:text-red-400"
										onClick={() => setBudgetToDelete(item.budget)}
									>
										Delete
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<Dialog
				open={Boolean(budgetToDelete)}
				onOpenChange={(open) => !open && setBudgetToDelete(undefined)}
			>
				<DialogContent className={cn('w-[90vw] md:w-full', modalShell)}>
					<DialogHeader>
						<DialogTitle>Delete budget</DialogTitle>
						<DialogDescription>
							Delete{' '}
							{budgetToDelete ? (
								<SensitiveText widthClassName="w-28">
									{getBudgetTitle(
										budgetToDelete,
										getCategoryLabel,
										getSubcategoryLabel
									)}
								</SensitiveText>
							) : (
								'this budget'
							)}
							? Transactions will not be removed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBudgetToDelete(undefined)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={() => void confirmDelete()}>
							Delete budget
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
};

export default PlanBudgetsTab;
