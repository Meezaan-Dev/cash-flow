import React, { useEffect, useMemo, useState } from 'react';
import {
	FiCalendar,
	FiChevronLeft,
	FiChevronRight,
	FiEdit2,
	FiMoreHorizontal,
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
import {
	cardSurface,
	cardSurfaceMuted,
	modalShell,
	pageBg,
	sectionLabel,
} from '@/styles/marketingStyles';
import BudgetForm from './BudgetForm';

const STATUS_STYLES = {
	safe: {
		label: 'On track',
		ring: '#3b82f6',
		text: 'text-blue-600 dark:text-blue-400',
		badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
	},
	warning: {
		label: 'Watch spending',
		ring: '#f59e0b',
		text: 'text-amber-600 dark:text-amber-400',
		badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
	},
	over: {
		label: 'Over budget',
		ring: '#ef4444',
		text: 'text-red-600 dark:text-red-400',
		badge: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
	},
};

const BudgetProgressRing: React.FC<{
	percentage: number;
	status: BudgetProgress['status'];
}> = ({ percentage, status }) => {
	const size = 112;
	const strokeWidth = 9;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const normalized = Math.min(Math.max(percentage, 0), 100);
	const offset = circumference - (normalized / 100) * circumference;
	const styles = STATUS_STYLES[status];

	return (
		<div className="relative flex h-28 w-28 items-center justify-center">
			<svg
				viewBox={`0 0 ${size} ${size}`}
				className="-rotate-90"
				aria-label={`${Math.round(percentage)} percent used`}
				role="img"
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					className="text-blue-100 dark:text-gray-800"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke={styles.ring}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className="transition-all duration-500"
				/>
			</svg>
			<div className="absolute text-center">
				<p className={cn('text-2xl font-semibold tracking-tight', styles.text)}>
					{Math.round(percentage)}%
				</p>
				<p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
					used
				</p>
			</div>
		</div>
	);
};

interface BudgetCardProps {
	item: BudgetProgress;
	getCategoryLabel: (categoryId: string) => string;
	getSubcategoryLabel: (categoryId: string, subCategoryId?: string) => string;
	actionId?: string;
	onEdit: (budget: Budget) => void;
	onDelete: (budget: Budget) => void;
	onPublish: (budget: Budget) => void;
	onRepeat: (budgetId: string) => void;
	onMove: (direction: -1 | 1) => void;
	onDragStart: () => void;
	onDragEnd: () => void;
	onDragOver: (event: React.DragEvent<HTMLElement>) => void;
	onDrop: () => void;
	isFirst: boolean;
	isLast: boolean;
	isDragging: boolean;
}

const BudgetCard: React.FC<BudgetCardProps> = ({
	item,
	getCategoryLabel,
	getSubcategoryLabel,
	actionId,
	onEdit,
	onDelete,
	onPublish,
	onRepeat,
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
		<article
			className={cn(
				'flex h-full min-h-[500px] flex-col overflow-hidden transition duration-200',
				cardSurface,
				isDragging && 'scale-[0.98] opacity-60'
			)}
			draggable
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<div className="relative flex min-h-52 flex-col items-center justify-center border-b border-gray-100 bg-gradient-to-br from-blue-50/80 via-gray-50 to-white px-6 py-7 dark:border-gray-800 dark:from-blue-950/25 dark:via-gray-900 dark:to-gray-900">
				<div className="absolute right-3 top-3 flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full"
						onClick={() => onMove(-1)}
						disabled={isFirst}
						aria-label={`Move ${title} left`}
					>
						<FiChevronLeft className="h-4 w-4" />
					</Button>
					<span
						className="flex h-8 w-8 cursor-grab items-center justify-center rounded-full text-gray-400 active:cursor-grabbing"
						title="Drag to reorder"
						aria-hidden="true"
					>
						<FiMove className="h-4 w-4" />
					</span>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full"
						onClick={() => onMove(1)}
						disabled={isLast}
						aria-label={`Move ${title} right`}
					>
						<FiChevronRight className="h-4 w-4" />
					</Button>
				</div>
				<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
					Set budget
				</p>
				<p className="mb-4 mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
					{formatCurrency(item.budget.amount)}
				</p>
				<BudgetProgressRing
					percentage={item.usedPercentage}
					status={item.status}
				/>
			</div>
			<div className="flex flex-1 flex-col p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="mb-2 flex flex-wrap items-center gap-2">
							<span
								className={cn(
									'rounded-full px-2.5 py-1 text-xs font-medium',
									isDraft
										? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
										: styles.badge
								)}
							>
								{isDraft ? 'Draft' : styles.label}
							</span>
							<span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
								<FiCalendar className="h-3.5 w-3.5" />
								{getBudgetPeriodLabel(item.budget)}
							</span>
						</div>
						<h2 className="truncate text-lg font-semibold text-gray-950 dark:text-white">
							{title}
						</h2>
						<p className="mt-1 min-h-8 text-xs text-gray-500 dark:text-gray-400">
							{scopeHelp ?? 'Tracks this specific spending category'}
						</p>
					</div>
					<div className="flex shrink-0 gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={() => onEdit(item.budget)}
							aria-label={`Edit ${title}`}
						>
							<FiEdit2 className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full text-gray-400 hover:text-red-600"
							onClick={() => onDelete(item.budget)}
							aria-label={`Delete ${title}`}
						>
							<FiTrash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>

				<div className="mt-5 min-h-[76px] rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
					<p className="text-sm text-gray-700 dark:text-gray-200">
						<span className="font-semibold">{formatCurrency(item.spent)}</span>
						{' spent of '}
						<span className="font-semibold">{formatCurrency(item.budget.amount)}</span>
					</p>
					<p className={cn('mt-1 text-sm font-medium', styles.text)}>
						{item.remaining >= 0
							? `${formatCurrency(item.remaining)} remaining`
							: `${formatCurrency(Math.abs(item.remaining))} over budget`}
					</p>
				</div>

				<div className="mt-auto pt-4">
					{isDraft ? (
						<Button
							type="button"
							className="w-full rounded-xl"
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
						className="w-full rounded-xl"
						onClick={() => onRepeat(item.budget.id)}
						disabled={actionId === item.budget.id}
						aria-label={`Repeat ${title} for next period`}
					>
						<FiRepeat className="h-4 w-4" />
						Repeat for next period
					</Button>
					) : (
						<div className="flex h-9 items-center justify-center rounded-xl border border-transparent text-xs text-gray-400">
							Active for this period
						</div>
					)}
				</div>
			</div>
		</article>
	);
};

const BudgetsList: React.FC = () => {
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
				.map((budget) => calculateBudgetProgress(budget, transactions)),
		[orderedBudgets, transactions]
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
			setActionError(
				error instanceof Error ? error.message : 'Unable to update this budget.'
			);
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
			setActionError(
				error instanceof Error ? error.message : 'Unable to save the budget order.'
			);
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

	const renderBudgetGrid = (items: BudgetProgress[]) => (
		<div
			className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			data-testid="budget-grid"
		>
			{items.map((item, index) => (
				<BudgetCard
					key={item.budget.id}
					item={item}
					getCategoryLabel={getCategoryLabel}
					getSubcategoryLabel={getSubcategoryLabel}
					actionId={actionId}
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
		</div>
	);
	const atBudgetLimit = budgets.length >= MAX_BUDGETS;

	return (
		<div className={cn('relative flex min-h-screen flex-col', pageBg)}>
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

			<div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<header className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
								Spending plans
							</p>
							<h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
								Budgets
							</h1>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
								Clear limits, live spending, and less time figuring out what each
								budget means.
							</p>
							<p className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
								{budgets.length} of {MAX_BUDGETS} budgets created
								{atBudgetLimit ? ' · Limit reached' : ''}
							</p>
						</div>
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
								onClick={() => setShowForm(true)}
								disabled={categories.length === 0 || atBudgetLimit}
								className="h-10 rounded-xl px-4"
							>
								<FiPlus className="h-4 w-4" />
								New budget
							</Button>
						</div>
					</header>

					{actionError && (
						<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
							{actionError}
						</div>
					)}

					{publishedProgress.length > 0 && (
						<section className="mb-8">
							<div className="grid gap-3 sm:grid-cols-3">
								{[
									['Budgeted', totals.budget, 'Published limits'],
									['Spent', totals.spent, 'Matched expenses'],
									[
										totals.remaining >= 0 ? 'Remaining' : 'Over budget',
										Math.abs(totals.remaining),
										totals.remaining >= 0 ? 'Available to spend' : 'Beyond limits',
									],
								].map(([label, value, note], index) => (
									<div
										key={String(label)}
										className={cn(
											'flex items-center gap-4 p-4',
											cardSurfaceMuted
										)}
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400">
											{index === 0 ? (
												<FiTarget className="h-4 w-4" />
											) : index === 1 ? (
												<FiMoreHorizontal className="h-4 w-4" />
											) : (
												<FiCalendar className="h-4 w-4" />
											)}
										</div>
										<div>
											<p className={sectionLabel}>{label}</p>
											<p className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
												{formatCurrency(value as number)}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{note}
											</p>
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{categories.length === 0 ? (
						<section className={cn('p-12 text-center', cardSurface)}>
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
								<FiTarget className="h-6 w-6" />
							</div>
							<h2 className="mt-4 text-lg font-semibold">Create a category first</h2>
							<p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
								Budgets can cover one category or a specific sub-category.
							</p>
						</section>
					) : allProgress.length === 0 ? (
						<section className={cn('p-12 text-center', cardSurface)}>
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
								<FiTarget className="h-6 w-6" />
							</div>
							<h2 className="mt-4 text-lg font-semibold">
								No budgets for this month
							</h2>
							<p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
								Create a clear spending goal and keep it as a draft until it is
								ready.
							</p>
							<Button className="mt-5 rounded-xl" onClick={() => setShowForm(true)}>
								<FiPlus className="h-4 w-4" />
								Create budget
							</Button>
						</section>
					) : (
						<div className="space-y-10">
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
									{renderBudgetGrid(draftProgress)}
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
									{renderBudgetGrid(publishedProgress)}
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
									{renderBudgetGrid(otherProgress)}
								</section>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default BudgetsList;
