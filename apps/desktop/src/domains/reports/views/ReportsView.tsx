import React, { useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { SensitiveText, SensitiveValue } from '@/app/privacy/SensitiveValue';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/app/ui/select';
import { EmptyState, PageHeader, PageShell } from '@/components/app/page-layout';
import { downloadExportFiles } from '@/shared/export/downloadExportFiles';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import {
	buildReportBreakdown,
	filterReportTransactions,
	getReportGroupKey,
	getReportMonthKeys,
	getReportTransactionDate,
	reportRowsToCsv,
	reportTransactionsToCsv,
	type ReportFilters,
	type ReportGrouping,
	type ReportTransactionType,
} from '../reportData';

interface ReportsViewProps {
	onOpenSettings?: () => void;
}

const localDateKey = (date: Date) => {
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const getDefaultFilters = (): ReportFilters => {
	const today = new Date();
	const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
	return { startDate: localDateKey(start), endDate: localDateKey(today), accountId: 'all', type: 'all', groupBy: 'month' };
};

const monthLabel = (key: string) => {
	const [year, month] = key.split('-').map(Number);
	return new Date(year, month - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
};

const ReportsView: React.FC<ReportsViewProps> = () => {
	const { transactions } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryLabel, getSubcategoryLabel } = useCategoriesContext();
	const [filters, setFilters] = useState<ReportFilters>(getDefaultFilters);
	const [selectedMonth, setSelectedMonth] = useState('all');
	const [selectedCategory, setSelectedCategory] = useState('all');

	const baseTransactions = useMemo(
		() => filterReportTransactions(transactions, filters),
		[filters, transactions]
	);
	const activeTransactions = useMemo(
		() => baseTransactions.filter((transaction) =>
			(selectedMonth === 'all' || getReportGroupKey(transaction, 'month') === selectedMonth) &&
			(selectedCategory === 'all' || transaction.category === selectedCategory)
		),
		[baseTransactions, selectedCategory, selectedMonth]
	);
	const labelForGroup = (key: string) => {
		if (filters.groupBy === 'month') return monthLabel(key);
		if (filters.groupBy === 'category') return getCategoryLabel(key);
		const [category, subcategory] = key.split('::');
		const subcategoryLabel = subcategory === 'other' ? 'Other' : getSubcategoryLabel(category, subcategory);
		return selectedCategory === 'all'
			? `${getCategoryLabel(category)} / ${subcategoryLabel}`
			: subcategoryLabel;
	};
	const breakdown = useMemo(
		() => buildReportBreakdown(activeTransactions, filters.groupBy, labelForGroup),
		// category label functions are stable context helpers
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[activeTransactions, filters.groupBy, selectedCategory]
	);
	const monthRows = useMemo(() => buildReportBreakdown(baseTransactions, 'month', monthLabel), [baseTransactions]);
	const categories = useMemo(
		() => buildReportBreakdown(baseTransactions, 'category', getCategoryLabel),
		[baseTransactions, getCategoryLabel]
	);
	const months = useMemo(
		() => getReportMonthKeys(filters.startDate, filters.endDate),
		[filters.endDate, filters.startDate]
	);
	const totals = baseTransactions.reduce(
		(result, transaction) => {
			if (transaction.type === 'income') result.income += transaction.amount;
			if (transaction.type === 'expense') result.expenses += transaction.amount;
			return result;
		},
		{ income: 0, expenses: 0 }
	);
	const highestMonth = [...monthRows].sort((a, b) => b.expenses - a.expenses)[0];
	const highestCategory = categories[0];

	const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
		setFilters((current) => ({ ...current, [key]: value }));
		setSelectedMonth('all');
		setSelectedCategory('all');
	};

	const exportReport = (format: 'json' | 'csv') => {
		const stamp = localDateKey(new Date());
		if (format === 'json') {
			downloadExportFiles([{
				filename: `cash-flow-report-${stamp}.json`,
				mimeType: 'application/json',
				content: JSON.stringify({
					filters: { ...filters, selectedMonth, selectedCategory },
					breakdown,
					transactions: activeTransactions.map((transaction) => ({
						...transaction,
						date: getReportTransactionDate(transaction)?.toISOString() ?? null,
						createdAt: undefined,
					})),
				}, null, 2),
			}]);
			return;
		}
		downloadExportFiles([
			{ filename: `cash-flow-report-breakdown-${stamp}.csv`, mimeType: 'text/csv;charset=utf-8', content: reportRowsToCsv(breakdown) },
			{ filename: `cash-flow-report-transactions-${stamp}.csv`, mimeType: 'text/csv;charset=utf-8', content: reportTransactionsToCsv(activeTransactions) },
		]);
	};

	const drillIntoMonth = (month: string) => {
		setSelectedMonth((current) => current === month ? 'all' : month);
		setFilters((current) => ({ ...current, groupBy: 'subcategory' }));
	};

	const drillIntoCategory = (category: string) => {
		setSelectedCategory((current) => current === category ? 'all' : category);
		setFilters((current) => ({ ...current, groupBy: 'subcategory' }));
	};

	return (
		<PageShell>
			<PageHeader
				title="Reports"
				subtitle="Compare the last 12 months, drill into spending, or build a custom view."
				actions={<div className="flex gap-2"><Button variant="outline" onClick={() => exportReport('csv')}><FiDownload className="h-4 w-4" />CSV</Button><Button variant="marketing" onClick={() => exportReport('json')}><FiDownload className="h-4 w-4" />JSON</Button></div>}
			/>

			<section className="mb-6 grid gap-4 rounded-3xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-5">
				<div><Label>Start date</Label><Input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} /></div>
				<div><Label>End date</Label><Input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} /></div>
				<div><Label>Account</Label><Select value={filters.accountId} onValueChange={(value) => updateFilter('accountId', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem>{accounts.map((account) => account.id && <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select></div>
				<div><Label>Type</Label><Select value={filters.type} onValueChange={(value) => updateFilter('type', value as ReportTransactionType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent></Select></div>
				<div><Label>Group by</Label><Select value={filters.groupBy} onValueChange={(value) => updateFilter('groupBy', value as ReportGrouping)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="category">Category</SelectItem><SelectItem value="subcategory">Subcategory</SelectItem></SelectContent></Select></div>
			</section>

			<section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				{[
					['Income', formatCurrency(totals.income)],
					['Expenses', formatCurrency(totals.expenses)],
					['Net position', formatCurrency(totals.income - totals.expenses)],
					['Highest-spend month', highestMonth ? `${highestMonth.label} · ${formatCurrency(highestMonth.expenses)}` : '—'],
					['Highest-spend category', highestCategory ? `${highestCategory.label} · ${formatCurrency(highestCategory.expenses)}` : '—'],
				].map(([label, value]) => <div key={label} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold"><SensitiveValue widthClassName="w-24">{value}</SensitiveValue></p></div>)}
			</section>

			<section className="mb-6 overflow-hidden rounded-3xl border bg-card">
				<div className="border-b p-5"><h2 className="font-semibold">Category totals across months</h2><p className="text-sm text-muted-foreground">Select a category or month to drill down.</p></div>
				{categories.length === 0 ? <EmptyState title="No report data" description="Transactions matching these filters will appear here." /> : (
					<div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-3 text-left">Category</th>{months.map((month) => <th key={month} className="p-3 text-right"><button onClick={() => drillIntoMonth(month)} className={cn('whitespace-nowrap', selectedMonth === month && 'text-blue-600')}>{monthLabel(month)}</button></th>)}</tr></thead><tbody>{categories.map((category) => <tr key={category.key} className="border-b last:border-0"><th className="p-3 text-left"><button onClick={() => drillIntoCategory(category.key)} className={cn(selectedCategory === category.key && 'text-blue-600')}>{category.label}</button></th>{months.map((month) => { const value = baseTransactions.filter((transaction) => transaction.category === category.key && getReportGroupKey(transaction, 'month') === month && transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0); return <td key={month} className="p-3 text-right"><SensitiveValue widthClassName="w-16">{formatCurrency(value)}</SensitiveValue></td>; })}</tr>)}</tbody></table></div>
				)}
			</section>

			<section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
				<div className="rounded-3xl border bg-card p-5"><h2 className="font-semibold">Active breakdown</h2><p className="mb-4 text-sm text-muted-foreground">{activeTransactions.length} matching transactions</p><div className="space-y-2">{breakdown.map((row) => <div key={row.key} className="flex items-center justify-between rounded-xl bg-muted/40 p-3"><span>{row.label}</span><SensitiveValue widthClassName="w-20">{formatCurrency(row.expenses || row.income || row.transfers)}</SensitiveValue></div>)}</div></div>
				<div className="rounded-3xl border bg-card p-5"><h2 className="font-semibold">Matching transactions</h2><div className="mt-3 divide-y">{activeTransactions.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No transactions match this view.</p> : activeTransactions.map((transaction, index) => <div key={transaction.id ?? `${transaction.title}-${index}`} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium"><SensitiveText widthClassName="w-32">{transaction.title}</SensitiveText></p><p className="text-xs text-muted-foreground">{getReportTransactionDate(transaction)?.toLocaleDateString('en-ZA')} · {getCategoryLabel(transaction.category)}{transaction.subcategory ? ` / ${getSubcategoryLabel(transaction.category, transaction.subcategory)}` : ''}</p></div><SensitiveValue widthClassName="w-20">{formatCurrency(transaction.amount)}</SensitiveValue></div>)}</div></div>
			</section>
		</PageShell>
	);
};

export default ReportsView;
