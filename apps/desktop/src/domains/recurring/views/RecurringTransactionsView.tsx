import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiDollarSign, FiX, FiSettings } from 'react-icons/fi';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { RecurringTransaction } from '@/domains/recurring/models/RecurringTransactionModel';
import { Button } from '@/components/app/ui/button';
import { Badge } from '@/components/app/ui/badge';
import RecurringTransactionForm from './RecurringTransactionForm';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { PageHeader, PageShell } from '@/components/app/page-layout';
import { cardSurface } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { useFilterPreferences } from '@/shared/filters/context/FilterPreferencesContext';
import { mergeCategoryOptions } from '@cash-flow/shared/categories/categories';
import RecurringTransactionsCalendar from './RecurringTransactionsCalendar';
import {
	getRecurringExpectedDateLabel,
	getRecurringFrequencyLabel,
} from './recurringDisplay';

const FREQUENCY_OPTIONS = [
	{ value: 'all', label: 'All Frequencies' },
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'yearly', label: 'Yearly' },
];

const TYPE_OPTIONS = [
	{ value: 'all', label: 'All Types' },
	{ value: 'expense', label: 'Expense' },
	{ value: 'income', label: 'Income' },
];

const EXPECTED_DATE_OPTIONS = [
	{ value: 'all', label: 'All Dates' },
	...Array.from({ length: 31 }, (_, index) => {
		const day = index + 1;
		return { value: String(day), label: `Day ${day}` };
	}),
];

type SortBy =
	| 'default'
	| 'alpha-asc'
	| 'alpha-desc'
	| 'price-asc'
	| 'price-desc'
	| 'expected-date-asc'
	| 'expected-date-desc';

type ViewMode = 'list' | 'calendar';

const RECURRING_VIEW_MODE_STORAGE_KEY = 'recurringTransactions.viewMode';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
	{ value: 'default', label: 'Default order' },
	{ value: 'alpha-asc', label: 'Name A → Z' },
	{ value: 'alpha-desc', label: 'Name Z → A' },
	{ value: 'price-asc', label: 'Price: Low → High' },
	{ value: 'price-desc', label: 'Price: High → Low' },
	{ value: 'expected-date-asc', label: 'Expected Day: Low → High' },
	{ value: 'expected-date-desc', label: 'Expected Day: High → Low' },
];

const buildFilterLabel = (
	frequencyFilter: string,
	categoryFilter: string,
	typeFilter: string,
	expectedDateFilter: string,
	sortBy: SortBy,
	categoryOptions: Array<{ value: string; label: string }>
): string => {
	const parts: string[] = [];
	if (frequencyFilter !== 'all') parts.push(getRecurringFrequencyLabel(frequencyFilter));
	if (categoryFilter !== 'all') {
		const opt = categoryOptions.find((o) => o.value === categoryFilter);
		if (opt) parts.push(opt.label);
	}
	if (typeFilter !== 'all') {
		parts.push(typeFilter === 'expense' ? 'Expenses' : 'Income');
	}
	if (expectedDateFilter !== 'all') {
		parts.push(`Day ${expectedDateFilter}`);
	}
	if (sortBy !== 'default') {
		const sortOpt = SORT_OPTIONS.find((o) => o.value === sortBy);
		if (sortOpt) parts.push(sortOpt.label);
	}
	return parts.length > 0 ? parts.join(' · ') : 'All recurring';
};

const RecurringTransactionsView: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
	const { recurringTransactions, deleteRecurringTransaction, recurringTransactionsLoading } =
		useTransactionsContext();
	const { categoryOptions, getCategoryPathLabel } = useCategoriesContext();
	const { accounts } = useAccountsContext();

	const { prefs } = useFilterPreferences();
	const recurringPrefs = prefs.recurring;

	const [frequencyFilter, setFrequencyFilter] = useState('all');
	const [categoryFilter, setCategoryFilter] = useState('all');
	const [typeFilter, setTypeFilter] = useState('all');
	const [expectedDateFilter, setExpectedDateFilter] = useState('all');
	const [sortBy, setSortBy] = useState<SortBy>('default');
	const [viewMode, setViewMode] = useState<ViewMode>(() => {
		if (typeof window === 'undefined') return 'list';
		const stored = window.localStorage.getItem(RECURRING_VIEW_MODE_STORAGE_KEY);
		return stored === 'list' || stored === 'calendar' ? stored : 'list';
	});
	const [isDesktopCalendarAllowed, setIsDesktopCalendarAllowed] = useState(
		() => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA_QUERY).matches
	);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | undefined>(undefined);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
	const filterCategoryOptions = useMemo(
		() => [
			{ value: 'all', label: 'All Categories' },
			...mergeCategoryOptions(
				categoryOptions,
				recurringTransactions.map((transaction) => transaction.category)
			),
		],
		[categoryOptions, recurringTransactions]
	);

	const isHydrated = useRef(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
		const handleViewportChange = (event: MediaQueryListEvent) => {
			setIsDesktopCalendarAllowed(event.matches);
		};

		mediaQuery.addEventListener('change', handleViewportChange);

		return () => {
			mediaQuery.removeEventListener('change', handleViewportChange);
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const readViewMode = () => {
			const storedMode = window.localStorage.getItem(RECURRING_VIEW_MODE_STORAGE_KEY);
			if (storedMode === 'list' || (storedMode === 'calendar' && isDesktopCalendarAllowed)) {
				setViewMode(storedMode);
			} else if (!isDesktopCalendarAllowed) {
				setViewMode('list');
			}
		};

		readViewMode();
		isHydrated.current = true;
		window.addEventListener('recurring-view-mode-changed', readViewMode);
		return () => window.removeEventListener('recurring-view-mode-changed', readViewMode);
	}, [isDesktopCalendarAllowed]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!isHydrated.current) return;
		if (!isDesktopCalendarAllowed) return;
		window.localStorage.setItem(RECURRING_VIEW_MODE_STORAGE_KEY, viewMode);
	}, [viewMode, isDesktopCalendarAllowed]);

	const hasActiveFilters =
		frequencyFilter !== 'all' ||
		categoryFilter !== 'all' ||
		typeFilter !== 'all' ||
		expectedDateFilter !== 'all' ||
		sortBy !== 'default';

	const allFiltersHidden =
		!recurringPrefs.frequency &&
		!recurringPrefs.category &&
		!recurringPrefs.type &&
		!recurringPrefs.date &&
		!recurringPrefs.sortBy;

	const filteredTransactions = useMemo(() => {
		const filtered = recurringTransactions.filter((transaction) => {
			if (frequencyFilter !== 'all' && transaction.frequency !== frequencyFilter) return false;
			if (categoryFilter !== 'all' && transaction.category !== categoryFilter) return false;
			if (typeFilter !== 'all') {
				const transactionType = transaction.type ?? 'expense';
				if (transactionType !== typeFilter) return false;
			}
			if (
				expectedDateFilter !== 'all' &&
				transaction.expectedDate !== Number(expectedDateFilter)
			) {
				return false;
			}
			return true;
		});

		if (sortBy === 'alpha-asc') {
			filtered.sort((a, b) => a.title.localeCompare(b.title));
		} else if (sortBy === 'alpha-desc') {
			filtered.sort((a, b) => b.title.localeCompare(a.title));
		} else if (sortBy === 'price-asc') {
			filtered.sort((a, b) => a.amount - b.amount);
		} else if (sortBy === 'price-desc') {
			filtered.sort((a, b) => b.amount - a.amount);
		} else if (sortBy === 'expected-date-asc') {
			filtered.sort((a, b) => {
				const dayA = a.expectedDate ?? Number.MAX_SAFE_INTEGER;
				const dayB = b.expectedDate ?? Number.MAX_SAFE_INTEGER;
				return dayA - dayB;
			});
		} else if (sortBy === 'expected-date-desc') {
			filtered.sort((a, b) => {
				const dayA = a.expectedDate ?? Number.MIN_SAFE_INTEGER;
				const dayB = b.expectedDate ?? Number.MIN_SAFE_INTEGER;
				return dayB - dayA;
			});
		}

		return filtered;
	}, [recurringTransactions, frequencyFilter, categoryFilter, typeFilter, expectedDateFilter, sortBy]);

	const filteredTotal = useMemo(
		() => filteredTransactions.reduce((sum, e) => sum + e.amount, 0),
		[filteredTransactions]
	);

	const filterLabel = useMemo(
		() =>
			buildFilterLabel(
				frequencyFilter,
				categoryFilter,
				typeFilter,
				expectedDateFilter,
				sortBy,
				filterCategoryOptions
			),
		[frequencyFilter, categoryFilter, typeFilter, expectedDateFilter, sortBy, filterCategoryOptions]
	);

	const handleEdit = (transaction: RecurringTransaction) => {
		setEditingTransaction(transaction);
		setIsFormOpen(true);
	};

	const handleDeleteClick = (id: string) => {
		setTransactionToDelete(id);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (transactionToDelete) {
			try {
				await deleteRecurringTransaction(transactionToDelete);
				setDeleteDialogOpen(false);
				setTransactionToDelete(null);
			} catch (error) {
				console.error('Error deleting recurring transaction:', error);
			}
		}
	};

	const handleAddNew = () => {
		setEditingTransaction(undefined);
		setIsFormOpen(true);
	};

	const handleCloseForm = () => {
		setIsFormOpen(false);
		setEditingTransaction(undefined);
	};

	const handleResetFilters = () => {
		setFrequencyFilter('all');
		setCategoryFilter('all');
		setTypeFilter('all');
		setExpectedDateFilter('all');
		setSortBy('default');
	};

	if (recurringTransactionsLoading) {
		return (
			<div className="flex flex-1 items-center justify-center" aria-live="polite">
				<div className="text-sm text-gray-500 dark:text-gray-400">Loading recurring transactions...</div>
			</div>
		);
	}

	return (
		<PageShell>
			<PageHeader
				badge="Recurring"
				title="Recurring Transactions"
				subtitle="Manage your subscriptions, debit orders, salary, and other recurring transactions."
				compact
				actions={
					<div className="flex flex-col items-end gap-2">
						<div
							className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900"
							role="tablist"
							aria-label="Recurring transactions view mode"
						>
							<button
								type="button"
								role="tab"
								aria-selected={viewMode === 'list'}
								className={cn(
									'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
									viewMode === 'list'
										? 'bg-blue-600 text-white shadow-sm'
										: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'
								)}
								onClick={() => setViewMode('list')}
							>
								List
							</button>
							{isDesktopCalendarAllowed && (
								<button
									type="button"
									role="tab"
									aria-selected={viewMode === 'calendar'}
									className={cn(
										'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
										viewMode === 'calendar'
											? 'bg-blue-600 text-white shadow-sm'
											: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'
									)}
									onClick={() => setViewMode('calendar')}
								>
									Calendar
								</button>
							)}
						</div>
						<Button variant="marketing" onClick={handleAddNew} className="flex-shrink-0">
							<FiPlus className="mr-2 h-4 w-4" />
							Add New
						</Button>
					</div>
				}
				className="mb-6"
			/>

			{/* Filter Bar */}
			{allFiltersHidden ? (
				<div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-gray-500 dark:text-gray-400">
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
				<div className="mb-4 flex flex-wrap items-center gap-3">
					{recurringPrefs.frequency && (
						<Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
							<SelectTrigger className="h-9 w-44 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FREQUENCY_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{recurringPrefs.category && (
						<Select value={categoryFilter} onValueChange={setCategoryFilter}>
							<SelectTrigger className="h-9 w-44 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{filterCategoryOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{recurringPrefs.type && (
						<Select value={typeFilter} onValueChange={setTypeFilter}>
							<SelectTrigger className="h-9 w-36 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TYPE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{recurringPrefs.date && (
						<Select value={expectedDateFilter} onValueChange={setExpectedDateFilter}>
							<SelectTrigger className="h-9 w-36 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{EXPECTED_DATE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{recurringPrefs.sortBy && (
						<Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
							<SelectTrigger className="h-9 w-48 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SORT_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleResetFilters}
							className="h-9 gap-1 text-gray-500 dark:text-gray-400 hover:text-foreground"
						>
							<FiX className="h-4 w-4" />
							Reset
						</Button>
					)}
				</div>
			)}

			{/* Total Summary Card */}
			<div className={cn('mb-6 p-4', cardSurface)}>
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<FiDollarSign className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-xs text-gray-500 dark:text-gray-400">{filterLabel}</p>
							<p className="text-2xl font-bold tracking-tight">
								{formatCurrency(filteredTotal)}
							</p>
						</div>
					</div>
					<Badge variant="secondary" className="text-sm">
						{filteredTransactions.length}{' '}
						{filteredTransactions.length === 1 ? 'item' : 'items'}
					</Badge>
				</div>
			</div>

			{/* Transaction Content */}
			{filteredTransactions.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
					<FiDollarSign className="mx-auto mb-3 h-10 w-10 text-gray-500 dark:text-gray-400/50" />
					<p className="font-medium text-gray-500 dark:text-gray-400">
						{hasActiveFilters
							? 'No transactions match the current filters'
							: 'No recurring transactions yet'}
					</p>
					{!hasActiveFilters && (
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Add one to track your subscriptions, debit orders, and income.
						</p>
					)}
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleResetFilters}
							className="mt-3"
						>
							Clear filters
						</Button>
					)}
				</div>
			) : viewMode === 'list' ? (
				<div role="list" className="space-y-3">
					{filteredTransactions.map((expense) => (
						<div
							key={expense.id}
							role="listitem"
							className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<h4 className="font-medium">{expense.title}</h4>
									<Badge variant="outline" className="text-xs">
										{getRecurringFrequencyLabel(expense.frequency)}
									</Badge>
									{expense.expectedDate !== undefined && (
										<Badge variant="outline" className="text-xs">
											{getRecurringExpectedDateLabel(expense.expectedDate)}
										</Badge>
									)}
									{(expense.type === 'income') ? (
										<Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">
											Income
										</Badge>
									) : (
										<Badge variant="secondary" className="text-xs text-red-600 dark:text-red-400">
											Expense
										</Badge>
									)}
								</div>
								<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
									<span className="font-medium text-foreground">
										{formatCurrency(expense.amount)}
									</span>
									<span>•</span>
									<span>{getCategoryPathLabel(expense.category, expense.subcategory)}</span>
									{expense.accountId && (() => {
										const acct = accounts.find((a) => a.id === expense.accountId);
										return acct ? (
											<>
												<span>•</span>
												<span className="flex items-center gap-1">
													<span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: acct.color ?? '#6366f1' }} />
													{acct.name}
												</span>
											</>
										) : null;
									})()}
									{expense.description && (
										<>
											<span>•</span>
											<span className="truncate">{expense.description}</span>
										</>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2 sm:justify-end">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleEdit(expense)}
									className="h-9 w-9"
									aria-label="Edit recurring transaction"
								>
									<FiEdit className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDeleteClick(expense.id!)}
									className="h-9 w-9 text-destructive hover:text-destructive"
									aria-label="Delete recurring transaction"
								>
									<FiTrash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			) : (
				<RecurringTransactionsCalendar
					transactions={filteredTransactions}
					onEdit={handleEdit}
					onDelete={handleDeleteClick}
					getCategoryPathLabel={getCategoryPathLabel}
				/>
			)}

			{/* Add / Edit Form Dialog */}
			<Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
				<DialogContent className="sm:max-w-lg overflow-y-auto">
					<RecurringTransactionForm transaction={editingTransaction} onClose={handleCloseForm} />
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Deletion</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this recurring transaction? This action
							cannot be undone.
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
		</PageShell>
	);
};

export default RecurringTransactionsView;
