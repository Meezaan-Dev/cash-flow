import React, { useState, useEffect, useRef } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Transaction } from '@cash-flow/shared/transactions/TransactionModel';
import { RecurringTransaction } from '@/domains/recurring/models/RecurringTransactionModel';
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
import { FormPageCard, FormPageShell } from '@/components/app/page-layout';
import { formatCurrency } from '@/utils/formatCurrency';
import { mergeCategoryOptions } from '@cash-flow/shared/categories/categories';

interface TransactionFormProps {
	onClose: () => void;
	onSuccess?: (message: string) => void;
	transaction?: Transaction;
	recurringTransaction?: RecurringTransaction;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
	onClose,
	onSuccess,
	transaction,
	recurringTransaction: initialRecurringTransaction,
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
			setDate(new Date().toISOString().split('T')[0]);
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
	}, [transaction, initialRecurringTransaction]);

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

	if (transaction?.type === 'transfer') {
		return (
			<FormPageShell>
				<FormPageCard>
					<h2 className="text-3xl font-bold tracking-tight">Transfer details</h2>
					<p className="mt-3 text-sm text-muted-foreground">
						Transfers cannot be edited because both linked records and account balances must stay in
						sync. Delete this transfer and create it again to make changes.
					</p>
					<Button type="button" variant="outline" onClick={onClose} className="mt-6">
						Close
					</Button>
				</FormPageCard>
			</FormPageShell>
		);
	}

	return (
		<FormPageShell>
			<FormPageCard>
				{/* Header */}
				<div className="mb-8 border-b pb-6">
					<h2 className="text-3xl font-bold tracking-tight">
						{transaction ? 'Edit Transaction' : 'New Transaction'}
					</h2>
					<p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
						{transaction
							? 'Update your transaction details'
							: 'Add a new income, expense, or transfer'}
					</p>
				</div>

				{/* Recurring – Smart Autofill */}
				{!transaction && recurringTransactions.length > 0 && (
					<div className="mb-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/40">
						<div className="mb-3 flex items-center gap-2 text-sm font-medium">
							<FiRefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
							<Label htmlFor="quick-fill">Quick fill from a recurring expense</Label>
						</div>
						<Select
							value={selectedRecurringId || '__none__'}
							onValueChange={(value) =>
								setSelectedRecurringId(value === '__none__' ? null : value)
							}
						>
							<SelectTrigger id="quick-fill" className="h-11 rounded-lg">
								<SelectValue placeholder="Choose an expense to autofill" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Start fresh</SelectItem>
								{recurringTransactions.map((expense) => (
									<SelectItem key={expense.id} value={expense.id!}>
										<span className="font-medium">{expense.title}</span>
										<span className="text-muted-foreground"> • {formatCurrency(expense.amount)}</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
					{error && (
						<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{/* Transaction Type — 3 buttons */}
					<div className="space-y-1.5">
						<Label className="text-sm font-medium">Transaction type *</Label>
						<div className={`grid ${transaction ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
							{transactionTypes.map((t) => (
								<Button
									key={t}
									type="button"
									variant={type === t ? 'marketing' : 'outline'}
									onClick={() => handleTypeChange(t)}
									disabled={isSubmitting}
									className="h-14 rounded-2xl capitalize"
								>
									{t}
								</Button>
							))}
						</div>
					</div>

					{/* Account Selector */}
					{accounts.length > 0 && (
						<div className="space-y-1.5">
							<Label htmlFor="transaction-account" className="text-sm font-medium">
								{type === 'transfer' ? 'From Account' : 'Account'} *
							</Label>
							<Select value={accountId} onValueChange={setAccountId} disabled={isSubmitting}>
								<SelectTrigger id="transaction-account">
									<SelectValue placeholder="Select account" />
								</SelectTrigger>
								<SelectContent>
									{accounts.map((a) => (
										<SelectItem key={a.id} value={a.id!}>
											<span className="flex items-center gap-2">
												<span
													className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
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

					{/* Transfer To Account */}
					{type === 'transfer' && (
						<div className="space-y-1.5">
							<Label htmlFor="transaction-transfer-account" className="text-sm font-medium">
								To Account *
							</Label>
							<Select
								value={transferAccountId}
								onValueChange={setTransferAccountId}
								disabled={isSubmitting}
							>
								<SelectTrigger id="transaction-transfer-account">
									<SelectValue placeholder="Select destination account" />
								</SelectTrigger>
								<SelectContent>
									{availableTransferAccounts.map((a) => (
										<SelectItem key={a.id} value={a.id!}>
											<span className="flex items-center gap-2">
												<span
													className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
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

					{/* Title + Amount */}
					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="transaction-title" className="text-sm font-medium">
								Title *
							</Label>
							<Input
								id="transaction-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Title"
								disabled={isSubmitting}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="transaction-amount" className="text-sm font-medium">
								Amount *
							</Label>
							<Input
								id="transaction-amount"
								type="number"
								value={amount}
								onChange={(e) => setAmount(Number(e.target.value))}
								placeholder="Amount"
								min="0.01"
								step="0.01"
								disabled={isSubmitting}
								required
							/>
						</div>
					</div>

					{/* Category + Date — hide category for transfers */}
					<div className="grid gap-6 md:grid-cols-2">
						{type !== 'transfer' && (
							<div className="space-y-1.5">
								<Label htmlFor="transaction-category" className="text-sm font-medium">
									Category *
								</Label>
								<Select
									value={category}
									onValueChange={handleCategoryChange}
									disabled={isSubmitting}
								>
									<SelectTrigger id="transaction-category">
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
						)}
						<div
							className={`space-y-1.5 ${
								type === 'transfer' ? 'col-span-1 md:col-span-2' : ''
							}`}
						>
							<Label htmlFor="transaction-date" className="text-sm font-medium">
								Date
							</Label>
							<Input
								id="transaction-date"
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>
					</div>

					{type !== 'transfer' && availableSubcategories.length > 0 && (
						<div className="space-y-1.5">
							<Label htmlFor="transaction-subcategory" className="text-sm font-medium">
								Subcategory
							</Label>
							<Select
								value={subcategory || '__none__'}
								onValueChange={(value) =>
									setSubcategory(value === '__none__' ? '' : value)
								}
								disabled={isSubmitting}
							>
								<SelectTrigger id="transaction-subcategory">
									<SelectValue placeholder="Select subcategory" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">
										No subcategory
									</SelectItem>
									{availableSubcategories.map((cat) => (
										<SelectItem key={cat.value} value={cat.value}>
											{cat.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Description */}
					<div className="space-y-1.5">
						<Label htmlFor="transaction-description" className="text-sm font-medium">
							Notes
						</Label>
						<Textarea
							id="transaction-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional notes"
							rows={3}
							disabled={isSubmitting}
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-4">
						<Button
							type="submit"
							variant="marketing"
							className="h-12 flex-1"
							disabled={isSubmitting || (type === 'transfer' && !transferAccountId)}
						>
							{isSubmitting
								? transaction
									? 'Updating...'
									: 'Adding...'
								: transaction
									? 'Update Transaction'
									: 'Add Transaction'}
						</Button>
						<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
							Cancel
						</Button>
					</div>
				</form>
			</FormPageCard>
		</FormPageShell>
	);
};

export default TransactionForm;
