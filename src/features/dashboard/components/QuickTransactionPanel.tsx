import React, { useEffect, useMemo, useState } from 'react';
import { FiCreditCard, FiPlus } from 'react-icons/fi';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/features/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
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
import { Textarea } from '@/components/app/ui/textarea';
import { useToast } from '@/components/app/ui/use-toast';
import { TransactionType } from '@/types';
import { mergeCategoryOptions } from '@/features/categories/utils/categories';

interface QuickTransactionPanelProps {
	onCreateAccount: () => void;
}

const formatToday = () => new Date().toISOString().split('T')[0];

const QuickTransactionPanel: React.FC<QuickTransactionPanelProps> = ({
	onCreateAccount,
}) => {
	const { addTransaction, addTransfer } = useTransactionsContext();
	const { accounts, loading: accountsLoading } = useAccountsContext();
	const { categories, categoryOptions } = useCategoriesContext();
	const { toast } = useToast();

	const [type, setType] = useState<TransactionType>('expense');
	const [amount, setAmount] = useState('');
	const [title, setTitle] = useState('');
	const [accountId, setAccountId] = useState('');
	const [transferAccountId, setTransferAccountId] = useState('');
	const [category, setCategory] = useState('');
	const [subcategory, setSubcategory] = useState('');
	const [date, setDate] = useState(formatToday());
	const [description, setDescription] = useState('');
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const availableCategories = useMemo(
		() => mergeCategoryOptions(categoryOptions, [category || 'other']),
		[category, categoryOptions]
	);
	const selectedCategory = useMemo(
		() => categories.find((item) => item.value === category),
		[categories, category]
	);
	const availableSubcategories = useMemo(
		() => selectedCategory?.subcategories ?? [],
		[selectedCategory]
	);
	const availableTransferAccounts = useMemo(
		() => accounts.filter((account) => account.id && account.id !== accountId),
		[accountId, accounts]
	);

	useEffect(() => {
		if (!accountId && accounts[0]?.id) setAccountId(accounts[0].id);
	}, [accountId, accounts]);

	useEffect(() => {
		if (!category && availableCategories[0]?.value) {
			setCategory(availableCategories[0].value);
		}
	}, [availableCategories, category]);

	useEffect(() => {
		if (type !== 'transfer') return;
		if (!transferAccountId && availableTransferAccounts[0]?.id) {
			setTransferAccountId(availableTransferAccounts[0].id);
		}
		if (transferAccountId === accountId) {
			setTransferAccountId(availableTransferAccounts[0]?.id ?? '');
		}
	}, [accountId, availableTransferAccounts, transferAccountId, type]);

	useEffect(() => {
		if (!subcategory) return;
		if (!availableSubcategories.some((item) => item.value === subcategory)) {
			setSubcategory('');
		}
	}, [availableSubcategories, subcategory]);

	const resetForm = () => {
		setAmount('');
		setTitle('');
		setDescription('');
		setDate(formatToday());
		setError('');
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError('');

		const parsedAmount = Number(amount);
		if (!accountId) {
			setError('Choose an account first.');
			return;
		}
		if (!title.trim()) {
			setError('Add a short description.');
			return;
		}
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			setError('Enter an amount greater than zero.');
			return;
		}
		if (type === 'transfer' && !transferAccountId) {
			setError('Choose a destination account.');
			return;
		}

		setIsSubmitting(true);
		try {
			if (type === 'transfer') {
				await addTransfer({
					fromAccountId: accountId,
					toAccountId: transferAccountId,
					amount: parsedAmount,
					title: title.trim(),
					description,
					date: date ? new Date(date) : new Date(),
				});
			} else {
				await addTransaction({
					accountId,
					amount: parsedAmount,
					title: title.trim(),
					type,
					category: category || 'other',
					subcategory: subcategory || undefined,
					description,
					date: date ? new Date(date) : new Date(),
				});
			}

			toast({
				title: 'Transaction added',
				description: `${title.trim()} was added to CashFlow.`,
			});
			resetForm();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Unable to add the transaction right now.'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!accountsLoading && accounts.length === 0) {
		return (
			<section className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-lg border bg-card p-6 text-center xl:min-h-0">
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<FiCreditCard className="h-6 w-6 text-primary" />
				</div>
				<h2 className="text-lg font-semibold">Start with an account</h2>
				<p className="mt-2 max-w-sm text-sm text-muted-foreground">
					Create one bank, cash, savings, or credit account before adding
					transactions.
				</p>
				<Button className="mt-5" onClick={onCreateAccount}>
					<FiPlus className="mr-2 h-4 w-4" />
					Add account
				</Button>
			</section>
		);
	}

	return (
		<section className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-lg border bg-card p-4 xl:min-h-0">
			<div className="mb-4 flex-shrink-0">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					New transaction
				</p>
			</div>

			<form
				id="quick-transaction-form"
				onSubmit={handleSubmit}
				className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
			>
				<div className="grid grid-cols-3 gap-2">
					{(['income', 'expense', 'transfer'] as TransactionType[]).map((item) => (
						<Button
							key={item}
							type="button"
							variant={type === item ? 'default' : 'outline'}
							onClick={() => {
								setType(item);
								setError('');
							}}
							className="h-10 capitalize"
						>
							{item}
						</Button>
					))}
				</div>

				{error && (
					<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				<div className="space-y-1.5">
					<Label htmlFor="quick-amount">Amount</Label>
					<Input
						id="quick-amount"
						type="number"
						inputMode="decimal"
						min="0.01"
						step="0.01"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						placeholder="R 0.00"
						className="h-12 text-xl"
						disabled={accountsLoading || isSubmitting}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="quick-title">Description</Label>
					<Input
						id="quick-title"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="What was this for?"
						disabled={accountsLoading || isSubmitting}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					{type !== 'transfer' && (
						<div className="space-y-1.5">
							<Label>Category</Label>
							<Select
								value={category}
								onValueChange={(value) => {
									setCategory(value);
									setSubcategory('');
								}}
								disabled={accountsLoading || isSubmitting}
							>
								<SelectTrigger>
									<SelectValue placeholder="Category" />
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

					<div className="space-y-1.5">
						<Label>{type === 'transfer' ? 'From account' : 'Account'}</Label>
						<Select
							value={accountId}
							onValueChange={setAccountId}
							disabled={accountsLoading || isSubmitting}
						>
							<SelectTrigger>
								<SelectValue placeholder="Account" />
							</SelectTrigger>
							<SelectContent>
								{accounts.map((account) => (
									<SelectItem key={account.id} value={account.id!}>
										{account.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{type === 'transfer' ? (
					<div className="space-y-1.5">
						<Label>To account</Label>
						<Select
							value={transferAccountId}
							onValueChange={setTransferAccountId}
							disabled={accountsLoading || isSubmitting}
						>
							<SelectTrigger>
								<SelectValue placeholder="Destination account" />
							</SelectTrigger>
							<SelectContent>
								{availableTransferAccounts.map((account) => (
									<SelectItem key={account.id} value={account.id!}>
										{account.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : (
					availableSubcategories.length > 0 && (
						<div className="space-y-1.5">
							<Label>Subcategory</Label>
							<Select
								value={subcategory || '__none__'}
								onValueChange={(value) =>
									setSubcategory(value === '__none__' ? '' : value)
								}
								disabled={accountsLoading || isSubmitting}
							>
								<SelectTrigger>
									<SelectValue placeholder="Subcategory" />
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
					)
				)}

				<div className="space-y-1.5">
					<Label htmlFor="quick-date">Date</Label>
					<Input
						id="quick-date"
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
						disabled={accountsLoading || isSubmitting}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="quick-notes">Notes</Label>
					<Textarea
						id="quick-notes"
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder="Optional notes"
						rows={2}
						disabled={accountsLoading || isSubmitting}
					/>
				</div>

			</form>
			<div className="mt-3 flex-shrink-0">
				<Button
					type="submit"
					form="quick-transaction-form"
					className="h-12 w-full"
					disabled={accountsLoading || isSubmitting}
				>
					{isSubmitting ? 'Adding...' : 'Add transaction'}
				</Button>
			</div>
		</section>
	);
};

export default QuickTransactionPanel;
