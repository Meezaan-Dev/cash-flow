import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { getRecurringOccurrenceDateKey, type RecurringTransaction } from '@cash-flow/shared';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { mergeCategoryOptions } from '@cash-flow/shared/categories/categories';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { Transaction } from '@cash-flow/shared/transactions/TransactionModel';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { Button } from '@/components/app/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/app/ui/dialog';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/app/ui/select';
import { Textarea } from '@/components/app/ui/textarea';
import type { TransactionType } from '@/types';

interface TransactionFormProps {
	onClose: () => void;
	onSuccess?: (message: string) => void;
	transaction?: Transaction;
	recurringTransaction?: RecurringTransaction;
	recurringOccurrenceDate?: Date;
	recurringOccurrenceDateKey?: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const getDateInputValue = (value: Transaction['date']): string => {
	const parsed = parseDbDateOrNull(value);
	return parsed ? parsed.toISOString().slice(0, 10) : '';
};

const TransactionForm: React.FC<TransactionFormProps> = ({
	onClose,
	onSuccess,
	transaction,
	recurringTransaction: initialRecurringTransaction,
	recurringOccurrenceDate,
	recurringOccurrenceDateKey,
}) => {
	const { addTransaction, addTransfer, updateTransaction, recurringTransactions } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { categories, categoryOptions } = useCategoriesContext();
	const { mainAccountId } = useMainAccountPreference();
	const submitInFlightRef = useRef(false);
	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
	const [type, setType] = useState<TransactionType>('expense');
	const [accountId, setAccountId] = useState('');
	const [fromAccountId, setFromAccountId] = useState('');
	const [toAccountId, setToAccountId] = useState('');
	const [category, setCategory] = useState('');
	const [subcategory, setSubcategory] = useState('');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState(todayKey);
	const [selectedRecurringId, setSelectedRecurringId] = useState<string | null>(
		initialRecurringTransaction?.id ?? null
	);
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const defaultAccountId = useMemo(() => {
		const mainAccount = accounts.find((account) => account.id === mainAccountId);
		return mainAccount?.id ?? accounts[0]?.id ?? '';
	}, [accounts, mainAccountId]);
	const selectedCategory = categories.find((item) => item.value === category);
	const availableCategories = useMemo(
		() => mergeCategoryOptions(categoryOptions, category ? [category] : []),
		[category, categoryOptions]
	);
	const availableSubcategories = useMemo(
		() => mergeCategoryOptions(selectedCategory?.subcategories ?? [], subcategory ? [subcategory] : []),
		[selectedCategory, subcategory]
	);
	const inputClass = 'h-11 rounded-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950';

	useEffect(() => {
		if (transaction) {
			setTitle(transaction.title);
			setAmount(String(transaction.amount));
			setType(transaction.type);
			setAccountId(transaction.accountId ?? '');
			setCategory(transaction.category ?? '');
			setSubcategory(transaction.subcategory ?? '');
			setDescription(transaction.description ?? '');
			setDate(getDateInputValue(transaction.date) || todayKey());
			setSelectedRecurringId(null);
			return;
		}
		if (initialRecurringTransaction) {
			setTitle(initialRecurringTransaction.title);
			setAmount(String(initialRecurringTransaction.amount));
			setType(initialRecurringTransaction.type === 'income' ? 'income' : 'expense');
			setAccountId(initialRecurringTransaction.accountId || defaultAccountId);
			setCategory(initialRecurringTransaction.category);
			setSubcategory(initialRecurringTransaction.subcategory ?? '');
			setDescription(initialRecurringTransaction.description ?? '');
			setDate((recurringOccurrenceDate ?? new Date()).toISOString().slice(0, 10));
			setSelectedRecurringId(initialRecurringTransaction.id ?? null);
			return;
		}
		setTitle('');
		setAmount('');
		setType('expense');
		setAccountId(defaultAccountId);
		setFromAccountId(defaultAccountId);
		setToAccountId('');
		setCategory('');
		setSubcategory('');
		setDescription('');
		setDate(todayKey());
		setSelectedRecurringId(null);
	}, [defaultAccountId, initialRecurringTransaction, recurringOccurrenceDate, transaction]);

	useEffect(() => {
		if (!selectedRecurringId || transaction || selectedRecurringId === initialRecurringTransaction?.id) return;
		const recurring = recurringTransactions.find((item) => item.id === selectedRecurringId);
		if (!recurring) return;
		setTitle(recurring.title);
		setAmount(String(recurring.amount));
		setType(recurring.type === 'income' ? 'income' : 'expense');
		setAccountId(recurring.accountId || defaultAccountId);
		setCategory(recurring.category);
		setSubcategory(recurring.subcategory ?? '');
		setDescription(recurring.description ?? '');
		setError('');
	}, [defaultAccountId, initialRecurringTransaction?.id, recurringTransactions, selectedRecurringId, transaction]);

	const handleSubmit = async () => {
		if (submitInFlightRef.current) return;
		const amountNumber = Number(amount);
		if (!Number.isFinite(amountNumber) || amountNumber <= 0) return setError('Please enter an amount.');
		if (!title.trim()) return setError('Please enter a title.');
		if (type === 'transfer') {
			if (!fromAccountId || !toAccountId) return setError('Please select both accounts.');
			if (fromAccountId === toAccountId) return setError('Source and destination accounts must be different.');
		} else {
			if (!category) return setError('Please select a category.');
			if (!accountId) return setError('Please select an account.');
		}

		submitInFlightRef.current = true;
		setIsSubmitting(true);
		setError('');
		try {
			const transactionDate = date ? new Date(`${date}T12:00:00`) : new Date();
			const recurringId = selectedRecurringId ?? initialRecurringTransaction?.id;
			if (type === 'transfer') {
				await addTransfer({
					fromAccountId,
					toAccountId,
					amount: amountNumber,
					title: title.trim(),
					description,
					date: transactionDate,
				});
				onSuccess?.('Transfer added successfully.');
				onClose();
				return;
			}
			const payload = {
				title: title.trim(),
				amount: amountNumber,
				type,
				accountId,
				category,
				subcategory: subcategory || undefined,
				description,
				date: transactionDate,
			};
			if (transaction?.id) await updateTransaction(transaction.id, payload);
			else {
				await addTransaction({
					...payload,
					recurringTransactionId: recurringId,
					recurringOccurrenceDate: recurringId
						? recurringOccurrenceDateKey ?? getRecurringOccurrenceDateKey(transactionDate)
						: undefined,
				});
			}
			onSuccess?.(transaction ? 'Transaction updated successfully.' : `${type === 'expense' ? 'Expense' : 'Income'} added successfully.`);
			onClose();
		} catch (caught) {
			setError(getAppErrorMessage(caught, { operation: 'Save transaction' }));
		} finally {
			submitInFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	if (transaction?.type === 'transfer') {
		return (
			<div className="space-y-5">
				<DialogHeader><DialogTitle>Transfer details</DialogTitle><DialogDescription>Transfers cannot be edited because both linked records and balances must stay in sync.</DialogDescription></DialogHeader>
				<DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
			</div>
		);
	}

	return (
		<div className="flex w-full min-w-0 max-h-[82vh] min-h-0 flex-col overflow-hidden">
			<DialogHeader className="shrink-0 border-b border-gray-200 pb-4 dark:border-gray-800">
				<DialogTitle>{transaction ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
				<DialogDescription>Enter the essentials and save. Everything else is optional.</DialogDescription>
			</DialogHeader>
			<div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-5">
				{error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}
				<div className="grid grid-cols-3 gap-2">
					{(['expense', 'income', 'transfer'] as const).map((item) => <Button key={item} type="button" variant={type === item ? 'marketing' : 'outline'} onClick={() => setType(item)} className="h-11 capitalize">{item}</Button>)}
				</div>
				{type !== 'transfer' && !transaction && recurringTransactions.length > 0 ? <div className="min-w-0 space-y-1.5"><Label htmlFor="quick-fill" className="flex items-center gap-2"><FiRefreshCw className="h-4 w-4" />Quick Fill</Label><Select value={selectedRecurringId || '__none__'} onValueChange={(value) => setSelectedRecurringId(value === '__none__' ? null : value)}><SelectTrigger id="quick-fill" className={inputClass}><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent><SelectItem value="__none__">Start fresh</SelectItem>{recurringTransactions.map((item) => <SelectItem key={item.id} value={item.id!}>{item.title}</SelectItem>)}</SelectContent></Select></div> : null}
				<div className="grid min-w-0 gap-4 sm:grid-cols-2">
					<div className="min-w-0 space-y-1.5"><Label htmlFor="transaction-amount">Amount *</Label><Input id="transaction-amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} min="0.01" step="0.01" className={`${inputClass} min-w-0`} autoFocus /></div>
					<div className="min-w-0 space-y-1.5"><Label htmlFor="transaction-title">Title *</Label><Input id="transaction-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What was this?" className={`${inputClass} min-w-0`} /></div>
				</div>
				{type !== 'transfer' && <div className="space-y-1.5"><Label htmlFor="transaction-category">Category *</Label><Select value={category} onValueChange={(value) => { setCategory(value); setSubcategory(''); }}><SelectTrigger id="transaction-category" className={inputClass}><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{availableCategories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>}
				<details className="group overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800" open={transaction || type === 'transfer' ? true : undefined}>
					<summary className="cursor-pointer px-4 py-3 text-sm font-medium">{type === 'transfer' ? 'Transfer details' : 'Optional details'} <span className="ml-1 text-xs font-normal text-gray-500">{type === 'transfer' ? 'accounts, date and notes' : 'account, date, subcategory and notes'}</span></summary>
					<div className="grid gap-4 border-t border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-2">
						{type === 'transfer' ? <><div className="space-y-1.5"><Label htmlFor="transfer-from-account">From account</Label><Select value={fromAccountId} onValueChange={setFromAccountId}><SelectTrigger id="transfer-from-account" className={inputClass}><SelectValue placeholder="Select source account" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id!} disabled={account.id === toAccountId}>{account.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="transfer-to-account">To account</Label><Select value={toAccountId} onValueChange={setToAccountId}><SelectTrigger id="transfer-to-account" className={inputClass}><SelectValue placeholder="Select destination account" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id!} disabled={account.id === fromAccountId}>{account.name}</SelectItem>)}</SelectContent></Select></div></> : <div className="space-y-1.5"><Label htmlFor="transaction-account">Account</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger id="transaction-account" className={inputClass}><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id!}>{account.name}</SelectItem>)}</SelectContent></Select></div>}
						<div className="space-y-1.5"><Label htmlFor="transaction-date">Date</Label><Input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></div>
						{type !== 'transfer' && availableSubcategories.length > 0 ? <div className="space-y-1.5"><Label htmlFor="transaction-subcategory">Subcategory</Label><Select value={subcategory || '__none__'} onValueChange={(value) => setSubcategory(value === '__none__' ? '' : value)}><SelectTrigger id="transaction-subcategory" className={inputClass}><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">No subcategory</SelectItem>{availableSubcategories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div> : null}
						<div className="space-y-1.5 sm:col-span-2"><Label htmlFor="transaction-description">Notes</Label><Textarea id="transaction-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></div>
					</div>
				</details>
			</div>
			<DialogFooter className="shrink-0 border-t border-gray-200 pt-4 dark:border-gray-800"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="marketing" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : transaction ? 'Save changes' : `Add ${type}`}</Button></DialogFooter>
		</div>
	);
};

export default TransactionForm;
