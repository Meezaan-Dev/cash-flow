import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	FiArrowLeft,
	FiArrowUp,
	FiArrowDown,
	FiEdit2,
	FiRefreshCw,
	FiRepeat,
} from 'react-icons/fi';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/features/categories/context/CategoriesContext';
import { ACCOUNT_TYPE_LABELS } from '@/features/accounts/models/AccountModel';
import { formatCurrency } from '@/utils/formatCurrency';
import { parseDbDate } from '@/utils/date';
import { Button } from '@/components/app/ui/button';
import AccountForm from '@/features/accounts/views/AccountForm';
import TransferForm from '@/features/accounts/views/TransferForm';
import ReconcileForm from '@/features/accounts/views/ReconcileForm';

type SubView = 'detail' | 'edit' | 'transfer' | 'reconcile';

const AccountDetailPage: React.FC = () => {
	const { accountId } = useParams<{ accountId: string }>();
	const navigate = useNavigate();
	const { accounts } = useAccountsContext();
	const { transactions } = useTransactionsContext();
	const { getCategoryPathLabel } = useCategoriesContext();

	const [subView, setSubView] = useState<SubView>('detail');

	const account = useMemo(
		() => accounts.find((a) => a.id === accountId),
		[accounts, accountId]
	);

	const accountTransactions = useMemo(
		() =>
			[...transactions]
				.filter((t) => t.accountId === accountId)
				.sort((a, b) => {
					const da = parseDbDate(a.date ?? a.createdAt);
					const db = parseDbDate(b.date ?? b.createdAt);
					return db.getTime() - da.getTime();
				}),
		[transactions, accountId]
	);

	const totals = useMemo(() => {
		const income = accountTransactions
			.filter((t) => t.type === 'income')
			.reduce((s, t) => s + t.amount, 0);
		const expense = accountTransactions
			.filter((t) => t.type === 'expense')
			.reduce((s, t) => s + t.amount, 0);
		return { income, expense };
	}, [accountTransactions]);

	if (subView === 'edit' && account) {
		return (
			<AccountForm account={account} onClose={() => setSubView('detail')} />
		);
	}
	if (subView === 'transfer') {
		return <TransferForm onClose={() => setSubView('detail')} />;
	}
	if (subView === 'reconcile') {
		return <ReconcileForm onClose={() => setSubView('detail')} />;
	}

	if (!account) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Account not found</h2>
					<p className="text-muted-foreground mb-4">
						This account may have been deleted.
					</p>
					<Button onClick={() => navigate('/dashboard')}>
						Back to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				{/* Back button */}
				<button
					onClick={() => navigate('/dashboard')}
					className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<FiArrowLeft className="h-4 w-4" />
					Back to Dashboard
				</button>

				{/* Account header */}
				<div className="mb-6 rounded-2xl border bg-card overflow-hidden">
					<div
						className="h-3 w-full"
						style={{ backgroundColor: account.color ?? '#6366f1' }}
					/>
					<div className="p-6">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h1 className="text-2xl font-bold tracking-tight">
									{account.name}
								</h1>
								<div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
									{account.bank && <span>{account.bank}</span>}
									{account.bank && <span>&#183;</span>}
									<span>{ACCOUNT_TYPE_LABELS[account.type]}</span>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSubView('reconcile')}
								>
									<FiRefreshCw className="mr-1.5 h-3.5 w-3.5" />
									Reconcile
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSubView('transfer')}
								>
									<FiRepeat className="mr-1.5 h-3.5 w-3.5" />
									Transfer
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSubView('edit')}
								>
									<FiEdit2 className="mr-1.5 h-3.5 w-3.5" />
									Edit
								</Button>
							</div>
						</div>

						<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Current Balance
								</p>
								<p
									className={`text-2xl font-bold ${
										account.balance < 0
											? 'text-red-600 dark:text-red-400'
											: 'text-foreground'
									}`}
								>
									{formatCurrency(account.balance)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Total Income
								</p>
								<p className="text-xl font-semibold text-green-600 dark:text-green-400">
									{formatCurrency(totals.income)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Total Expenses
								</p>
								<p className="text-xl font-semibold text-red-600 dark:text-red-400">
									{formatCurrency(totals.expense)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Transactions */}
				<div>
					<h2 className="mb-4 text-lg font-semibold">Transactions</h2>
					{accountTransactions.length === 0 ? (
						<div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
							No transactions for this account yet
						</div>
					) : (
						<div className="space-y-2">
							{accountTransactions.map((tx) => {
								const date = parseDbDate(tx.date ?? tx.createdAt);
								const dateStr = date.toLocaleDateString('en-ZA', {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
								});
								return (
									<div
										key={tx.id}
										className="flex items-center justify-between rounded-xl border bg-card p-4"
									>
										<div className="flex items-center gap-3">
											<div
												className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
													tx.type === 'income'
														? 'bg-green-100 dark:bg-green-900/30'
														: tx.type === 'transfer'
															? 'bg-blue-100 dark:bg-blue-900/30'
															: 'bg-red-100 dark:bg-red-900/30'
												}`}
											>
												{tx.type === 'income' ? (
													<FiArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
												) : tx.type === 'transfer' ? (
													<FiRepeat className="h-4 w-4 text-blue-500" />
												) : (
													<FiArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
												)}
											</div>
											<div>
												<p className="font-medium text-sm">{tx.title}</p>
												<p className="text-xs text-muted-foreground">
													{tx.category
														? `${getCategoryPathLabel(tx.category, tx.subcategory)} &#183; `
														: ''}
													{dateStr}
												</p>
											</div>
										</div>
										<p
											className={`font-semibold ${
												tx.type === 'income'
													? 'text-green-600 dark:text-green-400'
													: tx.type === 'transfer'
														? 'text-blue-500'
														: 'text-red-600 dark:text-red-400'
											}`}
										>
											{tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}
											{formatCurrency(tx.amount)}
										</p>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AccountDetailPage;
