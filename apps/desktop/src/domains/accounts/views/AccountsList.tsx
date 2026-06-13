import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Account } from '@/types';
import {
	ACCOUNT_TYPE_LABELS,
	getAccountLiability,
} from '@/domains/accounts/models/AccountModel';
import Currency from '@/components/marketing/Currency';
import MotionReveal from '@/components/marketing/MotionReveal';
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
import { Button } from '@/components/app/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import {
	modalShell,
} from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import AccountForm from './AccountForm';

const AccountsList: React.FC = () => {
	const navigate = useNavigate();
	const { accounts, deleteAccount, calculateAvailableBalance, calculateNetWorth } =
		useAccountsContext();

	const [showForm, setShowForm] = useState(false);
	const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

	const netWorth = calculateNetWorth();
	const availableBalance = calculateAvailableBalance();

	const handleEdit = (e: React.MouseEvent, account: Account) => {
		e.stopPropagation();
		setEditingAccount(account);
		setShowForm(true);
	};

	const handleDeleteClick = (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		setAccountToDelete(id);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (accountToDelete) await deleteAccount(accountToDelete);
		setDeleteDialogOpen(false);
		setAccountToDelete(null);
	};

	const handleCloseForm = () => {
		setShowForm(false);
		setEditingAccount(undefined);
	};

	if (showForm) {
		return <AccountForm onClose={handleCloseForm} account={editingAccount} />;
	}

	const statCards = [
		{
			label: 'Available to Spend',
			amount: availableBalance,
			tone: availableBalance >= 0 ? 'balance-positive' : 'balance-negative',
		},
		{
			label: 'Total Assets',
			amount: netWorth.assets,
			tone: 'balance-positive' as const,
		},
		{
			label: 'Total Liabilities',
			amount: netWorth.liabilities,
			tone: 'balance-negative' as const,
		},
		{
			label: 'Net Worth',
			amount: netWorth.netWorth,
			tone: netWorth.netWorth >= 0 ? 'balance-positive' : 'balance-negative',
		},
	];

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className={cn('w-[90vw] md:w-full', modalShell)}>
					<DialogHeader>
						<DialogTitle>Delete Account</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this account? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PageShell>
				<PageHeader
					title="Accounts"
					subtitle="Manage your bank and cash accounts"
					actions={
						<Button variant="marketing" onClick={() => setShowForm(true)}>
							<FiPlus className="mr-2 h-4 w-4" />
							Add Account
						</Button>
					}
					className="mb-6"
				/>

				<SummaryCardGrid className="mb-8">
					{statCards.map((stat, index) => (
						<MotionReveal key={stat.label} delay={index * 0.06}>
							<SummaryCard
								label={stat.label}
								amount={stat.amount}
								tone={stat.tone as 'balance-positive' | 'balance-negative'}
							/>
						</MotionReveal>
					))}
				</SummaryCardGrid>

				{accounts.length === 0 ? (
					<EmptyState
						title="No accounts yet"
						description="Add your first account to start tracking balances."
						icon={<FiPlus className="h-6 w-6" />}
						action={
							<Button variant="marketing" onClick={() => setShowForm(true)}>
								Add Account
							</Button>
						}
					/>
				) : (
					<DataListSurface>
						<DataListHeader>
							<span>Account name</span>
							<span>Balance</span>
							<span>Account data</span>
						</DataListHeader>
						{accounts.map((account, index) => {
							const liability = getAccountLiability(account);
							const displayAmount = account.balance;
							const isNegative = account.balance < 0;
							const creditLimit = account.creditLimit ?? 0;

							return (
								<MotionReveal key={account.id} delay={index * 0.06}>
									<DataListRow
										role="button"
										tabIndex={0}
										onClick={() =>
											account.id && navigate(`/dashboard/accounts/${account.id}`)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												if (account.id) navigate(`/dashboard/accounts/${account.id}`);
											}
										}}
										className={cn(
											'group relative grid cursor-pointer gap-4 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-gray-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:border-gray-800 dark:hover:bg-gray-800/30 md:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.2fr)_minmax(260px,1fr)] md:items-center'
										)}
									>
										<div className="flex min-w-0 items-center gap-3 pr-16 md:pr-0">
											<span
												className="h-10 w-1.5 shrink-0 rounded-full"
												style={{ backgroundColor: account.color ?? '#6366f1' }}
											/>
											<div className="min-w-0">
												<h3 className="truncate text-sm font-semibold text-gray-950 dark:text-white">
													{account.name}
												</h3>
												<p className="truncate text-xs text-gray-500 dark:text-gray-400">
													{account.bank || ACCOUNT_TYPE_LABELS[account.type]}
												</p>
											</div>
										</div>

										<div>
											<Currency
												amount={displayAmount}
												tone={isNegative ? 'balance-negative' : 'default'}
												className="text-lg"
											/>
										</div>

										<div className="min-w-0">
											<div className="flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
												{isNegative || liability > 0 ? (
													<FiArrowDownRight className="h-3.5 w-3.5 text-red-500" />
												) : (
													<FiArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
												)}
												<span>
													{account.type === 'credit'
														? liability > 0
															? `${formatCurrency(liability)} debt`
															: 'No credit used'
														: 'Available balance'}
												</span>
											</div>
											<p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
												{account.type === 'credit'
													? `Balance ${formatCurrency(account.balance)} · Limit ${formatCurrency(creditLimit)}`
													: ACCOUNT_TYPE_LABELS[account.type]}
											</p>
										</div>

										<div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
											<button
												onClick={(e) => handleEdit(e, account)}
												className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition-colors hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-50"
												aria-label="Edit account"
											>
												<FiEdit2 className="h-3.5 w-3.5" />
											</button>
											<button
												onClick={(e) =>
													account.id && handleDeleteClick(e, account.id)
												}
												className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition-colors hover:text-red-600 dark:border-gray-700 dark:bg-gray-900"
												aria-label="Delete account"
											>
												<FiTrash2 className="h-3.5 w-3.5" />
											</button>
										</div>
									</DataListRow>
								</MotionReveal>
							);
						})}
					</DataListSurface>
				)}
			</PageShell>
		</div>
	);
};

export default AccountsList;
