import React, { useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { ACCOUNT_TYPE_LABELS } from '@/domains/accounts/models/AccountModel';
import { modalShell, pageBg } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';

interface ReconcileFormProps {
	onClose: () => void;
}

type Step = 'select' | 'reconcile' | 'done';

const ReconcileForm: React.FC<ReconcileFormProps> = ({ onClose }) => {
	const { accounts } = useAccountsContext();
	const { addTransaction } = useTransactionsContext();
	const { categoryOptions } = useCategoriesContext();

	const [step, setStep] = useState<Step>('select');
	const [selectedAccountId, setSelectedAccountId] = useState('');
	const [statementBalance, setStatementBalance] = useState(0);
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
	const reconcileCategory =
		categoryOptions.find((category) => category.value === 'other')?.value ??
		categoryOptions[0]?.value ??
		'other';
	const discrepancy = selectedAccount
		? Number(statementBalance) - selectedAccount.balance
		: 0;

	const handleSelectAccount = () => {
		if (!selectedAccountId) {
			setError('Please select an account.');
			return;
		}
		setError('');
		setStep('reconcile');
	};

	const handleReconcile = async () => {
		if (!selectedAccount?.id) return;

		setLoading(true);
		setError('');

		try {
			if (Math.abs(discrepancy) > 0.001) {
				// Create an adjustment transaction
				const isPositive = discrepancy > 0;
				await addTransaction({
					type: isPositive ? 'income' : 'expense',
					accountId: selectedAccount.id,
					title: 'Reconciliation Adjustment',
					category: reconcileCategory,
					amount: Math.abs(discrepancy),
					description: `Reconciled to statement balance of ${formatCurrency(statementBalance)}`,
					date: date ? new Date(date) : new Date(),
				});
			}
			setStep('done');
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : 'Failed to reconcile account. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	if (step === 'done') {
		return (
			<div className={cn('flex min-h-screen items-center justify-center p-4', pageBg)}>
				<div className={cn('w-full max-w-md p-8 text-center', modalShell)}>
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
						<FiCheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
					</div>
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						Reconciliation Complete
					</h2>
					<p className="text-muted-foreground mb-2">
						{selectedAccount?.name} has been reconciled to
					</p>
					<p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">
						{formatCurrency(Number(statementBalance))}
					</p>
					{Math.abs(discrepancy) > 0.001 && (
						<p className="text-sm text-muted-foreground mb-6">
							An adjustment of {formatCurrency(Math.abs(discrepancy))} was recorded.
						</p>
					)}
					{Math.abs(discrepancy) <= 0.001 && (
						<p className="text-sm text-muted-foreground mb-6">
							Your records were already balanced. No adjustment needed.
						</p>
					)}
					<Button className="w-full" onClick={onClose}>
						Done
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('flex min-h-screen items-center justify-center p-4', pageBg)}>
			<div className={cn('w-full max-w-lg p-8', modalShell)}>
				<div className="mb-8 border-b pb-6">
					<h2 className="text-3xl font-bold tracking-tight">Reconcile Account</h2>
					<p className="mt-1.5 text-sm text-muted-foreground">
						Match your account balance against your bank statement
					</p>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{step === 'select' && (
					<div className="space-y-5">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Select Account</label>
							<Select
								value={selectedAccountId}
								onValueChange={setSelectedAccountId}
							>
								<SelectTrigger className="h-11">
									<SelectValue placeholder="Choose an account to reconcile" />
								</SelectTrigger>
								<SelectContent>
									{accounts.map((a) => (
										<SelectItem key={a.id} value={a.id!}>
											<span className="flex items-center gap-2">
												<span
													className="h-2 w-2 rounded-full flex-shrink-0"
													style={{
														backgroundColor: a.color ?? '#6366f1',
													}}
												/>
												<span>
													{a.name}
													{a.bank ? ` — ${a.bank}` : ''}
												</span>
												<span className="ml-auto text-xs text-muted-foreground">
													{ACCOUNT_TYPE_LABELS[a.type]}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{selectedAccount && (
							<div className="rounded-xl border bg-muted/30 p-4">
								<p className="text-sm text-muted-foreground">Current balance</p>
								<p className="text-xl font-bold mt-1">
									{formatCurrency(selectedAccount.balance)}
								</p>
							</div>
						)}

						<div className="flex gap-3 pt-2">
							<Button
								className="flex-1 h-12"
								onClick={handleSelectAccount}
								disabled={!selectedAccountId}
							>
								Continue
							</Button>
							<Button type="button" variant="outline" onClick={onClose}>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{step === 'reconcile' && selectedAccount && (
					<div className="space-y-5">
						{/* Current vs Statement */}
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border bg-muted/30 p-4">
								<p className="text-xs text-muted-foreground mb-1">
									CashFlow Balance
								</p>
								<p className="text-lg font-bold">
									{formatCurrency(selectedAccount.balance)}
								</p>
							</div>
							<div className="rounded-xl border bg-muted/30 p-4">
								<p className="text-xs text-muted-foreground mb-1">
									Discrepancy
								</p>
								<p
									className={`text-lg font-bold ${
										Math.abs(discrepancy) < 0.001
											? 'text-green-600 dark:text-green-400'
											: 'text-amber-600 dark:text-amber-400'
									}`}
								>
									{discrepancy >= 0 ? '+' : ''}
									{formatCurrency(discrepancy)}
								</p>
							</div>
						</div>

						{/* Statement balance input */}
						<div className="space-y-1.5">
							<label className="text-sm font-medium">
								Statement Balance (ZAR)
							</label>
							<Input
								type="number"
								step="0.01"
								value={statementBalance}
								onChange={(e) => setStatementBalance(Number(e.target.value))}
								placeholder="Enter your bank statement balance"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-sm font-medium">Statement Date</label>
							<Input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>

						{Math.abs(discrepancy) > 0.001 && (
							<div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 text-sm">
								<p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
									Adjustment required
								</p>
								<p className="text-amber-600 dark:text-amber-500">
									A {discrepancy > 0 ? 'income' : 'expense'} transaction of{' '}
									{formatCurrency(Math.abs(discrepancy))} will be created to
									balance your account.
								</p>
							</div>
						)}

						{Math.abs(discrepancy) <= 0.001 && Number(statementBalance) !== 0 && (
							<div className="rounded-xl border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-4 text-sm">
								<p className="font-medium text-green-700 dark:text-green-400">
									Balances match — no adjustment needed.
								</p>
							</div>
						)}

						<div className="flex gap-3 pt-2">
							<Button
								className="flex-1 h-12"
								onClick={handleReconcile}
								disabled={loading}
							>
								{loading ? 'Reconciling...' : 'Reconcile Account'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setStep('select')}
							>
								Back
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ReconcileForm;
