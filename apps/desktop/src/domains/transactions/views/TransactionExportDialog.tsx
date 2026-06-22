import React, { useMemo, useState } from 'react';
import { Account, CategoryDefinition, Transaction } from '@/types';
import {
	filterTransactionsForExport,
	TransactionExportFilters,
} from '@/domains/transactions/utils/transactionImportExport';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { modalShell } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

type ExportFormat = 'csv' | 'json';
type DatePreset = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transactions: Transaction[];
	accounts: Account[];
	categories: CategoryDefinition[];
	onExport: (format: ExportFormat, transactions: Transaction[]) => void;
}

const toDateKey = (date: Date) =>
	[date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

export const getExportPresetRange = (preset: DatePreset, now = new Date()) => {
	if (preset === 'this-month') return { startDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
	if (preset === 'last-month') return { startDate: toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), endDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), 0)) };
	if (preset === 'this-year') return { startDate: `${now.getFullYear()}-01-01`, endDate: `${now.getFullYear()}-12-31` };
	return {};
};

const toggle = (values: string[], value: string) =>
	values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const TransactionExportDialog: React.FC<Props> = ({ open, onOpenChange, transactions, accounts, categories, onExport }) => {
	const [format, setFormat] = useState<ExportFormat>('csv');
	const [accountIds, setAccountIds] = useState<string[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [type, setType] = useState<TransactionExportFilters['type']>('overall');
	const [datePreset, setDatePreset] = useState<DatePreset>('all');
	const [customStartDate, setCustomStartDate] = useState('');
	const [customEndDate, setCustomEndDate] = useState('');

	const reset = () => {
		setFormat('csv');
		setAccountIds([]);
		setSelectedCategories([]);
		setType('overall');
		setDatePreset('all');
		setCustomStartDate('');
		setCustomEndDate('');
	};

	const filters = useMemo<TransactionExportFilters>(() => ({
		accountIds,
		categories: selectedCategories,
		type,
		...(datePreset === 'custom'
			? { startDate: customStartDate || undefined, endDate: customEndDate || undefined }
			: getExportPresetRange(datePreset)),
	}), [accountIds, customEndDate, customStartDate, datePreset, selectedCategories, type]);
	const matches = useMemo(() => filterTransactionsForExport(transactions, filters), [filters, transactions]);
	const invalidRange = datePreset === 'custom' && Boolean(customStartDate && customEndDate && customStartDate > customEndDate);
	const close = () => { onOpenChange(false); reset(); };

	return (
		<Dialog open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>
			<DialogContent className={cn('max-h-modal overflow-y-auto sm:max-w-2xl', modalShell)}>
				<DialogHeader>
					<DialogTitle>Export transactions</DialogTitle>
					<DialogDescription>Choose which transaction records to include.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-5 py-2 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="export-format">Format</Label>
						<select id="export-format" value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
							<option value="csv">CSV</option><option value="json">JSON</option>
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="export-type">Transaction type</Label>
						<select id="export-type" value={type} onChange={(event) => setType(event.target.value as TransactionExportFilters['type'])} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
							<option value="overall">Overall</option><option value="income">Income</option><option value="expense">Expenses</option>
						</select>
					</div>
					<fieldset className="space-y-2 rounded-xl border p-3">
						<legend className="px-1 text-sm font-medium">Accounts</legend>
						<p className="text-xs text-muted-foreground">None selected includes all accounts.</p>
						<div className="max-h-32 space-y-2 overflow-y-auto">
							{accounts.map((account) => account.id && (
								<label key={account.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accountIds.includes(account.id)} onChange={() => setAccountIds((current) => toggle(current, account.id!))} />{account.name}</label>
							))}
						</div>
					</fieldset>
					<fieldset className="space-y-2 rounded-xl border p-3">
						<legend className="px-1 text-sm font-medium">Categories</legend>
						<p className="text-xs text-muted-foreground">None selected includes all categories.</p>
						<div className="max-h-32 space-y-2 overflow-y-auto">
							{categories.map((category) => (
								<label key={category.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedCategories.includes(category.value)} onChange={() => setSelectedCategories((current) => toggle(current, category.value))} />{category.label}</label>
							))}
						</div>
					</fieldset>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="export-date-preset">Date range</Label>
						<select id="export-date-preset" value={datePreset} onChange={(event) => setDatePreset(event.target.value as DatePreset)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
							<option value="all">All time</option><option value="this-month">This month</option><option value="last-month">Last month</option><option value="this-year">This year</option><option value="custom">Custom range</option>
						</select>
						{datePreset === 'custom' && (
							<div className="grid gap-3 sm:grid-cols-2">
								<div><Label htmlFor="export-start-date">Start date</Label><Input id="export-start-date" type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} /></div>
								<div><Label htmlFor="export-end-date">End date</Label><Input id="export-end-date" type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} /></div>
							</div>
						)}
						{invalidRange && <p className="text-sm text-destructive">Start date must be on or before end date.</p>}
					</div>
				</div>
				<p aria-live="polite" className="text-sm text-muted-foreground">{matches.length} matching {matches.length === 1 ? 'transaction' : 'transactions'}</p>
				<DialogFooter>
					<Button variant="outline" onClick={close}>Cancel</Button>
					<Button disabled={matches.length === 0 || invalidRange} onClick={() => { onExport(format, matches); close(); }}>Export {format.toUpperCase()}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TransactionExportDialog;
