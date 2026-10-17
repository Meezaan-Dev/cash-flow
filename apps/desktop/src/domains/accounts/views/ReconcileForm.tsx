import React, { useMemo, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { FormPageCard, FormPageShell } from '@/components/app/page-layout';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/app/ui/select';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { formatCurrency } from '@/utils/formatCurrency';
import { getBalanceAdjustment } from '@/domains/accounts/utils/balanceAdjustment';

interface ReconcileFormProps {
	onClose: () => void;
	accountId?: string;
}

type Step = 'edit' | 'confirm' | 'done';
const todayKey = () => new Date().toISOString().split('T')[0];

const ReconcileForm: React.FC<ReconcileFormProps> = ({ onClose, accountId }) => {
	const { accounts } = useAccountsContext();
	const { addTransaction } = useTransactionsContext();
	const { categoryOptions } = useCategoriesContext();
	const { mainAccountId } = useMainAccountPreference();
	const defaultAccountId =
		accountId ?? accounts.find((item) => item.id === mainAccountId)?.id ?? accounts[0]?.id ?? '';

	const [step, setStep] = useState<Step>('edit');
	const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);
	const selectedAccount = useMemo(
		() => accounts.find((item) => item.id === selectedAccountId),
		[accounts, selectedAccountId]
	);
	const [balance, setBalance] = useState(
		String(accounts.find((item) => item.id === defaultAccountId)?.balance ?? '')
	);
	const [title, setTitle] = useState('Balance adjustment');
	const [category, setCategory] = useState(
		categoryOptions.find((item) => item.value === 'other')?.value ?? categoryOptions[0]?.value ?? 'other'
	);
	const [date, setDate] = useState(todayKey());
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const newBalance = Number(balance);
	const adjustment = getBalanceAdjustment(selectedAccount?.balance ?? 0, newBalance);
	const difference = selectedAccount && Number.isFinite(newBalance) ? adjustment.difference : 0;
	const hasAdjustment = Math.abs(difference) >= 0.005;

	const handleAccountChange = (value: string) => {
		setSelectedAccountId(value);
		setBalance(String(accounts.find((item) => item.id === value)?.balance ?? ''));
	};

	const review = () => {
		if (!selectedAccount) return setError('Choose an account to update.');
		if (!balance.trim() || !Number.isFinite(newBalance)) return setError('Enter a valid real balance.');
		if (hasAdjustment && (!title.trim() || !category || !date)) {
			return setError('Title, category, and date are required for the adjustment.');
		}
		setError('');
		setStep('confirm');
	};

	const confirm = async () => {
		if (!selectedAccount?.id) return;
		setLoading(true);
		setError('');
		try {
			if (hasAdjustment) {
				await addTransaction({
					type: adjustment.type,
					accountId: selectedAccount.id,
					title: title.trim(),
					category,
					amount: Math.abs(difference),
					description: notes.trim() || `Balance updated to ${formatCurrency(newBalance)}`,
					date: new Date(`${date}T12:00:00`),
				});
			}
			setStep('done');
		} catch (caught) {
			setError(getAppErrorMessage(caught, { operation: 'Balance update' }));
		} finally {
			setLoading(false);
		}
	};

	if (step === 'done') {
		return (
			<FormPageShell>
				<FormPageCard className="max-w-md text-center">
					<FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
					<h2 className="text-2xl font-bold">Balance updated</h2>
					<p className="mt-2 text-muted-foreground">
						{hasAdjustment
							? `One ${difference > 0 ? 'income' : 'expense'} adjustment was recorded for ${formatCurrency(Math.abs(difference))}.`
							: 'The balance already matched, so no transaction was created.'}
					</p>
					<Button className="mt-6 w-full" onClick={onClose}>Done</Button>
				</FormPageCard>
			</FormPageShell>
		);
	}

	return (
		<FormPageShell>
			<FormPageCard className="max-w-xl">
				<h2 className="text-3xl font-bold tracking-tight">Update balance</h2>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Enter the real balance. Cash Flow will record the difference as one normal transaction.
				</p>
				{error && <p className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

				<div className="mt-6 space-y-5">
					{!accountId && (
						<label className="block space-y-1.5 text-sm font-medium">
							Account
							<Select value={selectedAccountId} onValueChange={handleAccountChange} disabled={step === 'confirm'}>
								<SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
								<SelectContent>
									{accounts.map((item) => item.id && <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
								</SelectContent>
							</Select>
						</label>
					)}

					<div className="grid gap-3 sm:grid-cols-3">
						{[
							['Current balance', selectedAccount?.balance ?? 0],
							['New balance', Number.isFinite(newBalance) ? newBalance : 0],
							['Difference', difference],
						].map(([label, amount]) => (
							<div key={String(label)} className="rounded-xl border bg-muted/30 p-4">
								<p className="text-xs text-muted-foreground">{label}</p>
								<p className="mt-1 font-bold">{label === 'Difference' && difference > 0 ? '+' : ''}{formatCurrency(Number(amount))}</p>
							</div>
						))}
					</div>

					{step === 'edit' ? (
						<>
							<label className="block space-y-1.5 text-sm font-medium">
								Real balance
								<Input type="number" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} />
							</label>
							{hasAdjustment && (
								<div className="grid gap-4 sm:grid-cols-2">
									<label className="space-y-1.5 text-sm font-medium">Title<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
									<label className="space-y-1.5 text-sm font-medium">Category
										<Select value={category} onValueChange={setCategory}>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>{categoryOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
										</Select>
									</label>
									<label className="space-y-1.5 text-sm font-medium">Date<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
									<label className="space-y-1.5 text-sm font-medium">Notes<Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" /></label>
								</div>
							)}
						</>
					) : (
						<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
							<p className="font-semibold">Confirm this is correct</p>
							<p className="mt-1 text-muted-foreground">
								{hasAdjustment
									? `Create one ${difference > 0 ? 'income' : 'expense'} transaction for ${formatCurrency(Math.abs(difference))} in ${selectedAccount?.name}?`
									: `${selectedAccount?.name} already matches the entered balance. No transaction will be written.`}
							</p>
						</div>
					)}

					<div className="flex gap-3 pt-2">
						<Button className="flex-1" onClick={step === 'edit' ? review : confirm} disabled={loading || !selectedAccount}>
							{step === 'edit' ? 'Review update' : loading ? 'Updating...' : 'Confirm update'}
						</Button>
						<Button variant="outline" onClick={step === 'confirm' ? () => setStep('edit') : onClose}>{step === 'confirm' ? 'Back' : 'Cancel'}</Button>
					</div>
				</div>
			</FormPageCard>
		</FormPageShell>
	);
};

export default ReconcileForm;
