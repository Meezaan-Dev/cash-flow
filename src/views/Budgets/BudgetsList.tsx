import React, { useMemo, useState } from 'react';
import {
	FiAlertCircle,
	FiCalendar,
	FiEdit2,
	FiPlay,
	FiPlus,
	FiTarget,
	FiTrash2,
	FiUploadCloud,
} from 'react-icons/fi';
import { useBudgetsContext } from '../../context/BudgetsContext';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { Budget, BudgetProgress, DateRange } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import {
	filterTransactionsByDateRangeObject,
	formatDateRange,
} from '../../utils/dateRangeFilter';
import { parseDbDate } from '../../utils/date';
import { useCategoriesContext } from '../../context/CategoriesContext';
import { Button } from '../../components/app/ui/button';
import DateRangeFilter from '../../components/app/DateRangeFilter';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../../components/app/ui/dialog';
import BudgetForm from './BudgetForm';

const getBarColour = (percent: number): string => {
	if (percent >= 90) return 'bg-red-500';
	if (percent >= 70) return 'bg-amber-500';
	return 'bg-green-500';
};

const BudgetsList: React.FC = () => {
	const { budgets, deleteBudget, getAllBudgetProgress, publishBudget, startBudget } =
		useBudgetsContext();
	const { getCategoryLabel } = useCategoriesContext();
	const { transactions } = useTransactionsContext();

	const [showForm, setShowForm] = useState(false);
	const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
	const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
	const [actionError, setActionError] = useState('');
	const [startingBudgetId, setStartingBudgetId] = useState<string | null>(null);
	const [publishingBudgetId, setPublishingBudgetId] = useState<string | null>(null);

	const allProgress: BudgetProgress[] = getAllBudgetProgress(transactions);
	const draftProgress = useMemo(
		() => allProgress.filter((progress) => progress.isDraft),
		[allProgress]
	);
	const publishedProgress = useMemo(
		() => allProgress.filter((progress) => !progress.isDraft),
		[allProgress]
	);
	const activePublishedBudgets = useMemo(
		() => publishedProgress.filter((progress) => progress.started),
		[publishedProgress]
	);
	const draftCount = draftProgress.length;
	const publishedCount = publishedProgress.length;
	const startedBudgets = activePublishedBudgets;
	const hasSelectedRange = Boolean(dateRange.startDate && dateRange.endDate);

	const handleEdit = (budget: Budget) => {
		setEditingBudget(budget);
		setShowForm(true);
	};

	const handleDeleteClick = (id: string) => {
		setBudgetToDelete(id);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (budgetToDelete) await deleteBudget(budgetToDelete);
		setDeleteDialogOpen(false);
		setBudgetToDelete(null);
	};

	const handleCloseForm = () => {
		setShowForm(false);
		setEditingBudget(undefined);
	};

	const handleStartBudget = async (budgetId: string) => {
		if (!dateRange.startDate || !dateRange.endDate) {
			setActionError('Select a budget start and end date before starting a budget.');
			return;
		}

		setActionError('');
		setStartingBudgetId(budgetId);

		try {
			await startBudget(budgetId, dateRange);
		} catch (error) {
			setActionError(
				error instanceof Error
					? error.message
					: 'Unable to start this budget right now. Please try again.'
			);
		} finally {
			setStartingBudgetId(null);
		}
	};

	const handlePublishBudget = async (budgetId: string) => {
		setActionError('');
		setPublishingBudgetId(budgetId);

		try {
			await publishBudget(budgetId);
		} catch (error) {
			setActionError(
				error instanceof Error
					? error.message
					: 'Unable to publish this budget right now. Please try again.'
			);
		} finally {
			setPublishingBudgetId(null);
		}
	};

	if (showForm) {
		return <BudgetForm onClose={handleCloseForm} budget={editingBudget} />;
	}

	const totalPlanned = startedBudgets.reduce(
		(sum, progress) => sum + progress.plannedAmount,
		0
	);
	const totalActual = startedBudgets.reduce(
		(sum, progress) => sum + progress.actualSpent,
		0
	);
	const totalRemaining = startedBudgets.reduce(
		(sum, progress) => sum + progress.remaining,
		0
	);
	const totalOverBudget = startedBudgets.reduce(
		(sum, progress) => sum + progress.overBudget,
		0
	);

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="w-[90vw] rounded-lg md:w-full">
					<DialogHeader>
						<DialogTitle>Delete Budget</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this budget? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				<div className="mb-6 flex items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Budgets</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Plan draft budgets with live spend, then publish them when the period
							is ready.
						</p>
					</div>
					<Button onClick={() => setShowForm(true)}>
						<FiPlus className="mr-2 h-4 w-4" />
						New Draft
					</Button>
				</div>

				<div className="mb-6 rounded-xl border bg-card p-4">
					<div className="mb-3 flex items-center gap-2">
						<FiCalendar className="h-4 w-4 text-muted-foreground" />
						<p className="text-sm font-medium">Published Budget Period Override</p>
					</div>
					<DateRangeFilter
						dateRange={dateRange}
						onDateRangeChange={setDateRange}
						onClear={() => {
							setDateRange({ startDate: '', endDate: '' });
							setActionError('');
						}}
					/>
					<p className="mt-3 text-xs text-muted-foreground">
						Published budgets use their published period by default. Choose a range
						here only when you need to update a published budget comparison period.
					</p>
					{!hasSelectedRange && (
						<div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
							Select a start and end date to enable published period updates.
						</div>
					)}
					{actionError && (
						<div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{actionError}
						</div>
					)}
				</div>

				{startedBudgets.length > 0 ? (
					<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<div className="rounded-xl border bg-card p-5">
							<p className="text-sm text-muted-foreground">Planned Total</p>
							<p className="mt-1 text-xl font-bold">{formatCurrency(totalPlanned)}</p>
						</div>
						<div className="rounded-xl border bg-card p-5">
							<p className="text-sm text-muted-foreground">Actual Total</p>
							<p className="mt-1 text-xl font-bold">{formatCurrency(totalActual)}</p>
						</div>
						<div className="rounded-xl border bg-card p-5">
							<p className="text-sm text-muted-foreground">Remaining</p>
							<p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
								{formatCurrency(totalRemaining)}
							</p>
						</div>
						<div className="rounded-xl border bg-card p-5">
							<p className="text-sm text-muted-foreground">Over Budget</p>
							<p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
								{formatCurrency(totalOverBudget)}
							</p>
						</div>
					</div>
				) : budgets.length > 0 ? (
					<div className="mb-8 rounded-xl border border-dashed bg-card px-4 py-5 text-sm text-muted-foreground">
						No published budgets have an active comparison period yet. Drafts will
						become active automatically when published.
					</div>
				) : null}

				{budgets.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<FiPlus className="h-6 w-6 text-primary" />
						</div>
						<h3 className="text-lg font-semibold">No budgets yet</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Create a draft budget to plan a custom period by category
						</p>
						<Button className="mt-4" onClick={() => setShowForm(true)}>
							Create Draft
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						{[...draftProgress, ...publishedProgress].map((progress, index) => {
							const {
								budget,
								plannedAmount,
								plannedStartDate,
								plannedEndDate,
								started,
								isDraft,
								calculating,
								comparisonStartDate,
								comparisonEndDate,
								actualSpent,
								remaining,
								overBudget,
								percent,
							} = progress;
							const label = getCategoryLabel(budget.category);
							const isOverBudget = overBudget > 0;
							const barColour = getBarColour(percent);
							const matchingTransactions =
								calculating && comparisonStartDate && comparisonEndDate
									? filterTransactionsByDateRangeObject(
											transactions.filter(
												(transaction) =>
													transaction.type === 'expense' &&
													transaction.category === budget.category
											),
											{
												startDate: comparisonStartDate,
												endDate: comparisonEndDate,
											}
									  ).sort((left, right) => {
											const leftDate = parseDbDate(left.date ?? left.createdAt);
											const rightDate = parseDbDate(right.date ?? right.createdAt);
											return rightDate.getTime() - leftDate.getTime();
									  })
									: [];

							return (
								<React.Fragment key={budget.id}>
									{index === 0 && draftCount > 0 && (
										<div className="flex items-center justify-between border-b pb-2">
											<div>
												<h2 className="text-lg font-semibold">Draft Budgets</h2>
												<p className="text-sm text-muted-foreground">
													Plan with live calculations before publishing.
												</p>
											</div>
											<span className="text-sm text-muted-foreground">
												{draftCount}
											</span>
										</div>
									)}
									{index === draftCount && publishedCount > 0 && (
										<div className="flex items-center justify-between border-b pb-2 pt-4">
											<div>
												<h2 className="text-lg font-semibold">Published Budgets</h2>
												<p className="text-sm text-muted-foreground">
													Active budget periods and historical comparisons.
												</p>
											</div>
											<span className="text-sm text-muted-foreground">
												{publishedCount}
											</span>
										</div>
									)}
									<div className="group rounded-2xl border bg-card p-5">
										<div className="mb-4 flex items-start justify-between gap-3">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<h3 className="truncate font-semibold">{label}</h3>
													<span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">
														{isDraft ? 'Draft' : 'Published'}
													</span>
													{isOverBudget && (
														<FiAlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
													)}
												</div>
												<p className="mt-0.5 text-xs text-muted-foreground">
													{isDraft
														? 'Live draft calculations for the planned period'
														: 'Published budget tracking'}
												</p>
											</div>
											<div className="flex flex-shrink-0 items-center gap-1">
												{isDraft ? (
													<Button
														type="button"
														size="sm"
														className="h-8"
														onClick={() => budget.id && handlePublishBudget(budget.id)}
														disabled={publishingBudgetId === budget.id}
													>
														<FiUploadCloud className="mr-1.5 h-3.5 w-3.5" />
														{publishingBudgetId === budget.id
															? 'Publishing...'
															: 'Publish'}
													</Button>
												) : (
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="h-8"
														onClick={() => budget.id && handleStartBudget(budget.id)}
														disabled={!hasSelectedRange || startingBudgetId === budget.id}
													>
														<FiPlay className="mr-1.5 h-3.5 w-3.5" />
														{startingBudgetId === budget.id
															? 'Updating...'
															: started
																? 'Update period'
																: 'Set period'}
													</Button>
												)}
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
												onClick={() => handleEdit(budget)}
												aria-label="Edit budget"
											>
												<FiEdit2 className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 opacity-0 transition-opacity text-muted-foreground group-hover:opacity-100 hover:text-destructive"
												onClick={() => budget.id && handleDeleteClick(budget.id)}
												aria-label="Delete budget"
											>
												<FiTrash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>

									<div className="mb-4 grid gap-3 md:grid-cols-2">
										<div className="rounded-xl border bg-muted/20 p-3">
											<div className="mb-1 flex items-center gap-2">
												<FiTarget className="h-4 w-4 text-primary" />
												<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Planned
												</p>
											</div>
											<p className="text-lg font-semibold">
												{formatCurrency(plannedAmount)}
											</p>
											<p className="mt-1 text-sm text-muted-foreground">
												{formatDateRange({
													startDate: plannedStartDate,
													endDate: plannedEndDate,
												})}
											</p>
										</div>
										<div className="rounded-xl border bg-muted/20 p-3">
											<div className="mb-1 flex items-center gap-2">
												<FiCalendar className="h-4 w-4 text-primary" />
												<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													{isDraft ? 'Live Spend' : 'Actual'}
												</p>
											</div>
											{calculating ? (
												<>
													<p className="text-lg font-semibold">
														{formatCurrency(actualSpent)}
													</p>
													<p className="mt-1 text-sm text-muted-foreground">
														{formatDateRange({
															startDate: comparisonStartDate,
															endDate: comparisonEndDate,
														})}
													</p>
												</>
											) : (
												<>
													<p className="text-lg font-semibold">Not started</p>
													<p className="mt-1 text-sm text-muted-foreground">
														Use the date filter to set a comparison period.
													</p>
												</>
											)}
										</div>
									</div>

									<div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
										<div
											className={`h-full rounded-full transition-all ${barColour}`}
											style={{ width: `${Math.min(100, percent)}%` }}
										/>
									</div>

									{calculating ? (
										<>
											<div className="flex items-center justify-between text-sm">
												<span className="text-muted-foreground">
													{formatCurrency(actualSpent)} actual spend
												</span>
												<span
													className={`font-medium ${
														isOverBudget
															? 'text-red-600 dark:text-red-400'
															: 'text-muted-foreground'
													}`}
												>
													{isOverBudget
														? `${formatCurrency(overBudget)} over`
														: `${formatCurrency(remaining)} remaining`}{' '}
													of {formatCurrency(plannedAmount)}
												</span>
											</div>
											<div className="mt-1 text-right text-xs text-muted-foreground">
												{percent.toFixed(0)}% used
											</div>
											<div className="mt-4 border-t pt-4">
												<div className="mb-3 flex items-center justify-between">
													<h4 className="text-sm font-semibold">
														Matching Transactions
													</h4>
													<span className="text-xs text-muted-foreground">
														{matchingTransactions.length}{' '}
														{matchingTransactions.length === 1
															? 'transaction'
															: 'transactions'}
													</span>
												</div>
												{matchingTransactions.length === 0 ? (
													<div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
														No transactions matched this budget category in the
														selected period.
													</div>
												) : (
													<div className="space-y-2">
														{matchingTransactions.map((transaction) => {
															const transactionDate = parseDbDate(
																transaction.date ?? transaction.createdAt
															).toLocaleDateString('en-ZA', {
																day: 'numeric',
																month: 'short',
																year: 'numeric',
															});

															return (
																<div
																	key={transaction.id}
																	className="flex items-center justify-between rounded-xl border bg-background px-3 py-3"
																>
																	<div className="min-w-0">
																		<p className="truncate text-sm font-medium">
																			{transaction.title}
																		</p>
																		<p className="text-xs text-muted-foreground">
																			{transactionDate}
																			{transaction.description
																				? ` • ${transaction.description}`
																				: ''}
																		</p>
																	</div>
																	<p className="ml-3 flex-shrink-0 font-semibold text-red-600 dark:text-red-400">
																		{formatCurrency(transaction.amount)}
																	</p>
																</div>
															);
														})}
													</div>
												)}
											</div>
										</>
									) : (
										<div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
											This budget has a planned amount and period, but no active
											comparison period yet.
										</div>
									)}
								</div>
								</React.Fragment>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default BudgetsList;
