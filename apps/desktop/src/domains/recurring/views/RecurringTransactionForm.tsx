import React, { useState, useEffect } from 'react';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { FiDollarSign, FiTag, FiInfo, FiSave, FiRefreshCw, FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { RecurringTransaction } from '@cash-flow/shared';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { Textarea } from '@/components/app/ui/textarea';
import { DialogDescription, DialogTitle } from '@/components/app/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { Loader2 } from 'lucide-react';
import { mergeCategoryOptions } from '@cash-flow/shared/categories/categories';
import { formatCurrency } from '@/utils/formatCurrency';

interface RecurringTransactionFormProps {
	onClose: () => void;
	transaction?: RecurringTransaction;
}

const RecurringTransactionForm: React.FC<RecurringTransactionFormProps> = ({ onClose, transaction: expense }) => {
	const { addRecurringTransaction, updateRecurringTransaction } = useTransactionsContext();
	const { categories, categoryOptions } = useCategoriesContext();
	const { accounts } = useAccountsContext();
	const { mainAccountId } = useMainAccountPreference();
	const [title, setTitle] = useState(expense?.title ?? '');
	const [amount, setAmount] = useState(expense?.amount ?? 0);
	const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
		expense?.type ?? 'expense'
	);
	const [category, setCategory] = useState(expense?.category ?? '');
	const [subcategory, setSubcategory] = useState(expense?.subcategory ?? '');
	const [description, setDescription] = useState(expense?.description ?? '');
	const [mode, setMode] = useState<'template' | 'scheduled'>(
		expense?.mode ?? (expense?.expectedDate ? 'scheduled' : 'template')
	);
	const [expectedDate, setExpectedDate] = useState<number | ''>(expense?.expectedDate ?? '');
	const [accountId, setAccountId] = useState(expense?.accountId ?? '');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
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
	const defaultAccountId = React.useMemo(
		() => {
			const mainAccount = accounts.find((account) => account.id === mainAccountId);
			return mainAccount?.id ?? accounts[0]?.id ?? '';
		},
		[accounts, mainAccountId]
	);
	const selectedAccount = React.useMemo(
		() => accounts.find((account) => account.id === accountId),
		[accounts, accountId]
	);
	const selectedAccountLabel = selectedAccount
		? `${selectedAccount.name} (${formatCurrency(selectedAccount.balance)})`
		: '';

	const handleCategoryChange = (value: string) => {
		setCategory(value);
		setSubcategory('');
		setError('');
	};

	useEffect(() => {
		if (expense) {
			setTitle(expense.title);
			setAmount(expense.amount);
			setTransactionType(expense.type ?? 'expense');
			setCategory(expense.category ?? '');
			setSubcategory(expense.subcategory ?? '');
			setDescription(expense.description ?? '');
			setMode(expense.mode ?? (expense.expectedDate ? 'scheduled' : 'template'));
			setExpectedDate(expense.expectedDate ?? '');
			setAccountId(expense.accountId ?? '');
			setError('');
		} else {
			setTitle('');
			setAmount(0);
			setTransactionType('expense');
			setCategory('');
			setSubcategory('');
			setDescription('');
			setMode('template');
			setExpectedDate('');
			setAccountId('');
			setError('');
		}
	}, [expense]);

	useEffect(() => {
		if (!subcategory) return;
		const stillAvailable = availableSubcategories.some((item) => item.value === subcategory);
		if (!stillAvailable) {
			setSubcategory('');
		}
	}, [availableSubcategories, subcategory]);

	useEffect(() => {
		if (!expense && !accountId && defaultAccountId) {
			setAccountId(defaultAccountId);
		}
	}, [accountId, defaultAccountId, expense]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		if (!category.trim()) {
			setError('Please select a category.');
			return;
		}
		if (mode === 'scheduled' && expectedDate === '') {
			setError('Choose the day of month for this reminder.');
			return;
		}
		setIsSubmitting(true);
		try {
			const normalizedExpectedDate = expectedDate === '' ? undefined : expectedDate;
			const normalizedCategory = category.trim();
			const categoryForSubmit = expense
				? (normalizedCategory || expense.category || '')
				: normalizedCategory;
			const data: Pick<
				RecurringTransaction,
				| 'title'
				| 'amount'
				| 'type'
				| 'category'
				| 'subcategory'
				| 'description'
				| 'mode'
				| 'frequency'
				| 'expectedDate'
				| 'accountId'
			> = {
				title,
				amount: Number(amount),
				type: transactionType,
				category: categoryForSubmit,
				subcategory: subcategory || undefined,
				description,
				accountId: accountId || undefined,
				mode,
				frequency: mode === 'scheduled' ? 'monthly' : undefined,
				expectedDate: mode === 'scheduled' ? normalizedExpectedDate : undefined,
			};

			if (expense && expense.id) {
				await updateRecurringTransaction(expense.id, data);
			} else {
				await addRecurringTransaction(data);
			}
			onClose();
		} catch (error) {
			console.error('Error saving recurring transaction:', error);
			setError(getAppErrorMessage(error, { operation: 'Save recurring transaction' }));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between border-b pb-4">
				<div>
					<DialogTitle className="text-xl font-bold tracking-tight">
						{expense ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
					</DialogTitle>
					<DialogDescription className="mt-1 text-xs text-muted-foreground">
						{expense
							? 'Update your recurring transaction details'
							: 'Set up a transaction that repeats automatically'}
					</DialogDescription>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5">
				{error && (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{/* Type selector */}
				<div className="space-y-2">
					<Label className="flex items-center gap-2 text-sm font-medium">
						Transaction Type
					</Label>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => setTransactionType('expense')}
							className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${transactionType === 'expense'
									? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
									: 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
								}`}
						>
							<FiArrowDownCircle className="h-4 w-4" />
							Expense
						</button>
						<button
							type="button"
							onClick={() => setTransactionType('income')}
							className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${transactionType === 'income'
									? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
									: 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
								}`}
						>
							<FiArrowUpCircle className="h-4 w-4" />
							Income
						</button>
					</div>
				</div>

				{/* Account selector */}
				{accounts.length > 0 && (
					<div className="space-y-2">
						<Label htmlFor="re-account" className="text-sm font-medium">
							Account
						</Label>
						<Select value={accountId} onValueChange={setAccountId}>
							<SelectTrigger id="re-account" className="h-10 rounded-lg border-2 transition-all focus:border-primary">
								{selectedAccountLabel ? (
									<span>{selectedAccountLabel}</span>
								) : (
									<SelectValue placeholder="Select account" />
								)}
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

				{/* Title and Amount */}
				<div className="grid gap-5 md:grid-cols-2">
					<div className="space-y-2">
						<Label
							htmlFor="re-title"
							className="flex items-center gap-2 text-sm font-medium"
						>
							<FiTag className="h-4 w-4 text-muted-foreground" />
							Title
						</Label>
						<Input
							id="re-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Netflix Subscription"
							required
							className="h-10 rounded-lg border-2 transition-all focus:border-primary"
						/>
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="re-amount"
							className="flex items-center gap-2 text-sm font-medium"
						>
							<FiDollarSign className="h-4 w-4 text-muted-foreground" />
							Amount
						</Label>
						<Input
							id="re-amount"
							type="number"
							value={amount}
							onChange={(e) => setAmount(Number(e.target.value))}
							placeholder="0.00"
							required
							step="0.01"
							min="0"
							className="h-10 rounded-lg border-2 transition-all focus:border-primary"
						/>
					</div>
				</div>

				{/* Category and schedule */}
				<div className="grid gap-5 md:grid-cols-2">
					<div className="space-y-2">
						<Label
							htmlFor="re-category"
							className="flex items-center gap-2 text-sm font-medium"
						>
							<FiTag className="h-4 w-4 text-muted-foreground" />
							Category
						</Label>
						<Select value={category} onValueChange={handleCategoryChange}>
							<SelectTrigger
								id="re-category"
								className="h-10 rounded-lg border-2 transition-all focus:border-primary"
							>
								<SelectValue placeholder="Select a category" />
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
						<div className="space-y-2">
							<Label htmlFor="re-subcategory" className="text-sm font-medium">
								Subcategory
							</Label>
							<Select
								value={subcategory || '__none__'}
								onValueChange={(value) =>
									setSubcategory(value === '__none__' ? '' : value)
								}
							>
								<SelectTrigger
									id="re-subcategory"
									className="h-10 rounded-lg border-2 transition-all focus:border-primary"
								>
									<SelectValue placeholder="Select a subcategory" />
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

					<div className="space-y-2">
						<Label
							htmlFor="re-mode"
							className="flex items-center gap-2 text-sm font-medium"
						>
							<FiRefreshCw className="h-4 w-4 text-muted-foreground" />
							Reminder
						</Label>
						<Select
							value={mode}
							onValueChange={(value) => {
								setMode(value as 'template' | 'scheduled');
								if (value === 'template') setExpectedDate('');
							}}
						>
							<SelectTrigger
								id="re-mode"
								className="h-10 rounded-lg border-2 transition-all focus:border-primary"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="template">Template only</SelectItem>
								<SelectItem value="scheduled">Monthly reminder</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Templates appear in Quick Fill without creating reminders.
						</p>
					</div>

					{mode === 'scheduled' && <div className="space-y-2">
						<Label htmlFor="re-expected-date" className="text-sm font-medium">
							Day of month
						</Label>
						<Input
							id="re-expected-date"
							type="number"
							value={expectedDate}
							onChange={(e) => {
								const value = e.target.value;
								setExpectedDate(value === '' ? '' : Number(value));
							}}
							placeholder="e.g. 1"
							min="1"
							max="31"
							className="h-10 rounded-lg border-2 transition-all focus:border-primary"
						/>
						<p className="text-xs text-muted-foreground">
							Shorter months use their final day.
						</p>
					</div>}
				</div>

				{/* Description */}
				<div className="space-y-2">
					<Label
						htmlFor="re-description"
						className="flex items-center gap-2 text-sm font-medium"
					>
						<FiInfo className="h-4 w-4 text-muted-foreground" />
						Description{' '}
						<span className="text-xs text-muted-foreground">(Optional)</span>
					</Label>
					<Textarea
						id="re-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Add any additional details or notes..."
						rows={3}
						className="rounded-lg border-2 transition-all focus:border-primary resize-none"
					/>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-2">
					<Button
						type="submit"
						className="flex-1 h-11 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : (
							<>
								<FiSave className="mr-2 h-4 w-4" />
								{expense ? 'Update Transaction' : 'Add Transaction'}
							</>
						)}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isSubmitting}
						className="h-11 rounded-lg px-5"
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	);
};

export default RecurringTransactionForm;
