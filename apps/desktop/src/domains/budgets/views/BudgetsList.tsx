import React, { useEffect, useMemo, useState } from 'react';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { useNavigate } from 'react-router-dom';
import {
	FiCalendar,
	FiChevronDown,
	FiChevronUp,
	FiEdit2,
	FiMove,
	FiPlus,
	FiRepeat,
	FiTarget,
	FiTrash2,
	FiUploadCloud,
} from 'react-icons/fi';
import { useBudgetsContext } from '@/domains/budgets/context/BudgetsContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { Budget, BudgetProgress } from '@/types';
import {
	budgetOverlapsMonth,
	calculateBudgetProgress,
	getCurrentBudgetMonth,
	isBudgetPeriodDone,
	MAX_BUDGETS,
	sortBudgetsByDisplayOrder,
} from '@/domains/budgets/models/BudgetModel';
import {
	getBudgetPeriodLabel,
	getBudgetScopeHelp,
	getBudgetTitle,
} from '@/domains/budgets/views/budgetDisplay';
import { formatCurrency } from '@/utils/formatCurrency';
import { useToast } from '@/components/app/ui/use-toast';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import MotionReveal from '@/components/marketing/MotionReveal';
import {
	DataListHeader,
	DataListRow,
	DataListSurface,
	EmptyState,
	PageHeader,
	PageShell,
	SummaryCard,
	SummaryCardGrid,
} from '@/components/app/page-layout';
import { SidePanel } from '@/components/app/ui/side-panel';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { cn } from '@/lib/utils';
import { modalShell } from '@/styles/marketingStyles';
import {
	getBudgetTransactionFilters,
	transactionFiltersToSearch,
} from '@/shared/filters/utils/transactionFilters';
import BudgetForm from './BudgetForm';

const STATUS_STYLES = {
	safe: {
		label: 'On track',
		bar: 'bg-blue-500',
		text: 'text-blue-600 dark:text-blue-400',
		badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
	},
	warning: {
		label: 'Watch spending',
		bar: 'bg-amber-500',
		text: 'text-amber-600 dark:text-amber-400',
		badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
	},
	over: {
		label: 'Over budget',
		bar: 'bg-red-500',
		text: 'text-red-600 dark:text-red-400',
		badge: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
	},
};

interface BudgetRowProps {
	item: BudgetProgress;
	getCategoryLabel: (categoryId: string) => string;
	getSubcategoryLabel: (categoryId: string, subCategoryId?: string) => string;
	actionId?: string;
	referenceDate: Date;
	onEdit: (budget: Budget) => void;
	onDelete: (budget: Budget) => void;
	onPublish: (budget: Budget) => void;
	onRepeat: (budgetId: string) => void;
	onViewTransactions: (budget: Budget) => void;
	onMove: (direction: -1 | 1) => void;
	onDragStart: () => void;
	onDragEnd: () => void;
	onDragOver: (event: React.DragEvent<HTMLElement>) => void;
	onDrop: () => void;
	isFirst: boolean;
	isLast: boolean;
	isDragging: boolean;
}

const BudgetRow: React.FC<BudgetRowProps> = ({
	item,
	getCategoryLabel,
	getSubcategoryLabel,
	actionId,
	referenceDate,
	onEdit,
	onDelete,
	onPublish,
	onRepeat,
	onViewTransactions,
	onMove,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDrop,
	isFirst,
	isLast,
	isDragging,
}) => {
	const styles = STATUS_STYLES[item.status];
	const title = getBudgetTitle(
		item.budget,
		getCategoryLabel,
		getSubcategoryLabel
	);
	const scopeHelp = getBudgetScopeHelp(item.budget, getCategoryLabel);
	const canRepeat = isBudgetPeriodDone(item.budget);
	const isDraft = item.budget.lifecycleStatus === 'draft';

	return (
		<DataListRow
			className={cn(
				'group relative grid gap-4 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30 md:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.2fr)_minmax(260px,1fr)] md:items-center',
				isDragging && 'bg-blue-50/70 opacity-60 dark:bg-blue-950/20'
			)}
			draggable
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<div className="flex min-w-0 items-center gap-3 pr-20 md:pr-0">
				<span
					className="flex h-10 w-6 shrink-0 cursor-grab items-center justify-center text-gray-400 active:cursor-grabbing"
					title="Drag to reorder"
					aria-hidden="true"
				>
					<FiMove className="h-4 w-4" />
				</span>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="truncate text-sm font-semibold text-gray-950 dark:text-white">
							{title}
						</h2>
						<span
							className={cn(
								'rounded-full px-2 py-0.5 text-[11px] font-medium',
								isDraft
									? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
									: styles.badge
							)}
						>
							{isDraft ? 'Draft' : styles.label}
						</span>
					</div>
					<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
						{scopeHelp ?? 'Tracks this specific spending category'}
					</p>
				</div>
			</div>

			<div>
				<div className="flex items-end justify-between gap-3">
					<p className="text-sm font-semibold text-gray-950 dark:text-white">
						{formatCurrency(item.spent)} spent of {formatCurrency(item.budget.amount)}
					</p>
					<span className={cn('text-xs font-medium', styles.text)}>
						{Math.round(item.usedPercentage)}% used
					</span>
				</div>
				<div
					className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
					role="img"
					aria-label={`${Math.round(item.usedPercentage)} percent used`}
				>
					<div
						className={cn('h-full rounded-full transition-all', styles.bar)}
						style={{ width: `${Math.min(Math.max(item.usedPercentage, 0), 100)}%` }}
					/>
				</div>
			</div>

			<div className="min-w-0">
				<div className="flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
					<FiCalendar className="h-3.5 w-3.5 text-gray-400" />
					<span className="truncate">
						{getBudgetPeriodLabel(item.budget, referenceDate)}
					</span>
				</div>
				<p className={cn('mt-1 text-xs font-medium', styles.text)}>
					{item.remaining >= 0
						? `${formatCurrency(item.remaining)} remaining`
						: `${formatCurrency(Math.abs(item.remaining))} over budget`}
				</p>
				<div className="mt-2">
					{isDraft ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 rounded-lg"
							onClick={() => onPublish(item.budget)}
							disabled={actionId === item.budget.id}
							aria-label={`Publish ${title}`}
						>
							<FiUploadCloud className="h-4 w-4" />
							Publish budget
						</Button>
					) : canRepeat ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 rounded-lg"
							onClick={() => onRepeat(item.budget.id)}
							disabled={actionId === item.budget.id}
							aria-label={`Repeat ${title} for next period`}
						>
							<FiRepeat className="h-3.5 w-3.5" />
							Repeat
						</Button>
					) : null}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="mt-1 h-8 px-0 text-blue-600 hover:bg-transparent hover:text-blue-700 dark:text-blue-400"
						onClick={() => onViewTransactions(item.budget)}
						aria-label={`View transactions for ${title}`}
					>
						View transactions
					</Button>
				</div>
			</div>

			<div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 rounded-md"
					onClick={() => onMove(-1)}
					disabled={isFirst}
					aria-label={`Move ${title} up`}
				>
					<FiChevronUp className="h-3.5 w-3.5" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 rounded-md"
					onClick={() => onMove(1)}
					disabled={isLast}
					aria-label={`Move ${title} down`}
				>
					<FiChevronDown className="h-3.5 w-3.5" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 rounded-md"
					onClick={() => onEdit(item.budget)}
					aria-label={`Edit ${title}`}
				>
					<FiEdit2 className="h-3.5 w-3.5" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 rounded-md text-gray-400 hover:text-red-600"
					onClick={() => onDelete(item.budget)}
					aria-label={`Delete ${title}`}
				>
					<FiTrash2 className="h-3.5 w-3.5" />
				</Button>
			</div>
		</DataListRow>
	);
};

const BudgetsList: React.FC = () => {
	const navigate = useNavigate();
	const { budgets, deleteBudget, publishBudget, repeatBudget, reorderBudgets } =
		useBudgetsContext();
	const { transactions } = useTransactionsContext();
	const {
		categories,
		getCategoryLabel,
		getSubcategoryLabel,
	} = useCategoriesContext();
	const { toast } = useToast();
	const [selectedMonth, setSelectedMonth] = useState(getCurrentBudgetMonth);
	const [showForm, setShowForm] = useState(false);
	const [editingBudget, setEditingBudget] = useState<Budget>();
	const [budgetToDelete, setBudgetToDelete] = useState<Budget>();
	const [actionId, setActionId] = useState<string>();
	const [draggingBudgetId, setDraggingBudgetId] = useState<string>();
	const [actionError, setActionError] = useState('');
	const serverOrderedBudgets = useMemo(
		() => sortBudgetsByDisplayOrder(budgets),
		[budgets]
	);
	const serverOrderSignature = JSON.stringify(
		serverOrderedBudgets.map((budget) => ({
			id: budget.id,
			displayOrder: budget.displayOrder ?? null,
		}))
	);
	const [localOrderIds, setLocalOrderIds] = useState<string[]>(() =>
		serverOrderedBudgets.map((budget) => budget.id)
	);

	useEffect(() => {
		setLocalOrderIds(
			(JSON.parse(serverOrderSignature) as Array<{ id: string }>).map(
				(budget) => budget.id
			)
		);
	}, [serverOrderSignature]);

	const orderedBudgets = useMemo(() => {
		const byId = new Map(budgets.map((budget) => [budget.id, budget]));
		const ordered = localOrderIds
			.map((id) => byId.get(id))
			.filter((budget): budget is Budget => Boolean(budget));
		const orderedIds = new Set(ordered.map((budget) => budget.id));
		return [...ordered, ...serverOrderedBudgets.filter((budget) => !orderedIds.has(budget.id))];
	}, [budgets, localOrderIds, serverOrderedBudgets]);

	const allProgress = useMemo(
		() =>
			orderedBudgets
				.filter((budget) => Boolean(budget.categoryId))
				.map((budget) =>
					calculateBudgetProgress(
						budget,
						transactions,
						new Date(`${selectedMonth}-15T12:00:00`)
					)
				),
		[orderedBudgets, selectedMonth, transactions]
	);
	const progress = useMemo(
		() =>
			allProgress.filter((item) =>
				budgetOverlapsMonth(item.budget, selectedMonth)
			),
		[allProgress, selectedMonth]
	);
	const otherProgress = allProgress.filter(
		(item) => !budgetOverlapsMonth(item.budget, selectedMonth)
	);
	const draftProgress = progress.filter(
		(item) => item.budget.lifecycleStatus === 'draft'
	);
	const publishedProgress = progress.filter(
		(item) => item.budget.lifecycleStatus === 'published'
	);
	const totals = {
		budget: publishedProgress.reduce(
			(sum, item) => sum + item.budget.amount,
			0
		),
		spent: publishedProgress.reduce((sum, item) => sum + item.spent, 0),
		remaining: publishedProgress.reduce(
			(sum, item) => sum + item.remaining,
			0
		),
	};

	const closeForm = () => {
		setShowForm(false);
		setEditingBudget(undefined);
	};

	const openEdit = (budget: Budget) => {
		setEditingBudget(budget);
		setShowForm(true);
	};

	const confirmDelete = async () => {
		if (budgetToDelete) await deleteBudget(budgetToDelete.id);
		setBudgetToDelete(undefined);
	};

	const runAction = async (
		budgetId: string,
		action: (id: string) => Promise<void>,
		successMessage?: string
	) => {
		setActionId(budgetId);
		setActionError('');
		try {
			await action(budgetId);
			if (successMessage) {
				toast({
					title: 'Budget updated',
					description: successMessage,
					duration: 3500,
				});
			}
		} catch (error) {
			setActionError(getAppErrorMessage(error, { operation: 'Update budget' }));
		} finally {
			setActionId(undefined);
		}
	};

	const reorderGroup = async (
		group: BudgetProgress[],
		sourceId: string,
		targetId: string
	) => {
		if (sourceId === targetId) return;
		const groupIds = group.map((item) => item.budget.id);
		const sourceIndex = groupIds.indexOf(sourceId);
		const targetIndex = groupIds.indexOf(targetId);
		if (sourceIndex < 0 || targetIndex < 0) return;

		const reorderedGroupIds = [...groupIds];
		const [movedId] = reorderedGroupIds.splice(sourceIndex, 1);
		reorderedGroupIds.splice(targetIndex, 0, movedId);
		let groupIndex = 0;
		const nextOrderIds = allProgress.map((item) =>
			groupIds.includes(item.budget.id)
				? reorderedGroupIds[groupIndex++]
				: item.budget.id
		);

		setLocalOrderIds(nextOrderIds);
		setActionError('');
		try {
			await reorderBudgets(nextOrderIds);
		} catch (error) {
			setLocalOrderIds(serverOrderedBudgets.map((budget) => budget.id));
			setActionError(getAppErrorMessage(error, { operation: 'Reorder budgets' }));
		}
	};

	const moveInGroup = (
		group: BudgetProgress[],
		budgetId: string,
		direction: -1 | 1
	) => {
		const index = group.findIndex((item) => item.budget.id === budgetId);
		const target = group[index + direction];
		if (target) void reorderGroup(group, budgetId, target.budget.id);
	};

	const renderBudgetList = (items: BudgetProgress[]) => (
		<DataListSurface data-testid="budget-list">
			<DataListHeader>
				<span>Budget name</span>
				<span>Budget overview</span>
				<span>Budget data</span>
			</DataListHeader>
			{items.map((item, index) => (
				<BudgetRow
					key={item.budget.id}
					item={item}
					getCategoryLabel={getCategoryLabel}
					getSubcategoryLabel={getSubcategoryLabel}
					actionId={actionId}
					referenceDate={new Date(`${selectedMonth}-15T12:00:00`)}
					onEdit={openEdit}
					onDelete={setBudgetToDelete}
					onPublish={(budget) =>
						void runAction(
							budget.id,
							publishBudget,
							`${getBudgetTitle(
								budget,
								getCategoryLabel,
								getSubcategoryLabel
							)} is now active.`
						)
					}
					onRepeat={(id) =>
						void runAction(
							id,
							repeatBudget,
							'A new draft was created for the next period.'
						)
					}
					onViewTransactions={(budget) =>
						navigate(
							`/dashboard/transactions${transactionFiltersToSearch(
								getBudgetTransactionFilters(
									budget,
									new Date(`${selectedMonth}-15T12:00:00`)
								)
							)}`
						)
					}
					onMove={(direction) => moveInGroup(items, item.budget.id, direction)}
					onDragStart={() => setDraggingBudgetId(item.budget.id)}
					onDragEnd={() => setDraggingBudgetId(undefined)}
					onDragOver={(event) => event.preventDefault()}
					onDrop={() => {
						if (draggingBudgetId) {
							void reorderGroup(items, draggingBudgetId, item.budget.id);
						}
						setDraggingBudgetId(undefined);
					}}
					isFirst={index === 0}
					isLast={index === items.length - 1}
					isDragging={draggingBudgetId === item.budget.id}
				/>
			))}
		</DataListSurface>
	);
	const atBudgetLimit = budgets.length >= MAX_BUDGETS;

	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<SidePanel open={showForm} onOpenChange={(open) => !open && closeForm()}>
				{showForm && (
					<BudgetForm
						onClose={closeForm}
						budget={editingBudget}
						defaultMonth={selectedMonth}
					/>
				)}
			</SidePanel>

			<Dialog
				open={Boolean(budgetToDelete)}
				onOpenChange={(open) => !open && setBudgetToDelete(undefined)}
			>
				<DialogContent className={cn('w-[90vw] md:w-full', modalShell)}>
					<DialogHeader>
						<DialogTitle>Delete budget</DialogTitle>
						<DialogDescription>
							Delete{' '}
							{budgetToDelete
								? getBudgetTitle(
										budgetToDelete,
										getCategoryLabel,
										getSubcategoryLabel
									)
								: 'this budget'}
							? Transactions will not be removed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBudgetToDelete(undefined)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							Delete budget
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PageShell>
				<PageHeader
					title="Budgets"
					subtitle={`${budgets.length} of ${MAX_BUDGETS} budgets created${atBudgetLimit ? ' · Limit reached' : ''}`}
					actions={
						<div className="flex flex-wrap items-end gap-3">
							<div>
								<label
									htmlFor="budget-list-month"
									className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400"
								>
									View month
								</label>
								<Input
									id="budget-list-month"
									type="month"
									value={selectedMonth}
									onChange={(event) => setSelectedMonth(event.target.value)}
									className="h-10 w-40 rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
								/>
							</div>
							<Button
								variant="marketing"
								onClick={() => setShowForm(true)}
								disabled={categories.length === 0 || atBudgetLimit}
								className="h-10 rounded-xl px-4"
							>
								<FiPlus className="h-4 w-4" />
								New budget
							</Button>
						</div>
					}
					className="mb-6"
				/>

				{actionError && (
						<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
							{actionError}
						</div>
					)}

				{publishedProgress.length > 0 && (
					<section className="mb-8">
						<SummaryCardGrid>
								{[
									['Budgeted', totals.budget, 'Published limits'],
									['Spent', totals.spent, 'Matched expenses'],
									[
										totals.remaining >= 0 ? 'Remaining' : 'Over budget',
										Math.abs(totals.remaining),
										totals.remaining >= 0 ? 'Available to spend' : 'Beyond limits',
									],
									['Published', publishedProgress.length, 'Active plans'],
								].map(([label, value, note], index) => (
									<MotionReveal key={String(label)} delay={index * 0.06}>
										<SummaryCard
											label={String(label)}
											amount={index === 3 ? undefined : (value as number)}
											value={index === 3 ? String(value) : undefined}
											note={String(note)}
											tone={
												label === 'Over budget'
													? 'balance-negative'
													: 'default'
											}
										/>
									</MotionReveal>
								))}
						</SummaryCardGrid>
					</section>
				)}

				{categories.length === 0 ? (
						<EmptyState
							title="Create a category first"
							description="Budgets can cover one category or a specific sub-category."
							icon={<FiTarget className="h-6 w-6" />}
						/>
					) : allProgress.length === 0 ? (
						<EmptyState
							title="No budgets for this month"
							description="Create a clear spending goal and keep it as a draft until it is ready."
							icon={<FiTarget className="h-6 w-6" />}
							action={
								<Button onClick={() => setShowForm(true)}>
									<FiPlus className="h-4 w-4" />
									Create budget
								</Button>
							}
						/>
				) : (
					<div className="space-y-8">
							{draftProgress.length > 0 && (
								<section>
									<div className="mb-4 flex items-end justify-between">
										<div>
											<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
												Draft budgets
											</h2>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Review the goal and period before tracking begins.
											</p>
										</div>
										<span className="text-sm text-gray-400">
											{draftProgress.length}
										</span>
									</div>
									{renderBudgetList(draftProgress)}
								</section>
							)}

							{publishedProgress.length > 0 && (
								<section>
									<div className="mb-4">
										<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
											Active budgets
										</h2>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Live spending against published goals.
										</p>
									</div>
									{renderBudgetList(publishedProgress)}
								</section>
							)}

							{otherProgress.length > 0 && (
								<section>
									<div className="mb-4">
										<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
											Other budget periods
										</h2>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											These budgets do not overlap the selected month.
										</p>
									</div>
									{renderBudgetList(otherProgress)}
								</section>
							)}
						</div>
					)}
			</PageShell>
		</div>
	);
};

export default BudgetsList;
