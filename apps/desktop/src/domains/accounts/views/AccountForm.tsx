import React, { useState, useEffect } from 'react';
import { getAppErrorMessage } from '@cash-flow/shared/errors';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Account } from '@/types';
import {
	ACCOUNT_COLORS,
	ACCOUNT_TYPE_LABELS,
	normalizeAccountType,
} from '@/domains/accounts/models/AccountModel';
import { FormPageCard, FormPageShell } from '@/components/app/page-layout';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';

interface AccountFormProps {
	onClose: () => void;
	account?: Account;
}

const AccountForm: React.FC<AccountFormProps> = ({ onClose, account }) => {
	const { addAccount, updateAccount } = useAccountsContext();

	const [name, setName] = useState('');
	const [bank, setBank] = useState('');
	const [type, setType] = useState<Account['type']>('debit');
	const [balance, setBalance] = useState(0);
	const [creditLimit, setCreditLimit] = useState(0);
	const [color, setColor] = useState(ACCOUNT_COLORS[0]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (account) {
			setName(account.name);
			setBank(account.bank ?? '');
			setType(normalizeAccountType(account.type));
			setBalance(account.balance);
			setCreditLimit(account.creditLimit ?? 0);
			setColor(account.color ?? ACCOUNT_COLORS[0]);
		}
	}, [account]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setError('Account name is required.');
			return;
		}
		setLoading(true);
		setError('');
		try {
			const normalizedType = normalizeAccountType(type);
			const data = {
				name: name.trim(),
				bank: bank.trim() || undefined,
				type: normalizedType,
				balance: Number(balance),
				creditLimit:
					normalizedType === 'credit' ? Math.max(Number(creditLimit), 0) : 0,
				color,
				currency: 'ZAR',
			};
			if (account?.id) {
				await updateAccount(account.id, data);
			} else {
				await addAccount(data);
			}
			onClose();
		} catch (err: unknown) {
			setError(getAppErrorMessage(err, { operation: 'Save account' }));
		} finally {
			setLoading(false);
		}
	};

	return (
		<FormPageShell className="bg-background">
			<FormPageCard className="max-w-lg rounded-2xl border bg-card shadow-xl backdrop-blur-none">
				<div className="mb-8 border-b pb-6">
					<h2 className="text-3xl font-bold tracking-tight">
						{account ? 'Edit Account' : 'New Account'}
					</h2>
					<p className="mt-1.5 text-sm text-muted-foreground">
						{account
							? 'Update your account details'
							: 'Add a new bank or cash account'}
					</p>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Account Type */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium">Account Type</label>
						<Select
							value={type}
							onValueChange={(v) => setType(normalizeAccountType(v))}
						>
							<SelectTrigger className="h-11">
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(ACCOUNT_TYPE_LABELS) as Account['type'][]).map(
									(t) => (
										<SelectItem key={t} value={t}>
											{ACCOUNT_TYPE_LABELS[t]}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Name + Bank */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Account Name</label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Main Cheque"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Bank (optional)</label>
							<Input
								value={bank}
								onChange={(e) => setBank(e.target.value)}
								placeholder="e.g. FNB"
							/>
						</div>
					</div>

					{/* Initial Balance */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">
								{account ? 'Current Balance' : 'Opening Balance'} (ZAR)
							</label>
							<Input
								type="number"
								step="0.01"
								value={balance}
								onChange={(e) => setBalance(Number(e.target.value))}
								placeholder="0.00"
							/>
						</div>
						{type === 'credit' && (
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Credit Limit (ZAR)</label>
								<Input
									type="number"
									min="0"
									step="0.01"
									value={creditLimit}
									onChange={(e) => setCreditLimit(Number(e.target.value))}
									placeholder="0.00"
								/>
							</div>
						)}
					</div>

					{/* Colour picker */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Colour</label>
						<div className="flex flex-wrap gap-2">
							{ACCOUNT_COLORS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setColor(c)}
									className={`h-8 w-8 rounded-full transition-all ${
										color === c
											? 'ring-2 ring-offset-2 ring-primary scale-110'
											: 'hover:scale-105'
									}`}
									style={{ backgroundColor: c }}
									aria-label={`Select colour ${c}`}
								/>
							))}
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-2">
						<Button type="submit" className="flex-1 h-12" disabled={loading}>
							{loading
								? 'Saving...'
								: account
									? 'Update Account'
									: 'Create Account'}
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

export default AccountForm;
