import React, { useMemo, useState } from 'react';
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/features/categories/context/CategoriesContext';
import { DateRange } from '@/types';
import {
	getSpendingByCategory,
	getSpendingByAccount,
	getMonthlyTrend,
	getNetWorth,
} from '@/features/reports/controllers/ReportsController';
import { filterTransactionsByDateRangeObject } from '@/features/filters/utils/dateRangeFilter';
import { formatCurrency } from '@/utils/formatCurrency';
import DateRangeFilter from '@/features/filters/components/DateRangeFilter';

const ReportsView: React.FC = () => {
	const { transactions } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryLabel } = useCategoriesContext();

	const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });

	const filteredTransactions = useMemo(
		() => filterTransactionsByDateRangeObject(transactions, dateRange),
		[transactions, dateRange]
	);

	const monthlyTrend = useMemo(() => getMonthlyTrend(transactions, 6), [transactions]);

	const categoryData = useMemo(
		() => getSpendingByCategory(filteredTransactions, dateRange),
		[filteredTransactions, dateRange]
	);
	const labeledCategoryData = useMemo(
		() =>
			categoryData.map((entry) => ({
				...entry,
				displayCategory: getCategoryLabel(entry.category),
			})),
		[categoryData, getCategoryLabel]
	);

	const accountData = useMemo(
		() => getSpendingByAccount(filteredTransactions, accounts, dateRange),
		[filteredTransactions, accounts, dateRange]
	);

	const netWorth = useMemo(() => getNetWorth(accounts), [accounts]);

	const totalIncome = useMemo(
		() =>
			filteredTransactions
				.filter((t) => t.type === 'income')
				.reduce((s, t) => s + t.amount, 0),
		[filteredTransactions]
	);

	const totalExpense = useMemo(
		() =>
			filteredTransactions
				.filter((t) => t.type === 'expense')
				.reduce((s, t) => s + t.amount, 0),
		[filteredTransactions]
	);

	const formatTick = (value: number) => {
		if (value >= 1000) return `R${(value / 1000).toFixed(0)}k`;
		return `R${value}`;
	};

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Visual overview of your financial activity
					</p>
				</div>

				{/* Date range filter */}
				<div className="mb-6 rounded-xl border bg-card p-4">
					<DateRangeFilter
						dateRange={dateRange}
						onDateRangeChange={setDateRange}
						onClear={() => setDateRange({ startDate: '', endDate: '' })}
					/>
				</div>

				{/* Summary cards */}
				<div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div className="rounded-xl border bg-card p-4">
						<p className="text-xs text-muted-foreground">Income</p>
						<p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
							{formatCurrency(totalIncome)}
						</p>
					</div>
					<div className="rounded-xl border bg-card p-4">
						<p className="text-xs text-muted-foreground">Expenses</p>
						<p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
							{formatCurrency(totalExpense)}
						</p>
					</div>
					<div className="rounded-xl border bg-card p-4">
						<p className="text-xs text-muted-foreground">Net</p>
						<p
							className={`mt-1 text-lg font-bold ${
								totalIncome - totalExpense >= 0
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'
							}`}
						>
							{formatCurrency(totalIncome - totalExpense)}
						</p>
					</div>
					<div className="rounded-xl border bg-card p-4">
						<p className="text-xs text-muted-foreground">Net Worth</p>
						<p
							className={`mt-1 text-lg font-bold ${
								netWorth.netWorth >= 0
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'
							}`}
						>
							{formatCurrency(netWorth.netWorth)}
						</p>
					</div>
				</div>

				{/* Income vs Expense trend */}
				<div className="mb-6 rounded-2xl border bg-card p-5">
					<h2 className="mb-4 text-base font-semibold">
						6-Month Income vs Expenses
					</h2>
					{monthlyTrend.length > 0 ? (
						<ResponsiveContainer width="100%" height={260}>
							<AreaChart
								data={monthlyTrend}
								margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
							>
								<defs>
									<linearGradient
										id="incomeGrad"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor="#22c55e"
											stopOpacity={0.3}
										/>
										<stop
											offset="95%"
											stopColor="#22c55e"
											stopOpacity={0}
										/>
									</linearGradient>
									<linearGradient
										id="expenseGrad"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor="#ef4444"
											stopOpacity={0.3}
										/>
										<stop
											offset="95%"
											stopColor="#ef4444"
											stopOpacity={0}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
								<XAxis
									dataKey="month"
									tick={{ fontSize: 12 }}
									className="fill-muted-foreground"
								/>
								<YAxis
									tickFormatter={formatTick}
									tick={{ fontSize: 12 }}
									className="fill-muted-foreground"
								/>
								<Tooltip
									formatter={(value: number) => formatCurrency(value)}
									contentStyle={{
										borderRadius: '8px',
										fontSize: '12px',
									}}
								/>
								<Legend />
								<Area
									type="monotone"
									dataKey="income"
									name="Income"
									stroke="#22c55e"
									fill="url(#incomeGrad)"
									strokeWidth={2}
								/>
								<Area
									type="monotone"
									dataKey="expense"
									name="Expenses"
									stroke="#ef4444"
									fill="url(#expenseGrad)"
									strokeWidth={2}
								/>
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
							No transaction data available
						</div>
					)}
				</div>

				<div className="mb-6 grid gap-6 md:grid-cols-2">
					{/* Spending by category pie chart */}
					<div className="rounded-2xl border bg-card p-5">
						<h2 className="mb-4 text-base font-semibold">
							Spending by Category
						</h2>
						{labeledCategoryData.length > 0 ? (
							<>
								<ResponsiveContainer width="100%" height={220}>
									<PieChart>
										<Pie
											data={labeledCategoryData}
											dataKey="amount"
											nameKey="displayCategory"
											cx="50%"
											cy="50%"
											outerRadius={80}
											label={({ displayCategory, percent }) =>
												`${displayCategory} ${(percent * 100).toFixed(0)}%`
											}
											labelLine={false}
										>
											{labeledCategoryData.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={entry.color}
												/>
											))}
										</Pie>
										<Tooltip
											formatter={(value: number) =>
												formatCurrency(value)
											}
											contentStyle={{
												borderRadius: '8px',
												fontSize: '12px',
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
								<div className="mt-2 space-y-1">
									{labeledCategoryData.slice(0, 5).map((d) => (
										<div
											key={d.category}
											className="flex items-center justify-between text-sm"
										>
											<div className="flex items-center gap-2">
												<span
													className="h-2.5 w-2.5 rounded-full flex-shrink-0"
													style={{ backgroundColor: d.color }}
												/>
												<span>{d.displayCategory}</span>
											</div>
											<span className="font-medium">
												{formatCurrency(d.amount)}
											</span>
										</div>
									))}
								</div>
							</>
						) : (
							<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
								No expense data for this period
							</div>
						)}
					</div>

					{/* Activity by account bar chart */}
					<div className="rounded-2xl border bg-card p-5">
						<h2 className="mb-4 text-base font-semibold">Activity by Account</h2>
						{accountData.length > 0 ? (
							<ResponsiveContainer width="100%" height={260}>
								<BarChart
									data={accountData}
									margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-border"
									/>
									<XAxis
										dataKey="accountName"
										tick={{ fontSize: 11 }}
										className="fill-muted-foreground"
									/>
									<YAxis
										tickFormatter={formatTick}
										tick={{ fontSize: 11 }}
										className="fill-muted-foreground"
									/>
									<Tooltip
										formatter={(value: number) => formatCurrency(value)}
										contentStyle={{
											borderRadius: '8px',
											fontSize: '12px',
										}}
									/>
									<Legend />
									<Bar
										dataKey="income"
										name="Income"
										fill="#22c55e"
										radius={[4, 4, 0, 0]}
									/>
									<Bar
										dataKey="expense"
										name="Expense"
										fill="#ef4444"
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
								No account activity for this period
							</div>
						)}
					</div>
				</div>

				{/* Net Worth breakdown */}
				{accounts.length > 0 && (
					<div className="rounded-2xl border bg-card p-5">
						<h2 className="mb-4 text-base font-semibold">Net Worth Breakdown</h2>
						<div className="grid gap-4 sm:grid-cols-3">
							<div>
								<p className="text-xs text-muted-foreground mb-1">Assets</p>
								<p className="text-xl font-bold text-green-600 dark:text-green-400">
									{formatCurrency(netWorth.assets)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Liabilities
								</p>
								<p className="text-xl font-bold text-red-600 dark:text-red-400">
									{formatCurrency(netWorth.liabilities)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">Net Worth</p>
								<p
									className={`text-xl font-bold ${
										netWorth.netWorth >= 0
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
	);
};

export default ReportsView;
