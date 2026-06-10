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
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import {
	ACCOUNT_TYPE_LABELS,
	getAccountAvailableBalance,
	getAccountLiability,
} from '@/domains/accounts/models/AccountModel';
import Currency from '@/components/marketing/Currency';
import { Button } from '@/components/app/ui/button';
import AccountForm from '@/domains/accounts/views/AccountForm';
import TransferForm from '@/domains/accounts/views/TransferForm';
import ReconcileForm from '@/domains/accounts/views/ReconcileForm';
import {
	cardSurface,
	currencyBase,
	currencyExpense,
	pageBg,
	rowDivider,
	sectionLabel,
} from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { parseDbDate } from '@/utils/date';

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
		return <AccountForm account={account} onClose={() => setSubView('detail')} />;
	}
	if (subView === 'transfer') {
		return <TransferForm onClose={() => setSubView('detail')} />;
	}
	if (subView === 'reconcile') {
		return <ReconcileForm onClose={() => setSubView('detail')} />;
	}

	if (!account) {
		return (
			<div className={cn('flex min-h-screen items-center justify-center p-4', pageBg)}>
				<div className="text-center">
					<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">
						Account not found
					</h2>
					<p className="mb-4 text-gray-500 dark:text-gray-400">
						This account may have been deleted.
					</p>
					<Button variant="marketing" onClick={() => navigate('/dashboard')}>
						Back to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	const availableBalance = getAccountAvailableBalance(account);
	const liability = getAccountLiability(account);

	return (
		<div className={cn('flex min-h-screen flex-col', pageBg)}>
			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				<button
					onClick={() => navigate('/dashboard')}
					className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
				>
					<FiArrowLeft className="h-4 w-4" />
					Back to Dashboard
				</button>

				<div className={cn('mb-6 overflow-hidden', cardSurface)}>
					<div
						className="h-3 w-full"
						style={{ backgroundColor: account.color ?? '#6366f1' }}
					/>
					<div className="p-6">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
									{account.name}
								</h1>
								<div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
									{account.bank && <span>{account.bank}</span>}
									{account.bank && <span>·</span>}
									<span>{ACCOUNT_TYPE_LABELS[account.type]}</span>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" className="rounded-full" onClick={() => setSubView('reconcile')}>
									<FiRefreshCw className="mr-1.5 h-3.5 w-3.5" />
									Reconcile
								</Button>
								<Button variant="outline" size="sm" className="rounded-full" onClick={() => setSubView('transfer')}>
									<FiRepeat className="mr-1.5 h-3.5 w-3.5" />
									Transfer
								</Button>
								<Button variant="outline" size="sm" className="rounded-full" onClick={() => setSubView('edit')}>
									<FiEdit2 className="mr-1.5 h-3.5 w-3.5" />
									Edit
								</Button>
							</div>
						</div>

						<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<p className={cn(sectionLabel, 'mb-1')}>Current Balance</p>
								<Currency
									amount={account.balance}
									tone={account.balance < 0 ? 'balance-negative' : 'default'}
									className="text-2xl"
								/>
							</div>
							<div>
								<p className={cn(sectionLabel, 'mb-1')}>
									{account.type === 'credit' ? 'Available Credit' : 'Available Balance'}
								</p>
								<Currency
									amount={availableBalance}
									tone={availableBalance < 0 ? 'balance-negative' : 'balance-positive'}
									className="text-xl"
								/>
								{account.type === 'credit' && (
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										Limit {formatCurrency(account.creditLimit ?? 0)}
									</p>
								)}
							</div>
							{account.type === 'credit' && (
								<div>
									<p className={cn(sectionLabel, 'mb-1')}>Debt</p>
									<Currency
										amount={liability}
										tone={liability > 0 ? 'balance-negative' : 'default'}
										className="text-xl"
									/>
								</div>
							)}
							<div>
								<p className={cn(sectionLabel, 'mb-1')}>Total Income</p>
								<Currency amount={totals.income} tone="income" className="text-xl" />
							</div>
							<div>
								<p className={cn(sectionLabel, 'mb-1')}>Total Expenses</p>
								<Currency amount={totals.expense} tone="expense" className="text-xl" />
							</div>
						</div>
					</div>
				</div>

				<div>
					<h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
						Transactions
					</h2>
					{accountTransactions.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
							No transactions for this account yet
						</div>
					) : (
						<div className={cn('overflow-hidden p-4', cardSurface)}>
							{accountTransactions.map((tx, index) => {
								const date = parseDbDate(tx.date ?? tx.createdAt);
								const dateStr = date.toLocaleDateString('en-ZA', {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
								});
								return (
									<div
										key={tx.id}
										className={cn(
											'flex items-center justify-between py-2.5',
											index < accountTransactions.length - 1 && rowDivider
										)}
									>
										<div className="flex items-center gap-3">
											<div
												className={cn(
													'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
													tx.type === 'income'
														? 'bg-blue-50 dark:bg-blue-950'
														: tx.type === 'transfer'
															? 'bg-gray-100 dark:bg-gray-800'
															: 'bg-gray-100 dark:bg-gray-800'
												)}
											>
												{tx.type === 'income' ? (
													<FiArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
												) : tx.type === 'transfer' ? (
													<FiRepeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
												) : (
													<FiArrowDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
												)}
											</div>
											<div>
												<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
													{tx.title}
												</p>
												<p className="text-xs text-gray-400 dark:text-gray-500">
													{tx.category
														? `${getCategoryPathLabel(tx.category, tx.subcategory)} · `
														: ''}
													{dateStr}
												</p>
											</div>
										</div>
										{tx.type === 'income' ? (
											<Currency amount={tx.amount} tone="income" showSign className="text-sm" />
										) : tx.type === 'transfer' ? (
											<Currency amount={tx.amount} className="text-sm" />
										) : (
											<span className={cn(currencyBase, currencyExpense, 'text-sm')}>
												-{formatCurrency(tx.amount).replace(/^-/, '')}
											</span>
										)}
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
