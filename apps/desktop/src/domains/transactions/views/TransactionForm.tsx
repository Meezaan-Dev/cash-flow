import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';
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
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { Textarea } from '@/components/app/ui/textarea';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { TransactionType } from '@/types';

interface TransactionFormProps {
	onClose: () => void;
	onSuccess?: (message: string) => void;
	transaction?: Transaction;
	recurringTransaction?: RecurringTransaction;
	recurringOccurrenceDate?: Date;
	recurringOccurrenceDateKey?: string;
}

const stepLabels = ['Type & amount', 'Details', 'Review'] as const;
const TYPE_STEP = 1;
const DETAILS_STEP = 2;
const REVIEW_STEP = 3;

const getDateInputValue = (value: Transaction['date']): string => {
	const parsed = parseDbDateOrNull(value);
	return parsed ? parsed.toISOString().split('T')[0] : '';
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

	const [step, setStep] = useState(TYPE_STEP);
	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
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

	const defaultAccountId = React.useMemo(() => {
		const mainAccount = accounts.find((account) => account.id === mainAccountId);
		return mainAccount?.id ?? accounts[0]?.id ?? '';
	}, [accounts, mainAccountId]);

	const selectedAccount = accounts.find((account) => account.id === accountId);
	const selectedTransferAccount = accounts.find((account) => account.id === transferAccountId);
	const selectedCategory = categories.find((item) => item.value === category);
	const selectedSubcategory = selectedCategory?.subcategories?.find((item) => item.value === subcategory);
	const availableCategories = React.useMemo(
		() => mergeCategoryOptions(categoryOptions, category ? [category] : []),
		[categoryOptions, category]
	);
	const availableSubcategories = React.useMemo(
		() =>
			mergeCategoryOptions(
				selectedCategory?.subcategories ?? [],
				subcategory ? [subcategory] : []
			),
		[selectedCategory, subcategory]
	);
	const isTransferMode = type === 'transfer';
	const amountNumber = Number(amount);
	const formattedAmount = Number.isFinite(amountNumber) && amountNumber > 0
		? formatCurrency(amountNumber)
		: 'Not set';
	const inputClass = 'h-11 rounded-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950';

	useEffect(() => {
		if (transaction) {
			setTitle(transaction.title);
			setAmount(String(transaction.amount));
			setType(transaction.type);
			setAccountId(transaction.accountId ?? '');
			setTransferAccountId(transaction.transferAccountId ?? '');
			setCategory(transaction.category ?? '');
			setSubcategory(transaction.subcategory ?? '');
			setDescription(transaction.description ?? '');
			setDate(getDateInputValue(transaction.date) || new Date().toISOString().split('T')[0]);
			setSelectedRecurringId(null);
			setStep(DETAILS_STEP);
			setError('');
			return;
		}

		if (initialRecurringTransaction) {
			setTitle(initialRecurringTransaction.title);
			setAmount(String(initialRecurringTransaction.amount));
			setType((initialRecurringTransaction.type as TransactionType) ?? 'expense');
			setAccountId(initialRecurringTransaction.accountId || '');
			setCategory(initialRecurringTransaction.category ?? '');
			setSubcategory(initialRecurringTransaction.subcategory ?? '');
			setDescription(initialRecurringTransaction.description ?? '');
			setDate((recurringOccurrenceDate ?? new Date()).toISOString().split('T')[0]);
			setSelectedRecurringId(initialRecurringTransaction.id || null);
			setStep(TYPE_STEP);
			setError('');
			return;
		}

		setTitle('');
		setAmount('');
		setType('expense');
		setCategory('');
		setSubcategory('');
		setDescription('');
		setAccountId('');
		setTransferAccountId('');
		setDate(new Date().toISOString().split('T')[0]);
		setSelectedRecurringId(null);
		setStep(TYPE_STEP);
		setError('');
	}, [transaction, initialRecurringTransaction, recurringOccurrenceDate]);

	useEffect(() => {
		if (!accountId && defaultAccountId) {
			setAccountId(defaultAccountId);
		}
	}, [accountId, defaultAccountId]);

	useEffect(() => {
		if (!selectedRecurringId || transaction) return;
		const selectedRecurring = recurringTransactions.find((item) => item.id === selectedRecurringId);
		if (!selectedRecurring) return;

		setTitle(selectedRecurring.title);
		setAmount(String(selectedRecurring.amount));
		setType((selectedRecurring.type as TransactionType) ?? 'expense');
		if (selectedRecurring.accountId) setAccountId(selectedRecurring.accountId);
		setCategory(selectedRecurring.category ?? '');
		setSubcategory(selectedRecurring.subcategory ?? '');
		setDescription(selectedRecurring.description ?? '');
		setError('');
	}, [selectedRecurringId, recurringTransactions, transaction]);

	useEffect(() => {
		if (!subcategory) return;
		const stillAvailable = availableSubcategories.some((item) => item.value === subcategory);
		if (!stillAvailable) setSubcategory('');
	}, [availableSubcategories, subcategory]);

	const resetNewTransactionForm = () => {
		setTitle('');
		setAmount('');
		setType('expense');
		setCategory('');
		setSubcategory('');
		setDescription('');
		setTransferAccountId('');
		setDate(new Date().toISOString().split('T')[0]);
		setSelectedRecurringId(null);
		setStep(TYPE_STEP);
		setError('');
		if (defaultAccountId) setAccountId(defaultAccountId);
	};

	const clearRecurringSelection = () => {
		setSelectedRecurringId(null);
		setTitle('');
		setAmount('');
		setCategory('');
		setSubcategory('');
		setDescription('');
		setError('');
	};

	const handleCategoryChange = (value: string) => {
		setCategory(value);
		setSubcategory('');
		setError('');
	};

	const handleTypeChange = (nextType: TransactionType) => {
		setType(nextType);
		setError('');
		if (nextType === 'transfer') {
			setCategory('');
			setSubcategory('');
			setSelectedRecurringId(null);
		}
	};

	const validateStep = (targetStep: number): boolean => {
		setError('');

		if (targetStep === TYPE_STEP) {
			if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
				setError('Please enter an amount.');
				return false;
			}
		}

		if (targetStep === DETAILS_STEP) {
			if (!title.trim()) {
				setError('Please enter a title.');
				return false;
			}
			if (!accountId) {
				setError('Please select an account.');
				return false;
			}
			if (isTransferMode) {
				if (!transferAccountId) {
					setError('Please select a destination account.');
					return false;
				}
				if (transferAccountId === accountId) {
					setError('Source and destination accounts must be different.');
					return false;
				}
			} else if (!category.trim() && !transaction?.category && !initialRecurringTransaction?.category) {
				setError('Please select a category.');
				return false;
			}
		}

		return true;
	};

	const goNext = () => {
		if (!validateStep(step)) return;
		setStep((currentStep) => Math.min(currentStep + 1, REVIEW_STEP));
	};

	const goBack = () => {
		setError('');
		setStep((currentStep) => Math.max(currentStep - 1, TYPE_STEP));
	};

	const handleSubmit = async () => {
		if (submitInFlightRef.current) return;
		if (!validateStep(TYPE_STEP) || !validateStep(DETAILS_STEP)) return;

		submitInFlightRef.current = true;
		setIsSubmitting(true);

		try {
			const transactionDate = date ? new Date(date) : new Date();
			const categoryForSubmit = isTransferMode
				? 'transfer'
				: category.trim() || transaction?.category || initialRecurringTransaction?.category || '';
			const subcategoryForSubmit = isTransferMode
				? undefined
				: subcategory.trim() || (!category ? transaction?.subcategory : undefined);
			const recurringIdForSubmit = selectedRecurringId ?? initialRecurringTransaction?.id;
			const recurringDateForSubmit = recurringIdForSubmit
				? recurringOccurrenceDateKey ?? getRecurringOccurrenceDateKey(transactionDate)
				: undefined;

			if (transaction?.id) {
				await updateTransaction(transaction.id, {
					title,
					amount: amountNumber,
					type,
					accountId,
					category: categoryForSubmit,
					subcategory: subcategoryForSubmit,
					description,
					date: transactionDate,
				});
			} else if (isTransferMode) {
				await addTransfer({
					fromAccountId: accountId,
					toAccountId: transferAccountId,
					amount: amountNumber,
					title,
					description,
					date: transactionDate,
				});
			} else {
				await addTransaction({
					title,
					amount: amountNumber,
					type,
					accountId,
					category: categoryForSubmit,
					subcategory: subcategoryForSubmit,
					description,
					date: transactionDate,
					recurringTransactionId: recurringIdForSubmit,
					recurringOccurrenceDate: recurringDateForSubmit,
				});
			}

			onSuccess?.(
				transaction
					? 'Transaction updated successfully.'
					: isTransferMode
						? 'Transfer added successfully.'
						: `${type === 'expense' ? 'Expense' : 'Income'} added successfully.`
			);

			if (transaction || initialRecurringTransaction) {
				onClose();
			} else {
				resetNewTransactionForm();
			}
		} catch (error) {
			console.error('Failed to submit transaction:', error);
			setError(getAppErrorMessage(error, { operation: 'Save transaction' }));
		} finally {
			submitInFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	if (transaction?.type === 'transfer') {
		return (
			<div className="space-y-6">
				<DialogHeader>
					<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
						Transfer
					</p>
					<DialogTitle className="text-2xl font-semibold tracking-tight">
						Transfer details
					</DialogTitle>
					<DialogDescription>
						Transfers cannot be edited because both linked records and account balances must
						stay in sync.
					</DialogDescription>
				</DialogHeader>
				<p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
					Delete this transfer and create it again if you need to make changes.
				</p>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</div>
		);
	}

	return (
		<div className="flex max-h-[82vh] min-h-0 flex-col overflow-hidden">
			<DialogHeader className="shrink-0 border-b border-gray-200 px-1 pb-4 dark:border-gray-800">
				<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
					{transaction ? 'Edit' : 'New'}
				</p>
				<DialogTitle className="text-2xl font-semibold tracking-tight">
					{transaction ? 'Edit transaction' : 'Add transaction'}
				</DialogTitle>
				<DialogDescription>
					{isTransferMode
						? 'Move money between accounts in a short guided flow.'
						: 'Capture the amount first, then fill in the details and review.'}
				</DialogDescription>
			</DialogHeader>

			<div className="shrink-0 px-1 py-4">
				<div className="grid grid-cols-3 gap-2">
					{stepLabels.map((label, index) => {
						const stepNumber = index + 1;
						const active = stepNumber === step;
						const complete = step > stepNumber;
						return (
							<div
								key={label}
								className={cn(
									'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold',
									active
										? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
										: complete
											? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
											: 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400'
								)}
							>
								<span className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">
									{complete ? <FiCheck className="h-3 w-3" /> : stepNumber}
								</span>
								<span className="truncate">{label}</span>
							</div>
						);
					})}
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
				{error && (
					<div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
						{error}
					</div>
				)}

				{step === TYPE_STEP && (
					<div className="space-y-5">
						{!transaction && recurringTransactions.length > 0 && !isTransferMode && (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<FiRefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									<Label htmlFor="quick-fill" className="text-sm font-medium">
										Quick fill
									</Label>
								</div>
								<Select
									value={selectedRecurringId || '__none__'}
									onValueChange={(value) =>
										value === '__none__' ? clearRecurringSelection() : setSelectedRecurringId(value)
									}
								>
									<SelectTrigger id="quick-fill" className={inputClass}>
										<SelectValue placeholder="From a recurring template" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__none__">Start fresh</SelectItem>
										{recurringTransactions.map((item) => (
											<SelectItem key={item.id} value={item.id!}>
												<span className="font-medium">{item.title}</span>
												<span className="text-muted-foreground">
													{' '}
													· {formatCurrency(item.amount)}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
							<div className="mb-4 flex items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
									Transaction type
								</p>
								{!transaction && (
									<Button
										type="button"
										variant="ghost"
										onClick={() => handleTypeChange(isTransferMode ? 'expense' : 'transfer')}
										disabled={isSubmitting}
										className="h-8 rounded-xl px-2 text-xs"
									>
										{isTransferMode ? 'Add income/expense' : 'Transfer between accounts'}
									</Button>
								)}
							</div>
							{isTransferMode ? (
								<div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
									Transfer between accounts
								</div>
							) : (
								<div className="grid grid-cols-2 gap-2">
									{(['expense', 'income'] as const).map((item) => (
										<Button
											key={item}
											type="button"
											variant={type === item ? 'marketing' : 'outline'}
											onClick={() => handleTypeChange(item)}
											disabled={isSubmitting}
											className="h-11 rounded-xl capitalize"
										>
											{item}
										</Button>
									))}
								</div>
							)}
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="transaction-amount">Amount *</Label>
							<Input
								id="transaction-amount"
								type="number"
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								min="0.01"
								step="0.01"
								disabled={isSubmitting}
								className={inputClass}
								required
							/>
						</div>
					</div>
				)}

				{step === DETAILS_STEP && (
					<div className="space-y-5">
						<div className="space-y-1.5">
							<Label htmlFor="transaction-title">Title *</Label>
							<Input
								id="transaction-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder={isTransferMode ? 'Transfer label' : 'What was this?'}
								disabled={isSubmitting}
								className={inputClass}
								required
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="transaction-account">
									{isTransferMode ? 'From account' : 'Account'} *
								</Label>
								<Select value={accountId} onValueChange={setAccountId} disabled={isSubmitting}>
									<SelectTrigger id="transaction-account" className={inputClass}>
										<SelectValue placeholder="Select account" />
									</SelectTrigger>
									<SelectContent>
										{accounts.map((account) => (
											<SelectItem key={account.id} value={account.id!}>
												{account.name} ({formatCurrency(account.balance)})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{isTransferMode ? (
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
											{accounts
												.filter((account) => account.id !== accountId)
												.map((account) => (
													<SelectItem key={account.id} value={account.id!}>
														{account.name} ({formatCurrency(account.balance)})
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
							) : (
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
											{availableCategories.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="transaction-date">Date</Label>
							<Input
								id="transaction-date"
								type="date"
								value={date}
								onChange={(event) => setDate(event.target.value)}
								disabled={isSubmitting}
								className={inputClass}
							/>
						</div>

						<details
							open={transaction ? true : undefined}
							className="group overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
						>
							<summary className="cursor-pointer px-4 py-3 text-left">
								<span>
									<span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
										Optional details
									</span>
									<span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
										{isTransferMode ? 'Notes for the transfer.' : 'Subcategory and notes.'}
									</span>
								</span>
							</summary>
							<div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-800">
								{!isTransferMode && availableSubcategories.length > 0 && (
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
												{availableSubcategories.map((item) => (
													<SelectItem key={item.value} value={item.value}>
														{item.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
								<div className="space-y-1.5">
									<Label htmlFor="transaction-description">Notes</Label>
									<Textarea
										id="transaction-description"
										value={description}
										onChange={(event) => setDescription(event.target.value)}
										placeholder="Optional"
										rows={3}
										disabled={isSubmitting}
										className="min-h-[84px] rounded-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
									/>
								</div>
							</div>
						</details>
					</div>
				)}

				{step === REVIEW_STEP && (
					<div className="space-y-4">
						<div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
							<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
								Review
							</p>
							<h3 className="mt-2 text-xl font-semibold">
								{isTransferMode
									? `${selectedAccount?.name ?? 'Account'} to ${selectedTransferAccount?.name ?? 'destination'}`
									: title}
							</h3>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
								{isTransferMode
									? `Transfer ${formattedAmount}`
									: `${type === 'income' ? 'Income' : 'Expense'} · ${formattedAmount}`}
							</p>
						</div>

						<div className="grid gap-3 text-sm sm:grid-cols-2">
							<ReviewItem label="Title" value={title || 'Not set'} />
							<ReviewItem label="Date" value={date || 'Today'} />
							<ReviewItem label={isTransferMode ? 'From account' : 'Account'} value={selectedAccount?.name ?? 'Not set'} />
							{isTransferMode ? (
								<ReviewItem label="To account" value={selectedTransferAccount?.name ?? 'Not set'} />
							) : (
								<ReviewItem
									label="Category"
									value={[
										selectedCategory?.label ?? category,
										selectedSubcategory?.label,
									]
										.filter(Boolean)
										.join(' / ') || 'Not set'}
								/>
							)}
							<ReviewItem label="Notes" value={description || 'None'} />
							{selectedRecurringId && <ReviewItem label="Recurring" value="Linked template" />}
						</div>
					</div>
				)}
			</div>

			<DialogFooter className="shrink-0 gap-2 border-t border-gray-200 px-1 pt-4 dark:border-gray-800 sm:justify-between sm:space-x-0">
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					{step !== TYPE_STEP && (
						<Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting}>
							Back
						</Button>
					)}
				</div>
				{step === REVIEW_STEP ? (
					<Button type="button" variant="marketing" onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting
							? transaction
								? 'Saving...'
								: 'Adding...'
							: transaction
								? 'Save changes'
								: isTransferMode
									? 'Add transfer'
									: 'Add transaction'}
					</Button>
				) : (
					<Button type="button" variant="marketing" onClick={goNext} disabled={isSubmitting}>
						Continue
					</Button>
				)}
			</DialogFooter>
		</div>
	);
};

const ReviewItem = ({ label, value }: { label: string; value: string }) => (
	<div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
		<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
			{label}
		</p>
		<p className="mt-1 font-medium text-gray-900 dark:text-gray-50">{value}</p>
	</div>
);

export default TransactionForm;
