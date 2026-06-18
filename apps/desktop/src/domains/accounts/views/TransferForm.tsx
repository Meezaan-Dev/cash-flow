import React, { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import Currency from '@/components/marketing/Currency';
import { FormPageCard, FormPageShell } from '@/components/app/page-layout';
import { cardSurfaceInner } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Textarea } from '@/components/app/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';

interface TransferFormProps {
	onClose: () => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onClose }) => {
	const { accounts } = useAccountsContext();
	const { addTransfer } = useTransactionsContext();

	const [fromAccountId, setFromAccountId] = useState('');
	const [toAccountId, setToAccountId] = useState('');
	const [amount, setAmount] = useState(0);
	const [title, setTitle] = useState('Transfer');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const fromAccount = accounts.find((a) => a.id === fromAccountId);
	const toAccount = accounts.find((a) => a.id === toAccountId);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!fromAccountId || !toAccountId) {
			setError('Please select both source and destination accounts.');
			return;
		}
		if (fromAccountId === toAccountId) {
			setError('Source and destination accounts must be different.');
			return;
		}
		if (Number(amount) <= 0) {
			setError('Amount must be greater than zero.');
			return;
		}

		setLoading(true);
		try {
			await addTransfer({
				fromAccountId,
				toAccountId,
				amount: Number(amount),
				title: title.trim() || 'Transfer',
				description: description.trim() || undefined,
				date: date ? new Date(date) : new Date(),
			});
			onClose();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : 'Failed to complete transfer. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<FormPageShell>
			<FormPageCard className="max-w-lg">
				<div className="mb-8 border-b pb-6">
					<h2 className="text-3xl font-bold tracking-tight">Transfer Money</h2>
					<p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
						Move funds between your accounts
					</p>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{/* Live transfer summary */}
				{fromAccount && toAccount && Number(amount) > 0 && (
					<div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40">
						<div className="flex items-center justify-between gap-3 text-sm">
							<div className={cn('flex-1 p-3 text-center', cardSurfaceInner)}>
								<p className="mb-1 text-xs text-gray-500 dark:text-gray-400">From</p>
								<p className="truncate font-semibold">{fromAccount.name}</p>
								<Currency
									amount={fromAccount.balance - Number(amount)}
									className="mt-1 text-xs"
								/>
							</div>
							<FiArrowRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
							<div className={cn('flex-1 p-3 text-center', cardSurfaceInner)}>
								<p className="mb-1 text-xs text-gray-500 dark:text-gray-400">To</p>
								<p className="truncate font-semibold">{toAccount.name}</p>
								<Currency
									amount={toAccount.balance + Number(amount)}
									className="mt-1 text-xs"
								/>
							</div>
						</div>
						<p className="mt-3 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
							Transferring <Currency amount={Number(amount)} className="text-sm" />
						</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* From / To accounts */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">From Account</label>
							<Select value={fromAccountId} onValueChange={setFromAccountId}>
								<SelectTrigger className="h-11">
									<SelectValue placeholder="Select account" />
								</SelectTrigger>
								<SelectContent>
									{accounts.map((a) => (
										<SelectItem
											key={a.id}
											value={a.id!}
											disabled={a.id === toAccountId}
										>
											<span className="flex items-center gap-2">
												<span
													className="h-2 w-2 rounded-full flex-shrink-0"
													style={{
														backgroundColor:
															a.color ?? '#6366f1',
													}}
												/>
												{a.name}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">To Account</label>
							<Select value={toAccountId} onValueChange={setToAccountId}>
								<SelectTrigger className="h-11">
									<SelectValue placeholder="Select account" />
								</SelectTrigger>
								<SelectContent>
									{accounts.map((a) => (
										<SelectItem
											key={a.id}
											value={a.id!}
											disabled={a.id === fromAccountId}
										>
											<span className="flex items-center gap-2">
												<span
													className="h-2 w-2 rounded-full flex-shrink-0"
													style={{
														backgroundColor:
															a.color ?? '#6366f1',
													}}
												/>
												{a.name}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Amount + Date */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Amount (ZAR)</label>
							<Input
								type="number"
								step="0.01"
								min="0.01"
								value={amount}
								onChange={(e) => setAmount(Number(e.target.value))}
								placeholder="0.00"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Date</label>
							<Input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								required
							/>
						</div>
					</div>

					{/* Title */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium">Title</label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Transfer"
						/>
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium">Notes (optional)</label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional notes about this transfer"
							rows={2}
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-2">
						<Button type="submit" variant="marketing" className="h-12 flex-1" disabled={loading}>
							{loading ? 'Transferring...' : 'Complete Transfer'}
						</Button>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
					</div>
				</form>
			</FormPageCard>
		</FormPageShell>
	);
};

export default TransferForm;
