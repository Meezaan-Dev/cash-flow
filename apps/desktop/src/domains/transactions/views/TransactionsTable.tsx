import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { FiPlus, FiSearch, FiSettings, FiTrash2 } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useBudgetsContext } from '@/domains/budgets/context/BudgetsContext';
import DateRangeFilter from '@/shared/filters/components/DateRangeFilter';
import Currency from '@/components/marketing/Currency';
import {
	DataListHeader,
	DataListRow,
	DataListSurface,
	EmptyState,
	FilterBar,
	PageHeader,
	PageShell,
	SummaryCard,
	SummaryCardGrid,
} from '@/components/app/page-layout';
import { selectedRow } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { DateRange, Transaction } from '@/types';
import { compareTransactionsByDateDesc, getTransactionDateOrEpoch } from '@cash-flow/shared/utils/date';
import { Input } from '@/components/app/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { Button } from '@/components/app/ui/button';
import { useToast } from '@/components/app/ui/use-toast';
import { useFilterPreferences } from '@/shared/filters/context/FilterPreferencesContext';
import {
	buildCategoryPathOptions,
	mergeCategoryOptions,
} from '@cash-flow/shared/categories/categories';
import { getCategoryColor } from '@cash-flow/shared/categories/categoryColors';
import {
	TransactionFilterDescriptor,
	transactionFiltersFromSearch,
	transactionFiltersToSearch,
	transactionMatchesFilters,
} from '@/shared/filters/utils/transactionFilters';
import {
	calculateBudgetProgress,
	transactionMatchesBudget,
} from '@/domains/budgets/models/BudgetModel';

interface TransactionsTableProps {
	onDelete: (id: string) => void;
	onSelect: (tx: Transaction) => void;
	onCreate?: () => void;
	selectedId: string | null;
	onOpenSettings?: () => void;
}

const MONTHS = [
	{ value: 'all', label: 'All Months' },
	{ value: '0', label: 'January' },
	{ value: '1', label: 'February' },
	{ value: '2', label: 'March' },
	{ value: '3', label: 'April' },
	{ value: '4', label: 'May' },
	{ value: '5', label: 'June' },
	{ value: '6', label: 'July' },
	{ value: '7', label: 'August' },
	{ value: '8', label: 'September' },
	{ value: '9', label: 'October' },
	{ value: '10', label: 'November' },
	{ value: '11', label: 'December' },
];

const INITIAL_VISIBLE_COUNT = 15;
const LOAD_MORE_COUNT = 15;

const TransactionsTable: React.FC<TransactionsTableProps> = ({
	onDelete,
	onSelect,
	onCreate,
	selectedId,
	onOpenSettings,
}) => {
	const { transactions, bulkUpdateTransactionCategories } = useTransactionsContext();
	const { accounts, loading: accountsLoading } = useAccountsContext();
	const { categories, categoryOptions, getCategoryPathLabel } = useCategoriesContext();
	const { budgets } = useBudgetsContext();
	const { prefs } = useFilterPreferences();
	const { toast } = useToast();
	const location = useLocation();
	const navigate = useNavigate();
	const tablePrefs = prefs.transactionsTable;
	const routeFilters = useMemo(
		() => transactionFiltersFromSearch(location.search),
		[location.search]
	);
	const [search, setSearch] = useState('');
	const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>(
		routeFilters.type ?? 'all'
	);
	const [filterCategory, setFilterCategory] = useState(
		routeFilters.category ?? 'all'
	);
	const [filterAccount, setFilterAccount] = useState(
		routeFilters.accountId ?? 'all'
	);
	const [filterMonth, setFilterMonth] = useState('all');
	const [dateRange, setDateRange] = useState<DateRange>({
		startDate: routeFilters.startDate ?? '',
		endDate: routeFilters.endDate ?? '',
	});
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [bulkCategoryValue, setBulkCategoryValue] = useState('');
	const [isBulkSaving, setIsBulkSaving] = useState(false);
	const selectVisibleRef = useRef<HTMLInputElement>(null);
	const hasNoAccounts = !accountsLoading && accounts.length === 0;

	useEffect(() => {
		setFilterType(routeFilters.type ?? 'all');
		setFilterCategory(routeFilters.category ?? 'all');
		setFilterAccount(routeFilters.accountId ?? 'all');
		setDateRange({
			startDate: routeFilters.startDate ?? '',
			endDate: routeFilters.endDate ?? '',
		});
	}, [routeFilters]);

	const updateRouteFilters = (next: TransactionFilterDescriptor) => {
		navigate(
			`/dashboard/transactions${transactionFiltersToSearch(next)}`,
			{ replace: true }
		);
	};

	const currentRouteFilters = (): TransactionFilterDescriptor => ({
		accountId: filterAccount === 'all' ? undefined : filterAccount,
		category: filterCategory === 'all' ? undefined : filterCategory,
		subcategory: routeFilters.subcategory,
		type: filterType === 'all' ? undefined : filterType,
		startDate: dateRange.startDate || undefined,
		endDate: dateRange.endDate || undefined,
		endExclusive: routeFilters.endExclusive,
	});

	const { filtered, totals } = useMemo(() => {
		const filtered = transactions
			.filter((tx) => {
				const searchText = `${tx.title} ${tx.subcategory ?? ''}`.toLowerCase();
				const matchesSearch = searchText.includes(search.toLowerCase());
				const matchesType = filterType === 'all' || tx.type === filterType;
				const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
				const matchesSubcategory =
					!routeFilters.subcategory ||
					(tx.subcategory ?? '') === routeFilters.subcategory;
				const matchesAccount =
					filterAccount === 'all' || tx.accountId === filterAccount;
				const dateValue = tx.date ?? tx.createdAt;
				const month = dateValue
					? new Date(
						typeof dateValue === 'object' && 'toDate' in dateValue
							? dateValue.toDate()
							: dateValue
					).getMonth()
					: -1;
				const matchesMonth = filterMonth === 'all' || month === parseInt(filterMonth);

				return (
					matchesSearch &&
					matchesType &&
					matchesCategory &&
					matchesSubcategory &&
					matchesAccount &&
					matchesMonth &&
					transactionMatchesFilters(tx, {
						startDate: dateRange.startDate || undefined,
						endDate: dateRange.endDate || undefined,
						endExclusive: routeFilters.endExclusive,
					})
				);
			})
			.sort(compareTransactionsByDateDesc);

		const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);
		const totalIncome = filtered
			.filter((tx) => tx.type === 'income')
			.reduce((sum, tx) => sum + tx.amount, 0);
		const totalExpense = filtered
			.filter((tx) => tx.type === 'expense')
			.reduce((sum, tx) => sum + tx.amount, 0);

		return { filtered, totals: { totalAmount, totalIncome, totalExpense } };
	}, [
		transactions,
		dateRange,
		search,
		filterType,
		filterCategory,
		filterAccount,
		filterMonth,
		routeFilters.endExclusive,
		routeFilters.subcategory,
	]);

	const publishedBudgetProgress = useMemo(
		() =>
			budgets
				.filter((budget) => budget.lifecycleStatus === 'published')
				.map((budget) => calculateBudgetProgress(budget, transactions)),
		[budgets, transactions]
	);

	const getBudgetContext = (transaction: Transaction) => {
		if (transaction.type !== 'expense') return undefined;
		return publishedBudgetProgress.find((item) =>
			transactionMatchesBudget(transaction, item.budget)
		);
	};

	const allCategories = useMemo(
		() =>
			mergeCategoryOptions(
				categoryOptions,
				transactions.map((tx) => tx.category?.trim() || '')
			),
		[categoryOptions, transactions]
	);

	const visibleTransactions = filtered.slice(0, visibleCount);
	const visibleSelectableTransactions = useMemo(
		() => visibleTransactions.filter((tx) => tx.id && tx.type !== 'transfer'),
		[visibleTransactions]
	);
	const selectedCount = selectedIds.size;
	const allVisibleSelected =
		visibleSelectableTransactions.length > 0 &&
		visibleSelectableTransactions.every((tx) => tx.id && selectedIds.has(tx.id));
	const someVisibleSelected = visibleSelectableTransactions.some(
		(tx) => tx.id && selectedIds.has(tx.id)
	);
	const categoryPathOptions = useMemo(
		() => buildCategoryPathOptions(categories),
		[categories]
	);
	const selectedBulkCategory = categoryPathOptions.find(
		(option) => option.value === bulkCategoryValue
	);

	useEffect(() => {
		setSelectedIds((previous) => {
			const availableIds = new Set(
				transactions
					.filter((tx) => tx.id && tx.type !== 'transfer')
					.map((tx) => tx.id!)
			);
			const next = new Set(
				Array.from(previous).filter((id) => availableIds.has(id))
			);
			return next.size === previous.size ? previous : next;
		});
	}, [transactions]);

	useEffect(() => {
		if (selectVisibleRef.current) {
			selectVisibleRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
		}
	}, [allVisibleSelected, someVisibleSelected]);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		if (scrollHeight - scrollTop <= clientHeight + 50 && visibleCount < filtered.length) {
			setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filtered.length));
		}
	};

	const resetVisibleCount = () => setVisibleCount(INITIAL_VISIBLE_COUNT);
	const clearSelection = () => setSelectedIds(new Set());
	const resetVisibleCountAndSelection = () => {
		resetVisibleCount();
		clearSelection();
	};

	const toggleTransactionSelection = (id: string) => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const toggleVisibleSelection = () => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			if (allVisibleSelected) {
				visibleSelectableTransactions.forEach((tx) => {
					if (tx.id) next.delete(tx.id);
				});
			} else {
				visibleSelectableTransactions.forEach((tx) => {
					if (tx.id) next.add(tx.id);
				});
			}
			return next;
		});
	};

	const handleApplyBulkCategory = async () => {
		if (!selectedBulkCategory) return;

		setIsBulkSaving(true);
		try {
			await bulkUpdateTransactionCategories(
				Array.from(selectedIds),
				selectedBulkCategory.category,
				selectedBulkCategory.subcategory
			);
			clearSelection();
			setBulkCategoryValue('');
			toast({
				title: 'Categories updated',
				description: `${selectedCount} ${
					selectedCount === 1 ? 'transaction' : 'transactions'
				} moved to ${selectedBulkCategory.label}.`,
			});
		} catch (error) {
			toast({
				title: 'Categories were not updated',
				description: getAppErrorMessage(error, {
					operation: 'Bulk category update',
				}),
				variant: 'destructive',
			});
		} finally {
			setIsBulkSaving(false);
		}
	};

	const allFiltersHidden =
		!tablePrefs.search &&
		!tablePrefs.type &&
		!tablePrefs.category &&
		!tablePrefs.month &&
		!tablePrefs.dateRange;

	return (
		<PageShell>
			<PageHeader
				title="Transaction history"
				subtitle="Search, filter, and review your activity."
				actions={
					onCreate ? (
						<Button type="button" variant="marketing" onClick={onCreate}>
							<FiPlus className="h-4 w-4" />
							New transaction
						</Button>
					) : undefined
				}
			/>

			<SummaryCardGrid className="mb-6">
				<SummaryCard
					label="Income"
					amount={totals.totalIncome}
					tone="income"
					note="Filtered inflow"
				/>
				<SummaryCard
					label="Expenses"
					amount={totals.totalExpense}
					tone="expense"
					note="Filtered spending"
				/>
				<SummaryCard
					label="Net"
					amount={totals.totalIncome - totals.totalExpense}
					tone={
						totals.totalIncome - totals.totalExpense >= 0
							? 'balance-positive'
							: 'balance-negative'
					}
					note="Income less expenses"
				/>
				<SummaryCard
					label="Transactions"
					value={filtered.length}
					note={`${visibleTransactions.length} currently shown`}
				/>
			</SummaryCardGrid>

			{allFiltersHidden ? (
				<div className="mb-6 flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
					<FiSettings className="h-4 w-4 shrink-0" />
					<span>All filters are hidden.</span>
					<button
						className="ml-1 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-50"
						onClick={() => onOpenSettings?.()}
					>
						Manage in Settings
					</button>
				</div>
			) : (
				<FilterBar className="mb-6">
					{tablePrefs.search && (
						<div className="relative min-w-[220px] flex-1">
							<FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<Input
								placeholder="Search transactions…"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									resetVisibleCountAndSelection();
								}}
								className="h-10 w-full rounded-xl pl-9"
							/>
						</div>
					)}

					{tablePrefs.type && (
						<Select
							value={filterType}
							onValueChange={(value: string) => {
								const nextType = value as 'all' | 'income' | 'expense';
								setFilterType(nextType);
								updateRouteFilters({
									...currentRouteFilters(),
									type: nextType === 'all' ? undefined : nextType,
								});
								resetVisibleCountAndSelection();
							}}
						>
							<SelectTrigger className="h-10 w-[120px] rounded-xl">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="income">Income</SelectItem>
								<SelectItem value="expense">Expense</SelectItem>
							</SelectContent>
						</Select>
					)}

					{tablePrefs.category && (
						<Select
							value={filterCategory}
							onValueChange={(value: string) => {
								setFilterCategory(value);
								updateRouteFilters({
									...currentRouteFilters(),
									category: value === 'all' ? undefined : value,
									subcategory: undefined,
								});
								resetVisibleCountAndSelection();
							}}
						>
							<SelectTrigger className="h-10 w-[150px] rounded-xl">
								<SelectValue placeholder="Category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All categories</SelectItem>
								{allCategories.map((category) => {
									const categoryColor = getCategoryColor(category.value);
									return (
									<SelectItem key={category.value} value={category.value}>
										<div className="flex items-center gap-2">
											<span
												className="h-2.5 w-2.5 rounded-full"
												style={{
													backgroundColor: categoryColor,
												}}
											/>
											{category.label}
										</div>
									</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					)}

					<Select
						value={filterAccount}
						onValueChange={(value: string) => {
							setFilterAccount(value);
							updateRouteFilters({
								...currentRouteFilters(),
								accountId: value === 'all' ? undefined : value,
							});
							resetVisibleCountAndSelection();
						}}
					>
						<SelectTrigger className="h-10 w-[160px] rounded-xl">
							<SelectValue placeholder="Account" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All accounts</SelectItem>
							{accounts.map((account) => (
								<SelectItem key={account.id} value={account.id!}>
									{account.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{tablePrefs.month && (
						<Select
							value={filterMonth}
							onValueChange={(value: string) => {
								setFilterMonth(value);
								resetVisibleCountAndSelection();
							}}
						>
							<SelectTrigger className="h-10 w-[130px] rounded-xl">
								<SelectValue placeholder="Month" />
							</SelectTrigger>
							<SelectContent>
								{MONTHS.map((month) => (
									<SelectItem key={month.value} value={month.value}>
										{month.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{tablePrefs.dateRange && (
						<DateRangeFilter
							dateRange={dateRange}
							onDateRangeChange={(newRange) => {
								setDateRange(newRange);
								updateRouteFilters({
									...currentRouteFilters(),
									startDate: newRange.startDate || undefined,
									endDate: newRange.endDate || undefined,
								});
								resetVisibleCountAndSelection();
							}}
							onClear={() => {
								setDateRange({ startDate: '', endDate: '' });
								updateRouteFilters({
									...currentRouteFilters(),
									startDate: undefined,
									endDate: undefined,
									endExclusive: undefined,
								});
								resetVisibleCountAndSelection();
							}}
						/>
					)}
				</FilterBar>
			)}

			{selectedCount > 0 && (
				<div
					className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-blue-50/50 p-3 dark:border-gray-800 dark:bg-blue-950/30"
					onClick={(event) => event.stopPropagation()}
				>
					<div className="text-sm font-medium">
						{selectedCount} {selectedCount === 1 ? 'transaction' : 'transactions'} selected
					</div>
					<Select
						value={bulkCategoryValue}
						onValueChange={setBulkCategoryValue}
						disabled={isBulkSaving}
					>
						<SelectTrigger className="h-10 min-w-[240px] flex-1 rounded-xl sm:flex-none">
							<SelectValue placeholder="Choose category" />
						</SelectTrigger>
						<SelectContent>
							{categoryPathOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant="marketing"
						onClick={handleApplyBulkCategory}
						disabled={!selectedBulkCategory || isBulkSaving}
					>
						{isBulkSaving ? 'Applying...' : 'Apply'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={clearSelection}
						disabled={isBulkSaving}
					>
						Clear selection
					</Button>
				</div>
			)}

			{filtered.length === 0 ? (
				<EmptyState
					title={transactions.length === 0 ? 'No transactions yet' : 'Nothing to show'}
					description={
						transactions.length === 0
							? hasNoAccounts
								? 'Create an account first, then transactions will appear here.'
								: 'Add your first transaction to start reviewing history.'
							: 'Try adjusting your filters or search.'
					}
					icon={<FiSearch className="h-6 w-6" />}
				/>
			) : (
				<DataListSurface onScroll={handleScroll}>
					<DataListHeader>
						<span className="flex items-center gap-3">
							<input
								ref={selectVisibleRef}
								type="checkbox"
								aria-label="Select visible transactions"
								checked={allVisibleSelected}
								disabled={visibleSelectableTransactions.length === 0}
								onChange={toggleVisibleSelection}
								className="h-4 w-4 rounded border-input accent-primary"
							/>
							Transaction
						</span>
						<span>Amount</span>
						<span>Account and date</span>
					</DataListHeader>
					{visibleTransactions.map((tx) => {
						const categoryColor = getCategoryColor(tx.category);
						const isSelectable = Boolean(tx.id && tx.type !== 'transfer');
						const isSelected = Boolean(tx.id && selectedIds.has(tx.id));
						const account = accounts.find((item) => item.id === tx.accountId);
						const budgetContext = getBudgetContext(tx);
						return (
							<DataListRow
								key={tx.id}
								onClick={() => onSelect(tx)}
								className={cn(
									'cursor-pointer',
									tx.id === selectedId && selectedRow
								)}
							>
								<div className="flex min-w-0 items-start gap-3 pr-12 md:pr-0">
									<input
										type="checkbox"
										aria-label={`Select ${tx.title}`}
										checked={isSelected}
										disabled={!isSelectable || isBulkSaving}
										onChange={() => {
											if (tx.id) toggleTransactionSelection(tx.id);
										}}
										onClick={(event) => event.stopPropagation()}
										className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-40"
									/>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
											{tx.title}
										</p>
										<div className="mt-1 flex flex-wrap items-center gap-2">
											<span
												className="h-2.5 w-2.5 rounded-full"
												style={{ backgroundColor: categoryColor }}
											/>
											<span className="truncate text-xs text-gray-500 dark:text-gray-400">
												{getCategoryPathLabel(tx.category, tx.subcategory)}
											</span>
										</div>
									</div>
								</div>
								<div>
									<Currency
										amount={tx.amount}
										tone={tx.type === 'income' ? 'income' : 'expense'}
										className="text-lg"
									/>
									<p className="mt-1 text-xs capitalize text-gray-500 dark:text-gray-400">
										{tx.type}
									</p>
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium text-gray-800 dark:text-gray-200">
										{account?.name ?? 'Unknown account'}
									</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										{getTransactionDateOrEpoch(
											tx.date,
											tx.createdAt
										).toLocaleDateString('en-ZA', {
											day: 'numeric',
											month: 'short',
											year: 'numeric',
										})}
									</p>
									{budgetContext && (
										<p
											className={cn(
												'mt-1 text-xs font-medium',
												budgetContext.remaining >= 0
													? 'text-blue-600 dark:text-blue-400'
													: 'text-red-600 dark:text-red-400'
											)}
										>
											{getCategoryPathLabel(
												budgetContext.budget.categoryId,
												budgetContext.budget.subCategoryId
											)}
											{' · '}
											{budgetContext.remaining >= 0
												? `${formatCurrency(budgetContext.remaining)} remaining`
												: `${formatCurrency(
														Math.abs(budgetContext.remaining)
													)} over budget`}
										</p>
									)}
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="absolute right-3 top-3 h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
									onClick={(event) => {
										event.stopPropagation();
										if (tx.id) onDelete(tx.id);
									}}
									aria-label={`Delete ${tx.title}`}
								>
									<FiTrash2 className="h-4 w-4" />
								</Button>
							</DataListRow>
						);
					})}
				</DataListSurface>
			)}

			{visibleCount < filtered.length && (
				<div className="mt-4 flex justify-center">
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							setVisibleCount((count) =>
								Math.min(count + LOAD_MORE_COUNT, filtered.length)
							)
						}
					>
						Load more
					</Button>
				</div>
			)}
		</PageShell>
	);
};

export default TransactionsTable;
