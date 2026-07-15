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
} from '@cash-flow/shared/accounts/AccountModel';
import Currency from '@/components/marketing/Currency';
import { Button } from '@/components/app/ui/button';
import AccountForm from '@/domains/accounts/views/AccountForm';
import TransferForm from '@/domains/accounts/views/TransferForm';
import ReconcileForm from '@/domains/accounts/views/ReconcileForm';
import {
	DataListHeader,
	DataListRow,
	DataListSurface,
	EmptyState,
	PageHeader,
	PageShell,
	SummaryCard,
	SummaryCardGrid,
} from '@/components/app/page-layout';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { parseDbDate, parseDbDateOrNull } from '@cash-flow/shared/utils/date';

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
					const da = parseDbDate(a.date ?? a.createdAt).getTime();
					const db = parseDbDate(b.date ?? b.createdAt).getTime();
					const diff = db - da;
					if (diff !== 0) return diff;

					const createdA = parseDbDateOrNull(a.createdAt)?.getTime() ?? 0;
					const createdB = parseDbDateOrNull(b.createdAt)?.getTime() ?? 0;
					return createdB - createdA;
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
			<PageShell>
				<EmptyState
					title="Account not found"
					description="This account may have been deleted."
					action={
						<Button variant="marketing" onClick={() => navigate('/dashboard/accounts')}>
							Back to accounts
						</Button>
					}
				/>
			</PageShell>
		);
	}

	const availableBalance = getAccountAvailableBalance(account);
	const liability = getAccountLiability(account);

	return (
		<PageShell>
			<PageHeader
				title={account.name}
				subtitle={
					<span className="inline-flex items-center gap-2">
						{account.bank && <span>{account.bank}</span>}
						{account.bank && <span>·</span>}
						<span>{ACCOUNT_TYPE_LABELS[account.type]}</span>
					</span>
				}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => navigate('/dashboard/accounts')}>
							<FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
							Accounts
						</Button>
						<Button variant="outline" size="sm" onClick={() => setSubView('reconcile')}>
							<FiRefreshCw className="mr-1.5 h-3.5 w-3.5" />
							Reconcile
						</Button>
						<Button variant="outline" size="sm" onClick={() => setSubView('transfer')}>
							<FiRepeat className="mr-1.5 h-3.5 w-3.5" />
							Transfer
						</Button>
						<Button variant="outline" size="sm" onClick={() => setSubView('edit')}>
							<FiEdit2 className="mr-1.5 h-3.5 w-3.5" />
							Edit
						</Button>
					</div>
				}
			/>

			<SummaryCardGrid className="mb-8">
				<SummaryCard
					label="Current Balance"
					amount={account.balance}
					tone={account.balance < 0 ? 'balance-negative' : 'default'}
				/>
				<SummaryCard
					label={account.type === 'credit' ? 'Available Credit' : 'Available Balance'}
					amount={availableBalance}
					tone={availableBalance < 0 ? 'balance-negative' : 'balance-positive'}
					note={account.type === 'credit' ? `Limit ${formatCurrency(account.creditLimit ?? 0)}` : undefined}
				/>
				{account.type === 'credit' ? (
					<SummaryCard
						label="Debt"
						amount={liability}
						tone={liability > 0 ? 'balance-negative' : 'default'}
					/>
				) : (
					<SummaryCard label="Transactions" value={accountTransactions.length} />
				)}
				<SummaryCard label="Total Income" amount={totals.income} tone="income" />
				<SummaryCard label="Total Expenses" amount={totals.expense} tone="expense" />
			</SummaryCardGrid>

			<div className="mb-4 flex items-center justify-between gap-3">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
					Transactions
				</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					{accountTransactions.length} {accountTransactions.length === 1 ? 'entry' : 'entries'}
				</p>
			</div>

			{accountTransactions.length === 0 ? (
				<EmptyState
					title="No transactions for this account"
					description="Transactions linked to this account will appear here."
				/>
			) : (
				<DataListSurface>
					<DataListHeader className="md:grid-cols-[minmax(240px,1fr)_minmax(180px,0.7fr)_minmax(220px,1fr)_minmax(140px,0.6fr)]">
						<span>Transaction</span>
						<span>Date</span>
						<span>Category</span>
						<span className="text-right">Amount</span>
					</DataListHeader>
					{accountTransactions.map((tx) => {
						const date = parseDbDate(tx.date ?? tx.createdAt);
						const dateStr = date.toLocaleDateString('en-ZA', {
							day: 'numeric',
							month: 'short',
							year: 'numeric',
						});

						return (
							<DataListRow
								key={tx.id}
								className="md:grid-cols-[minmax(240px,1fr)_minmax(180px,0.7fr)_minmax(220px,1fr)_minmax(140px,0.6fr)]"
							>
								<div className="flex min-w-0 items-center gap-3">
									<div
										className={cn(
											'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
											tx.type === 'income'
												? 'bg-blue-50 dark:bg-blue-950'
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
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
											{tx.title}
										</p>
										<p className="text-xs capitalize text-gray-500 dark:text-gray-400">
											{tx.type}
										</p>
									</div>
								</div>

								<p className="text-sm text-gray-700 dark:text-gray-300">{dateStr}</p>

								<p className="truncate text-sm text-gray-700 dark:text-gray-300">
									{tx.category
										? getCategoryPathLabel(tx.category, tx.subcategory)
										: 'Uncategorized'}
								</p>

								<div className="text-left md:text-right">
									{tx.type === 'income' ? (
										<Currency amount={tx.amount} tone="income" showSign className="text-sm" />
									) : tx.type === 'transfer' ? (
										<Currency amount={tx.amount} className="text-sm" />
									) : (
										<Currency amount={-tx.amount} tone="expense" className="text-sm" />
									)}
								</div>
							</DataListRow>
						);
					})}
				</DataListSurface>
			)}
		</PageShell>
	);
};

export default AccountDetailPage;
