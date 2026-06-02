import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiTrash2, FiSettings } from 'react-icons/fi';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import DateRangeFilter from '@/shared/filters/components/DateRangeFilter';
import { filterTransactionsByDateRangeObject } from '@/shared/filters/utils/dateRangeFilter';
import { formatCurrency } from '@/utils/formatCurrency';
import { DateRange, Transaction } from '@/types';
import { compareTransactionsByDateDesc, getTransactionDateOrEpoch } from '@/utils/date';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/app/ui/table';
import { Input } from '@/components/app/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { Button } from '@/components/app/ui/button';
import { Badge } from '@/components/app/ui/badge';
import { useToast } from '@/components/app/ui/use-toast';
import { useFilterPreferences } from '@/shared/filters/context/FilterPreferencesContext';
import {
	buildCategoryPathOptions,
	mergeCategoryOptions,
} from '@/domains/categories/utils/categories';
import { getCategoryColor } from '@/domains/categories/utils/categoryColors';

interface TransactionsTableProps {
	onDelete: (id: string) => void;
	onSelect: (tx: Transaction) => void;
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
	selectedId,
	onOpenSettings,
}) => {
	const { transactions, bulkUpdateTransactionCategories } = useTransactionsContext();
	const { accounts, loading: accountsLoading } = useAccountsContext();
	const { categories, categoryOptions, getCategoryPathLabel } = useCategoriesContext();
	const { prefs } = useFilterPreferences();
	const { toast } = useToast();
	const tablePrefs = prefs.transactionsTable;
	const [search, setSearch] = useState('');
	const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
	const [filterCategory, setFilterCategory] = useState('all');
	const [filterMonth, setFilterMonth] = useState('all');
	const [dateRange, setDateRange] = useState<DateRange>({
		startDate: '',
		endDate: '',
	});
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [bulkCategoryValue, setBulkCategoryValue] = useState('');
	const [isBulkSaving, setIsBulkSaving] = useState(false);
	const selectVisibleRef = useRef<HTMLInputElement>(null);
	const hasNoAccounts = !accountsLoading && accounts.length === 0;

	const { filtered, totals } = useMemo(() => {
		const dateFiltered = filterTransactionsByDateRangeObject(transactions, dateRange);

		const filtered = dateFiltered
			.filter((tx) => {
				const searchText = `${tx.title} ${tx.subcategory ?? ''}`.toLowerCase();
				const matchesSearch = searchText.includes(search.toLowerCase());
				const matchesType = filterType === 'all' || tx.type === filterType;
				const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
				const dateValue = tx.date ?? tx.createdAt;
				const month = dateValue
					? new Date(
						typeof dateValue === 'object' && 'toDate' in dateValue
							? dateValue.toDate()
							: dateValue
					).getMonth()
					: -1;
				const matchesMonth = filterMonth === 'all' || month === parseInt(filterMonth);

				return matchesSearch && matchesType && matchesCategory && matchesMonth;
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
	}, [transactions, dateRange, search, filterType, filterCategory, filterMonth]);

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
				title: 'Update failed',
				description:
					error instanceof Error
						? error.message
						: 'Could not update the selected transactions.',
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

	const amountHeader =
		filterType === 'all'
			? `Amount (Total: ${formatCurrency(totals.totalAmount)}, Income: ${formatCurrency(totals.totalIncome)}, Expense: ${formatCurrency(totals.totalExpense)})`
			: filterType === 'income'
				? `Amount (Total Income: ${formatCurrency(totals.totalIncome)})`
				: `Amount (Total Expense: ${formatCurrency(totals.totalExpense)})`;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			{/* Prompt-style Header */}
			<div className="flex flex-col gap-1">
				<h2 className="text-xl font-semibold tracking-tight">Transaction history</h2>
				<p className="text-sm text-muted-foreground">
					Search, filter, and review your activity.
				</p>
			</div>

			{/* Control Bar */}
			{allFiltersHidden ? (
				<div className="flex items-center gap-2 rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
					<FiSettings className="h-4 w-4 shrink-0" />
					<span>All filters are hidden.</span>
					<button
						className="ml-1 underline underline-offset-2 hover:text-foreground"
						onClick={() => onOpenSettings?.()}
					>
						Manage in Settings
					</button>
				</div>
			) : (
				<div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
					{tablePrefs.search && (
						<Input
							placeholder="Search transactions…"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								resetVisibleCountAndSelection();
							}}
							className="h-10 flex-1 min-w-[220px] border-none focus-visible:ring-0"
						/>
					)}

					{tablePrefs.type && (
						<Select
							value={filterType}
							onValueChange={(value: string) => {
								setFilterType(value as 'all' | 'income' | 'expense');
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
								resetVisibleCountAndSelection();
							}}
							onClear={() => {
								setDateRange({ startDate: '', endDate: '' });
								resetVisibleCountAndSelection();
							}}
						/>
					)}
				</div>
			)}

			{selectedCount > 0 && (
				<div
					className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/40 p-3"
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

			{/* Table Surface */}
			<div className="rounded-2xl border bg-card">
				<div
					className="relative max-h-[calc(var(--vh-screen)-220px)] overflow-auto"
					onScroll={handleScroll}
				>
					<Table>
						<TableHeader className="sticky top-0 z-10 bg-card/80 backdrop-blur">
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-12">
									<input
										ref={selectVisibleRef}
										type="checkbox"
										aria-label="Select visible transactions"
										checked={allVisibleSelected}
										disabled={visibleSelectableTransactions.length === 0}
										onChange={toggleVisibleSelection}
										onClick={(event) => event.stopPropagation()}
										className="h-4 w-4 rounded border-input accent-primary"
									/>
								</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="text-right">{amountHeader}</TableHead>
								<TableHead className="text-right">Date</TableHead>
								<TableHead className="text-right">Category</TableHead>
								<TableHead className="text-right"></TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{visibleTransactions.map((tx) => {
								const categoryColor = getCategoryColor(tx.category);
								const isSelectable = Boolean(tx.id && tx.type !== 'transfer');
								const isSelected = Boolean(tx.id && selectedIds.has(tx.id));
								return (
								<TableRow
									key={tx.id}
									onClick={() => onSelect(tx)}
									className={`cursor-pointer transition-colors ${tx.id === selectedId ? 'bg-muted' : 'hover:bg-muted/40'
										}`}
								>
									<TableCell>
										<input
											type="checkbox"
											aria-label={`Select ${tx.title}`}
											checked={isSelected}
											disabled={!isSelectable || isBulkSaving}
											onChange={() => {
												if (tx.id) toggleTransactionSelection(tx.id);
											}}
											onClick={(event) => event.stopPropagation()}
											className="h-4 w-4 rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-40"
										/>
									</TableCell>
									<TableCell>
										<div className="font-medium">{tx.title}</div>
										<div className="text-xs text-muted-foreground">
											{tx.type}
										</div>
									</TableCell>

									<TableCell
										className={`text-right font-medium ${tx.type === 'income'
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'
											}`}
									>
										{formatCurrency(tx.amount)}
									</TableCell>

									<TableCell className="text-right text-sm text-muted-foreground">
										{(() => {
											return getTransactionDateOrEpoch(
												tx.date,
												tx.createdAt
											).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											});
										})()}
									</TableCell>

									<TableCell className="text-right">
										<Badge
											className="text-white"
											style={{
												backgroundColor: categoryColor,
											}}
										>
											{getCategoryPathLabel(tx.category, tx.subcategory)}
										</Badge>
									</TableCell>

									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={(e) => {
												e.stopPropagation();
												if (tx.id) onDelete(tx.id);
											}}
										>
											<FiTrash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
								);
							})}

							{filtered.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className="py-16 text-center">
										<div className="space-y-1">
											<div className="text-sm font-medium">
												{transactions.length === 0
													? 'No transactions yet'
													: 'Nothing to show'}
											</div>
											<div className="text-sm text-muted-foreground">
												{transactions.length === 0
													? hasNoAccounts
														? 'Create an account first, then transactions will appear here.'
														: 'Add your first transaction to start reviewing history.'
													: 'Try adjusting your filters or search.'}
											</div>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
};

export default TransactionsTable;
