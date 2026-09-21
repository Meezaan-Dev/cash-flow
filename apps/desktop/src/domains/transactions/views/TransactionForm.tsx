import React, { useState, useEffect, useRef } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Transaction } from '@cash-flow/shared/transactions/TransactionModel';
import { RecurringTransaction } from '@cash-flow/shared';
import { TransactionType } from '@/types';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { Textarea } from '@/components/app/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import {
	SidePanelClose,
	SidePanelContent,
	SidePanelDescription,
	SidePanelTitle,
} from '@/components/app/ui/side-panel';
import { formatCurrency } from '@/utils/formatCurrency';
import { mergeCategoryOptions } from '@cash-flow/shared/categories/categories';
import { cn } from '@/lib/utils';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';

interface TransactionFormProps {
	onClose: () => void;
	onSuccess?: (message: string) => void;
	transaction?: Transaction;
	recurringTransaction?: RecurringTransaction;
	recurringOccurrenceDate?: Date;
	recurringOccurrenceDateKey?: string;
}

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

	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState(0);
	const [type, setType] = useState<TransactionType>('expense');
	const [accountId, setAccountId] = useState('');
	const [transferAccountId, setTransferAccountId] = useState('');
	const [category, setCategory] = useState('');
	const [subcategory, setSubcategory] = useState('');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState<string>('');
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedRecurringId, setSelectedRecurringId] = useState<string | null>(
		initialRecurringTransaction?.id || null
	);
	const submitInFlightRef = useRef(false);

	const availableCategories = React.useMemo(
		() => mergeCategoryOptions(categoryOptions, category ? [category] : []),
		[categoryOptions, category]
	);
	const selectedCategory = React.useMemo(
		() => categories.find((item) => item.value === category),
		[categories, category]
	);
	const availableSubcategories = React.useMemo(
		() =>
			mergeCategoryOptions(
				selectedCategory?.subcategories ?? [],
				subcategory ? [subcategory] : []
			),
		[selectedCategory, subcategory]
	);
	const defaultAccountId = React.useMemo(() => {
		const mainAccount = accounts.find((account) => account.id === mainAccountId);
		return mainAccount?.id ?? accounts[0]?.id ?? '';
	}, [accounts, mainAccountId]);

	const handleCategoryChange = (value: string) => {
		setCategory(value);
		setSubcategory('');
		setError('');
	};

	const handleTypeChange = (nextType: TransactionType) => {
		setType(nextType);
		setError('');
		if (
			nextType !== 'transfer' &&
			transaction &&
			!category &&
			transaction.category &&
			transaction.category !== 'transfer'
		) {
			setCategory(transaction.category);
			setSubcategory(transaction.subcategory ?? '');
		}
	};

	useEffect(() => {
		if (transaction) {
			setTitle(transaction.title);
			setAmount(transaction.amount);
			setType(transaction.type);
			setAccountId(transaction.accountId ?? '');
			setTransferAccountId(transaction.transferAccountId ?? '');
			setCategory(transaction.category ?? '');
			setSubcategory(transaction.subcategory ?? '');
			setDescription(transaction.description ?? '');
			setError('');
			setSelectedRecurringId(null);

			let transactionDate: Date | null = null;
			if (transaction.date) {
				if (typeof transaction.date === 'object' && 'toDate' in transaction.date) {
					transactionDate = transaction.date.toDate();
				} else if (transaction.date instanceof Date) {
					transactionDate = transaction.date;
				}
			}

			setDate(transactionDate ? transactionDate.toISOString().split('T')[0] : '');
		} else if (initialRecurringTransaction) {
			setTitle(initialRecurringTransaction.title);
			setAmount(initialRecurringTransaction.amount);
			setType((initialRecurringTransaction.type as TransactionType) ?? 'expense');
			setAccountId(initialRecurringTransaction.accountId || '');
			setCategory(initialRecurringTransaction.category ?? '');
			setSubcategory(initialRecurringTransaction.subcategory ?? '');
			setDescription(initialRecurringTransaction.description ?? '');
			setDate((recurringOccurrenceDate ?? new Date()).toISOString().split('T')[0]);
			setError('');
			setSelectedRecurringId(initialRecurringTransaction.id || null);
		} else {
			setTitle('');
			setAmount(0);
			setType('expense');
			setCategory('');
			setSubcategory('');
			setDescription('');
			setAccountId('');
			setTransferAccountId('');
			setDate(new Date().toISOString().split('T')[0]);
			setError('');
			setSelectedRecurringId(null);
		}
	}, [transaction, initialRecurringTransaction, recurringOccurrenceDate]);

	// Fill an empty account field from the user's preferred account without
	// resetting the rest of the form when that preference changes.
	useEffect(() => {
		if (!accountId && defaultAccountId) {
			setAccountId(defaultAccountId);
		}
	}, [accountId, defaultAccountId]);

	useEffect(() => {
		if (selectedRecurringId && !transaction) {
			const selectedExpense = recurringTransactions.find((e) => e.id === selectedRecurringId);
			if (selectedExpense) {
				setTitle(selectedExpense.title);
				setAmount(selectedExpense.amount);
				setType((selectedExpense.type as TransactionType) ?? 'expense');
				if (selectedExpense.accountId) setAccountId(selectedExpense.accountId);
				setCategory(selectedExpense.category ?? '');
				setSubcategory(selectedExpense.subcategory ?? '');
				setDescription(selectedExpense.description ?? '');
				setError('');
			}
		} else if (selectedRecurringId === null && !transaction && !initialRecurringTransaction) {
			setTitle('');
			setAmount(0);
			setCategory('');
			setSubcategory('');
			setDescription('');
			setError('');
		}
	}, [selectedRecurringId, recurringTransactions, transaction, initialRecurringTransaction]);

	useEffect(() => {
		if (!subcategory) return;
		const stillAvailable = availableSubcategories.some((item) => item.value === subcategory);
		if (!stillAvailable) {
			setSubcategory('');
		}
	}, [availableSubcategories, subcategory]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitInFlightRef.current) return;

		setError('');
		if (type === 'transfer' && !transferAccountId) return;
		const categoryForSubmit =
			type === 'transfer'
				? 'transfer'
				: category.trim() || transaction?.category || initialRecurringTransaction?.category || '';
		const subcategoryForSubmit =
			type === 'transfer'
				? undefined
				: subcategory.trim() || (!category ? transaction?.subcategory : undefined);

		if (type !== 'transfer' && !categoryForSubmit) {
			setError('Please select a category.');
			return;
		}

		submitInFlightRef.current = true;
		setIsSubmitting(true);

		try {
			if (transaction && transaction.id) {
				const data: Partial<Transaction> = {
					title,
					amount: Number(amount),
					type,
					accountId,
					category: categoryForSubmit,
					subcategory: subcategoryForSubmit,
					description,
					date: date ? new Date(date) : new Date(),
				};
				if (type === 'transfer' && transferAccountId) {
					data.transferAccountId = transferAccountId;
				}
				await updateTransaction(transaction.id, data);
			} else if (type === 'transfer') {
				await addTransfer({
					fromAccountId: accountId,
					toAccountId: transferAccountId,
					amount: Number(amount),
					title,
					description,
					date: date ? new Date(date) : new Date(),
				});
			} else {
				await addTransaction({
					title,
					amount: Number(amount),
					type,
					accountId,
					category: categoryForSubmit,
					subcategory: subcategoryForSubmit,
					description,
					date: date ? new Date(date) : new Date(),
					recurringTransactionId: initialRecurringTransaction?.id,
					recurringOccurrenceDate: recurringOccurrenceDateKey,
				});
			}
			onSuccess?.(
				transaction
					? 'Transaction updated successfully.'
					: type === 'transfer'
						? 'Transfer added successfully.'
						: `${type === 'expense' ? 'Expense' : 'Income'} added successfully.`
			);
			onClose();
		} catch (error) {
			console.error('Failed to submit transaction:', error);
			setError(getAppErrorMessage(error, { operation: 'Save transaction' }));
		} finally {
			submitInFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	const availableTransferAccounts = accounts.filter((a) => a.id !== accountId);
	const transactionTypes: TransactionType[] = transaction
		? ['income', 'expense']
		: ['income', 'expense', 'transfer'];
	const inputClass = 'h-10 rounded-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950';

	if (transaction?.type === 'transfer') {
		return (
			<SidePanelContent>
				<div className="flex min-h-0 flex-1 flex-col">
					<header className="border-b border-gray-200 bg-white px-6 py-6 pr-16 dark:border-gray-800 dark:bg-gray-950">
						<p className={sectionLabel}>Transfer</p>
						<SidePanelTitle className="mt-2 text-2xl font-semibold tracking-tight">
							Transfer details
						</SidePanelTitle>
						<SidePanelDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Transfers cannot be edited because both linked records and account balances must
							stay in sync.
						</SidePanelDescription>
					</header>
					<div className="flex flex-1 flex-col justify-between p-6">
						<p className="text-sm text-gray-600 dark:text-gray-300">
							Delete this transfer and create it again if you need to make changes.
						</p>
						<SidePanelClose asChild>
							<Button type="button" variant="outline" className="mt-8 h-11 w-full rounded-xl">
								Close
							</Button>
						</SidePanelClose>
					</div>
				</div>
			</SidePanelContent>
		);
	}

	return (
		<SidePanelContent>
			<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" aria-busy={isSubmitting}>
				<header className="border-b border-gray-200 bg-white px-6 py-6 pr-16 dark:border-gray-800 dark:bg-gray-950">
					<p className={sectionLabel}>
						{transaction ? 'Edit' : 'New'}
					</p>
					<SidePanelTitle className="mt-2 text-2xl font-semibold tracking-tight">
						{transaction ? 'Edit transaction' : 'Add transaction'}
					</SidePanelTitle>
					<SidePanelDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{transaction
							? 'Update amount, category, or date.'
							: 'Quick capture for income, expense, or transfer.'}
					</SidePanelDescription>
				</header>

				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white p-4 dark:bg-gray-950 sm:p-6">
					{error && (
						<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
							{error}
						</div>
					)}

					{!transaction && recurringTransactions.length > 0 && (
						<section className={cn(cardSurface, 'p-4')}>
							<div className="mb-3 flex items-center gap-2">
								<FiRefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
								<Label htmlFor="quick-fill" className="text-sm font-medium">
									Quick fill
								</Label>
							</div>
							<Select
								value={selectedRecurringId || '__none__'}
								onValueChange={(value) =>
									setSelectedRecurringId(value === '__none__' ? null : value)
								}
							>
								<SelectTrigger id="quick-fill" className={inputClass}>
									<SelectValue placeholder="From a recurring template" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Start fresh</SelectItem>
									{recurringTransactions.map((expense) => (
										<SelectItem key={expense.id} value={expense.id!}>
											<span className="font-medium">{expense.title}</span>
											<span className="text-muted-foreground">
												{' '}
												· {formatCurrency(expense.amount)}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</section>
					)}

					<section className={cn(cardSurface, 'space-y-3 p-4')}>
						<p className={sectionLabel}>Type</p>
						<div
							className={cn(
								'grid gap-2',
								transaction ? 'grid-cols-2' : 'grid-cols-3'
							)}
						>
							{transactionTypes.map((t) => (
								<Button
									key={t}
									type="button"
									variant={type === t ? 'marketing' : 'outline'}
									onClick={() => handleTypeChange(t)}
									disabled={isSubmitting}
									className="h-10 rounded-xl capitalize"
								>
									{t}
								</Button>
							))}
						</div>
					</section>

					<section className={cn(cardSurface, 'space-y-4 p-4')}>
						<p className={sectionLabel}>Details</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5 sm:col-span-2">
								<Label htmlFor="transaction-title">Title *</Label>
								<Input
									id="transaction-title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="What was this?"
									disabled={isSubmitting}
									className={inputClass}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="transaction-amount">Amount *</Label>
								<Input
									id="transaction-amount"
									type="number"
									value={amount}
									onChange={(e) => setAmount(Number(e.target.value))}
									min="0.01"
									step="0.01"
									disabled={isSubmitting}
									className={inputClass}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="transaction-date">Date</Label>
								<Input
									id="transaction-date"
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									disabled={isSubmitting}
									className={inputClass}
								/>
							</div>
						</div>
					</section>

					<section className={cn(cardSurface, 'space-y-4 p-4')}>
						<p className={sectionLabel}>Account</p>
						{accounts.length > 0 && (
							<div className="space-y-1.5">
								<Label htmlFor="transaction-account">
									{type === 'transfer' ? 'From account' : 'Account'} *
								</Label>
								<Select value={accountId} onValueChange={setAccountId} disabled={isSubmitting}>
									<SelectTrigger id="transaction-account" className={inputClass}>
										<SelectValue placeholder="Select account" />
									</SelectTrigger>
									<SelectContent>
										{accounts.map((a) => (
											<SelectItem key={a.id} value={a.id!}>
												<span className="flex items-center gap-2">
													<span
														className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
														style={{ backgroundColor: a.color ?? '#6366f1' }}
													/>
													{a.name} ({formatCurrency(a.balance)})
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						{type === 'transfer' && (
							<div className="space-y-1.5">
								<Label htmlFor="transaction-transfer-account">To account *</Label>
								<Select
									value={transferAccountId}
									onValueChange={setTransferAccountId}
									disabled={isSubmitting}
								>
									<SelectTrigger id="transaction-transfer-account" className={inputClass}>
										<SelectValue placeholder="Select destination" />
									</SelectTrigger>
									<SelectContent>
										{availableTransferAccounts.map((a) => (
											<SelectItem key={a.id} value={a.id!}>
												<span className="flex items-center gap-2">
													<span
														className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
														style={{ backgroundColor: a.color ?? '#6366f1' }}
													/>
													{a.name} ({formatCurrency(a.balance)})
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						{type === 'transfer' && (
							<div className="space-y-1.5">
								<Label htmlFor="transaction-description">Notes</Label>
								<Textarea
									id="transaction-description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Optional"
									rows={2}
									disabled={isSubmitting}
									className="min-h-[72px] rounded-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
								/>
							</div>
						)}
					</section>

					{type !== 'transfer' && (
						<section className={cn(cardSurface, 'space-y-4 p-4')}>
							<p className={sectionLabel}>Category</p>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="transaction-category">Category *</Label>
									<Select
										value={category}
										onValueChange={handleCategoryChange}
										disabled={isSubmitting}
									>
										<SelectTrigger id="transaction-category" className={inputClass}>
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
										<SelectContent>
											{availableCategories.map((cat) => (
												<SelectItem key={cat.value} value={cat.value}>
													{cat.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								{availableSubcategories.length > 0 && (
									<div className="space-y-1.5">
										<Label htmlFor="transaction-subcategory">Subcategory</Label>
										<Select
											value={subcategory || '__none__'}
											onValueChange={(value) =>
												setSubcategory(value === '__none__' ? '' : value)
											}
											disabled={isSubmitting}
										>
											<SelectTrigger id="transaction-subcategory" className={inputClass}>
												<SelectValue placeholder="Optional" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="__none__">No subcategory</SelectItem>
												{availableSubcategories.map((cat) => (
													<SelectItem key={cat.value} value={cat.value}>
														{cat.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="transaction-description">Notes</Label>
								<Textarea
									id="transaction-description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Optional"
									rows={2}
									disabled={isSubmitting}
									className="min-h-[72px] rounded-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
								/>
							</div>
						</section>
					)}
				</div>

				<footer className="sticky bottom-0 flex gap-3 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950 sm:px-6">
					<SidePanelClose asChild>
						<Button
							type="button"
							variant="outline"
							className="h-11 flex-1 rounded-xl"
							disabled={isSubmitting}
						>
							Cancel
						</Button>
					</SidePanelClose>
					<Button
						type="submit"
						variant="marketing"
						className="h-11 flex-[1.4] rounded-xl"
						disabled={isSubmitting || (type === 'transfer' && !transferAccountId)}
					>
						{isSubmitting
							? transaction
								? 'Saving...'
								: 'Adding...'
							: transaction
								? 'Save changes'
								: 'Add transaction'}
					</Button>
				</footer>
			</form>
		</SidePanelContent>
	);
};

export default TransactionForm;
