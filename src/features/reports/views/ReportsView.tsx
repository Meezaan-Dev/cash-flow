import React, { useCallback, useMemo, useState } from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { FiChevronLeft, FiChevronRight, FiSettings, FiX } from 'react-icons/fi';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/features/categories/context/CategoriesContext';
import { MonthlyCategorySummary, Transaction } from '@/types';
import {
	getCurrentMonthDateRange,
	getMonthlyAccountSummaries,
	getMonthlyCategorySummaries,
	getMonthDateRange,
	getMonthlyTrend,
	getNetWorth,
	getPreviousMonthDateRange,
} from '@/features/reports/controllers/ReportsController';
import {
	clampDigestDay,
	DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD,
	DashboardDigestCustomPeriod,
	getDashboardDigestDateRange,
} from '@/features/dashboard/utils/digestPeriod';
import { filterTransactionsByDateRangeObject } from '@/features/filters/utils/dateRangeFilter';
import { compareTransactionsByDateDesc } from '@/utils/date';
import { formatCurrency } from '@/utils/formatCurrency';
import { useFilterPreferences } from '@/features/filters/context/FilterPreferencesContext';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';

interface ReportsViewProps {
	onOpenSettings?: () => void;
}

type ReportMode = 'expense' | 'income' | 'net';
type PeriodMode = 'month' | 'customCycle';

const getInitialSelectedMonth = () => {
	const today = new Date();
	return new Date(today.getFullYear(), today.getMonth(), 1);
};

const getMonthLabel = (month: Date) =>
	month.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

const getTransactionDate = (transaction: Transaction): Date | null => {
	const value = transaction.date ?? transaction.createdAt;
	if (!value) return null;
	return value instanceof Date ? value : value.toDate();
};

const ReportsView: React.FC<ReportsViewProps> = ({ onOpenSettings }) => {
	const { transactions } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryLabel, getCategoryPathLabel } = useCategoriesContext();
	const { prefs } = useFilterPreferences();
	const reportPrefs = prefs.reports;

	const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
	const [selectedMonth, setSelectedMonth] = useState<Date>(getInitialSelectedMonth);
	const [customCycle, setCustomCycle] = useState<DashboardDigestCustomPeriod>(
		() => DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD
	);
	const [reportMode, setReportMode] = useState<ReportMode>('expense');
	const [selectedAccountId, setSelectedAccountId] = useState('all');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

	const activeDateRange = useMemo(() => {
		if (periodMode === 'customCycle') {
			const referenceDate = new Date(
				selectedMonth.getFullYear(),
				selectedMonth.getMonth(),
				15
			);
			return getDashboardDigestDateRange(customCycle, referenceDate);
		}
		const today = new Date();
		if (
			selectedMonth.getFullYear() === today.getFullYear() &&
			selectedMonth.getMonth() === today.getMonth()
		) {
			return getCurrentMonthDateRange(today);
		}
		return getMonthDateRange(selectedMonth.getFullYear(), selectedMonth.getMonth());
	}, [customCycle, periodMode, selectedMonth]);

	const previousDateRange = useMemo(
		() => getPreviousMonthDateRange(activeDateRange),
		[activeDateRange]
	);
	const accountScopedTransactions = useMemo(
		() =>
			selectedAccountId === 'all'
				? transactions
				: transactions.filter((transaction) => transaction.accountId === selectedAccountId),
		[selectedAccountId, transactions]
	);
	const filteredTransactions = useMemo(
		() => filterTransactionsByDateRangeObject(accountScopedTransactions, activeDateRange),
		[accountScopedTransactions, activeDateRange]
	);

	const monthlyTrend = useMemo(
		() =>
			getMonthlyTrend(transactions, 6).map((entry) => ({
				...entry,
				net: entry.income - entry.expense,
			})),
		[transactions]
	);
	const categorySummaries = useMemo(
		() =>
			getMonthlyCategorySummaries(
				accountScopedTransactions,
				activeDateRange,
				previousDateRange
			),
		[accountScopedTransactions, activeDateRange, previousDateRange]
	);
	const accountSummaries = useMemo(
		() =>
			getMonthlyAccountSummaries(
				transactions,
				accounts,
				activeDateRange,
				selectedAccountId === 'all' ? undefined : selectedAccountId
			),
		[accounts, activeDateRange, selectedAccountId, transactions]
	);
	const netWorth = useMemo(() => getNetWorth(accounts), [accounts]);

	const totalIncome = useMemo(
		() =>
			filteredTransactions
				.filter((transaction) => transaction.type === 'income')
				.reduce((sum, transaction) => sum + transaction.amount, 0),
		[filteredTransactions]
	);
	const totalExpense = useMemo(
		() =>
			filteredTransactions
				.filter((transaction) => transaction.type === 'expense')
				.reduce((sum, transaction) => sum + transaction.amount, 0),
		[filteredTransactions]
	);

	const focusedTransactions = useMemo(() => {
		if (!selectedCategory) return [];

		return filteredTransactions
			.filter((transaction) => {
				if (transaction.type !== 'expense') return false;
				if (transaction.category !== selectedCategory) return false;
				if (selectedSubcategory === null) return true;
				return (transaction.subcategory ?? '') === selectedSubcategory;
			})
			.sort(compareTransactionsByDateDesc)
			.slice(0, 6);
	}, [filteredTransactions, selectedCategory, selectedSubcategory]);

	const biggestCategory = categorySummaries[0];
	const biggestSubcategory = categorySummaries
		.flatMap((category) => category.subcategories)
		.sort((left, right) => right.amount - left.amount)[0];
	const netPosition = totalIncome - totalExpense;

	const getSubcategoryDisplayLabel = useCallback(
		(category: string, subcategory?: string) =>
			subcategory
				? getCategoryPathLabel(category, subcategory)
				: `${getCategoryLabel(category)} / No subcategory`,
		[getCategoryLabel, getCategoryPathLabel]
	);
	const formatTick = (value: number) => {
		if (Math.abs(value) >= 1000) return `R${(value / 1000).toFixed(0)}k`;
		return `R${value}`;
	};
	const formatDate = (transaction: Transaction) => {
		const date = getTransactionDate(transaction);
		if (!date) return 'No date';
		return date.toLocaleDateString('en-ZA', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};
	const accountNameMap = useMemo(
		() =>
			Object.fromEntries(
				accounts
					.filter((account) => account.id)
					.map((account) => [account.id, account.name])
			),
		[accounts]
	);
	const hasVisibleReportSections =
		reportPrefs.summaryCards ||
		reportPrefs.incomeExpenseTrend ||
		reportPrefs.categoryBreakdown ||
		reportPrefs.subcategoryBreakdown ||
		reportPrefs.accountActivity ||
		reportPrefs.netWorth;
	const moveMonth = (offset: number) => {
		setSelectedMonth(
			(current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
		);
		setSelectedCategory(null);
		setSelectedSubcategory(null);
	};
	const resetToCurrentMonth = () => {
		setSelectedMonth(getInitialSelectedMonth());
		setPeriodMode('month');
		setSelectedCategory(null);
		setSelectedSubcategory(null);
	};
	const handleCustomCycleDayChange = (field: 'startDay' | 'endDay', value: string) => {
		setCustomCycle((current) => ({
			...current,
			[field]: clampDigestDay(Number(value)),
		}));
		setPeriodMode('customCycle');
		setSelectedCategory(null);
		setSelectedSubcategory(null);
	};
	const openCustomCycle = () => {
		setPeriodMode('customCycle');
		setSelectedCategory(null);
		setSelectedSubcategory(null);
	};
	const selectCategory = (category: MonthlyCategorySummary) => {
		setSelectedCategory((current) => (current === category.category ? null : category.category));
		setSelectedSubcategory(null);
	};
	const selectedSubcategoryLabel =
		selectedCategory && selectedSubcategory !== null
			? getSubcategoryDisplayLabel(selectedCategory, selectedSubcategory || undefined)
			: null;

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				<div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
							Monthly Reports
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							A month-first view with visible amounts, category decisions, and account review.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex rounded-lg border bg-card p-1">
							{(['expense', 'income', 'net'] as ReportMode[]).map((mode) => (
								<button
									key={mode}
									type="button"
									onClick={() => setReportMode(mode)}
									className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${reportMode === mode
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:text-foreground'
										}`}
								>
									{mode}
								</button>
							))}
						</div>
					</div>
				</div>

				{reportPrefs.dateRange && (
					<div className="mb-6 space-y-3 rounded-xl border bg-card p-4">
						<div className="flex flex-wrap items-center gap-2">
							<Button type="button" variant="outline" size="icon" onClick={() => moveMonth(-1)}>
								<FiChevronLeft className="h-4 w-4" />
							</Button>
							<div className="min-w-[210px] rounded-lg border bg-background px-4 py-2 text-sm font-semibold">
								{periodMode === 'month' ? getMonthLabel(selectedMonth) : 'Custom cycle'}
							</div>
							<Button type="button" variant="outline" size="icon" onClick={() => moveMonth(1)}>
								<FiChevronRight className="h-4 w-4" />
							</Button>
							<Button type="button" variant="outline" onClick={resetToCurrentMonth}>
								Current month
							</Button>
							<Button
								type="button"
								variant={periodMode === 'customCycle' ? 'default' : 'outline'}
								onClick={openCustomCycle}
							>
								Custom cycle
							</Button>
							<Select
								value={selectedAccountId}
								onValueChange={(value) => {
									setSelectedAccountId(value);
									setSelectedCategory(null);
									setSelectedSubcategory(null);
								}}
							>
								<SelectTrigger className="h-10 w-[190px] rounded-xl">
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
						</div>
						{periodMode === 'customCycle' && (
							<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
								<div className="flex-1 sm:flex-initial">
									<Label htmlFor="reports-start-day" className="mb-2 block text-xs md:text-sm font-medium">
										Start day
									</Label>
									<Input
										id="reports-start-day"
										type="number"
										min={1}
										max={31}
										value={customCycle.startDay}
										onChange={(event) =>
											handleCustomCycleDayChange('startDay', event.target.value)
										}
										className="h-10 w-full sm:w-28"
									/>
								</div>
								<div className="flex-1 sm:flex-initial">
									<Label htmlFor="reports-end-day" className="mb-2 block text-xs md:text-sm font-medium">
										End day
									</Label>
									<Input
										id="reports-end-day"
										type="number"
										min={1}
										max={31}
										value={customCycle.endDay}
										onChange={(event) =>
											handleCustomCycleDayChange('endDay', event.target.value)
										}
										className="h-10 w-full sm:w-28"
									/>
								</div>
							</div>
						)}
						<div className="text-xs text-muted-foreground">
							Showing {activeDateRange.startDate} to {activeDateRange.endDate}
						</div>
					</div>
				)}

				{!hasVisibleReportSections && (
					<div className="flex items-center gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
						<FiSettings className="h-4 w-4 shrink-0" />
						<span>Reports are hidden.</span>
						<button
							className="ml-1 underline underline-offset-2 hover:text-foreground"
							onClick={() => onOpenSettings?.()}
						>
							Manage in Settings
						</button>
					</div>
				)}

				{reportPrefs.summaryCards && (
					<div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div className="rounded-xl border bg-card p-4">
							<p className="text-xs text-muted-foreground">Monthly expenses</p>
							<p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
								{formatCurrency(totalExpense)}
							</p>
							<p className="text-sm text-muted-foreground">
								{
									filteredTransactions.filter(
										(transaction) => transaction.type === 'expense'
									).length
								}{' '}
								transactions
							</p>
						</div>
						<div className="rounded-xl border bg-card p-4">
							<p className="text-xs text-muted-foreground">Biggest category</p>
							<p className="mt-1 truncate text-xl font-bold">
								{biggestCategory ? getCategoryLabel(biggestCategory.category) : 'None yet'}
							</p>
							<p className="text-sm text-muted-foreground">
								{biggestCategory ? formatCurrency(biggestCategory.amount) : 'No expenses'}
							</p>
						</div>
						<div className="rounded-xl border bg-card p-4">
							<p className="text-xs text-muted-foreground">Biggest subcategory</p>
							<p className="mt-1 truncate text-xl font-bold">
								{biggestSubcategory
									? getSubcategoryDisplayLabel(
										biggestSubcategory.category,
										biggestSubcategory.subcategory
									)
									: 'None yet'}
							</p>
							<p className="text-sm text-muted-foreground">
								{biggestSubcategory ? formatCurrency(biggestSubcategory.amount) : 'No subcategories'}
							</p>
						</div>
						<div className="rounded-xl border bg-card p-4">
							<p className="text-xs text-muted-foreground">Net position</p>
							<p
								className={`mt-1 text-xl font-bold ${netPosition >= 0
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'
									}`}
							>
								{formatCurrency(netPosition)}
							</p>
							<p className="text-sm text-muted-foreground">
								Income {formatCurrency(totalIncome)}
							</p>
						</div>
					</div>
				)}

				<div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
					{reportPrefs.categoryBreakdown && (
						<div className="rounded-2xl border bg-card p-5">
							<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<h2 className="text-base font-semibold">Monthly category breakdown</h2>
									<p className="text-sm text-muted-foreground">
										Amounts are visible first. Select a category to inspect the month.
									</p>
								</div>
								{selectedCategory && (
									<Button type="button" variant="outline" size="sm" onClick={() => {
										setSelectedCategory(null);
										setSelectedSubcategory(null);
									}}>
										<FiX className="mr-2 h-4 w-4" />
										Clear focus
									</Button>
								)}
							</div>
							{categorySummaries.length > 0 ? (
								<div className="space-y-3">
									{categorySummaries.map((category) => {
										const isSelected = selectedCategory === category.category;
										const deltaTone =
											category.deltaAmount > 0
												? 'text-red-600 dark:text-red-400'
												: category.deltaAmount < 0
													? 'text-green-600 dark:text-green-400'
													: 'text-muted-foreground';

										return (
											<div
												key={category.category}
												className={`rounded-xl border p-3 transition-colors ${isSelected ? 'border-primary bg-muted/50' : 'bg-background'
													}`}
											>
												<button
													type="button"
													onClick={() => selectCategory(category)}
													className="w-full text-left"
												>
													<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
														<div className="min-w-0">
															<div className="flex items-center gap-2">
																<span
																	className="h-2.5 w-2.5 shrink-0 rounded-full"
																	style={{ backgroundColor: category.color }}
																/>
																<span className="truncate font-semibold">
																	{getCategoryLabel(category.category)}
																</span>
															</div>
															<div className="mt-2 h-2 rounded-full bg-muted">
																<div
																	className="h-2 rounded-full"
																	style={{
																		width: `${Math.min(category.percentage, 100)}%`,
																		backgroundColor: category.color,
																	}}
																/>
															</div>
														</div>
														<div className="text-sm text-muted-foreground">
															{category.percentage.toFixed(0)}%
														</div>
														<div className="text-sm text-muted-foreground">
															{category.transactionCount} tx
														</div>
														<div className="text-right">
															<div className="font-bold">{formatCurrency(category.amount)}</div>
															<div className={`text-xs ${deltaTone}`}>
																{category.deltaAmount === 0
																	? 'No change'
																	: `${category.deltaAmount > 0 ? '+' : ''}${formatCurrency(category.deltaAmount)} vs prev`}
															</div>
														</div>
													</div>
												</button>

												{isSelected && reportPrefs.subcategoryBreakdown && (
													<div className="mt-3 space-y-2 border-t pt-3">
														{category.subcategories.map((subcategory) => {
															const subcategoryKey = subcategory.subcategory ?? '';
															const isSubSelected = selectedSubcategory === subcategoryKey;
															return (
																<button
																	key={`${category.category}-${subcategoryKey || 'none'}`}
																	type="button"
																	onClick={() =>
																		setSelectedSubcategory((current) =>
																			current === subcategoryKey ? null : subcategoryKey
																		)
																	}
																	className={`grid w-full gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center ${isSubSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
																		}`}
																>
																	<span className="truncate">
																		{getSubcategoryDisplayLabel(
																			subcategory.category,
																			subcategory.subcategory
																		)}
																	</span>
																	<span className="text-muted-foreground">
																		{subcategory.percentage.toFixed(0)}%
																	</span>
																	<span className="text-muted-foreground">
																		{subcategory.transactionCount} tx
																	</span>
																	<span className="font-semibold">
																		{formatCurrency(subcategory.amount)}
																	</span>
																</button>
															);
														})}
													</div>
												)}
											</div>
										);
									})}
								</div>
							) : (
								<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
									No expense data for this period
								</div>
							)}
						</div>
					)}

					<div className="space-y-6">
						{reportPrefs.subcategoryBreakdown && (
							<div className="rounded-2xl border bg-card p-5">
								<h2 className="text-base font-semibold">
									{selectedSubcategoryLabel ??
										(selectedCategory
											? getCategoryLabel(selectedCategory)
											: 'Focused transactions')}
								</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									{selectedCategory
										? 'Latest matching expenses for the selected month.'
										: 'Select a category to inspect matching transactions.'}
								</p>
								<div className="mt-4">
									{focusedTransactions.length > 0 ? (
										<div className="space-y-2">
											{focusedTransactions.map((transaction) => (
												<div
													key={transaction.id}
													className="rounded-lg border bg-background px-3 py-2 text-sm"
												>
													<div className="flex items-center justify-between gap-3">
														<div className="min-w-0">
															<div className="truncate font-medium">{transaction.title}</div>
															<div className="text-xs text-muted-foreground">
																{formatDate(transaction)} · {accountNameMap[transaction.accountId] ?? 'Unknown account'}
															</div>
														</div>
														<div className="shrink-0 font-semibold text-red-600 dark:text-red-400">
															{formatCurrency(transaction.amount)}
														</div>
													</div>
												</div>
											))}
										</div>
									) : (
										<div className="flex h-28 items-center justify-center text-center text-sm text-muted-foreground">
											No focused transactions yet.
										</div>
									)}
								</div>
							</div>
						)}

						{reportPrefs.accountActivity && (
							<div className="rounded-2xl border bg-card p-5">
								<h2 className="mb-4 text-base font-semibold">Monthly account review</h2>
								{accountSummaries.length > 0 ? (
									<div className="space-y-3">
										{accountSummaries.map((account) => (
											<div key={account.accountId} className="rounded-xl border bg-background p-3">
												<div className="mb-3 flex items-center gap-2">
													<span
														className="h-2.5 w-2.5 rounded-full"
														style={{ backgroundColor: account.color }}
													/>
													<span className="font-semibold">{account.accountName}</span>
													<span className="ml-auto text-xs text-muted-foreground">
														{account.transactionCount} tx
													</span>
												</div>
												<div className="grid grid-cols-3 gap-2 text-sm">
													<div>
														<p className="text-xs text-muted-foreground">Income</p>
														<p className="font-semibold text-green-600 dark:text-green-400">
															{formatCurrency(account.income)}
														</p>
													</div>
													<div>
														<p className="text-xs text-muted-foreground">Expense</p>
														<p className="font-semibold text-red-600 dark:text-red-400">
															{formatCurrency(account.expense)}
														</p>
													</div>
													<div>
														<p className="text-xs text-muted-foreground">Net</p>
														<p
															className={`font-semibold ${account.net >= 0
																? 'text-green-600 dark:text-green-400'
																: 'text-red-600 dark:text-red-400'
																}`}
														>
															{formatCurrency(account.net)}
														</p>
													</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
										No account activity for this period
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<div className="grid gap-6 xl:grid-cols-2">
					{reportPrefs.incomeExpenseTrend && (
						<div className="rounded-2xl border bg-card p-5">
							<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<h2 className="text-base font-semibold">6-Month Money Movement</h2>
								<p className="text-sm text-muted-foreground">
									{reportMode === 'expense'
										? 'Expense focus'
										: reportMode === 'income'
											? 'Income focus'
											: 'Net focus'}
								</p>
							</div>
							{monthlyTrend.length > 0 ? (
								<ResponsiveContainer width="100%" height={240}>
									<AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
										<defs>
											<linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
												<stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
											</linearGradient>
											<linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
												<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
										<XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
										<YAxis tickFormatter={formatTick} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
										<Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
										<Legend />
										{reportMode !== 'expense' && (
											<Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
										)}
										{reportMode !== 'income' && (
											<Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
										)}
										{reportMode === 'net' && (
											<Line type="monotone" dataKey="net" name="Net" stroke="#0ea5e9" strokeWidth={2} dot={false} />
										)}
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
									No transaction data available
								</div>
							)}
						</div>
					)}

					{reportPrefs.netWorth && accounts.length > 0 && (
						<div className="rounded-2xl border bg-card p-5">
							<h2 className="mb-4 text-base font-semibold">Net Worth Breakdown</h2>
							<div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
								<div>
									<p className="mb-1 text-xs text-muted-foreground">Assets</p>
									<p className="text-xl font-bold text-green-600 dark:text-green-400">
										{formatCurrency(netWorth.assets)}
									</p>
								</div>
								<div>
									<p className="mb-1 text-xs text-muted-foreground">Liabilities</p>
									<p className="text-xl font-bold text-red-600 dark:text-red-400">
										{formatCurrency(netWorth.liabilities)}
									</p>
								</div>
								<div>
									<p className="mb-1 text-xs text-muted-foreground">Net Worth</p>
									<p
										className={`text-xl font-bold ${netWorth.netWorth >= 0
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'
											}`}
									>
										{formatCurrency(netWorth.netWorth)}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ReportsView;
