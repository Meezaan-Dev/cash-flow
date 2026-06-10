import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Account } from '@/types';
import {
	ACCOUNT_TYPE_LABELS,
	getAccountAvailableBalance,
	getAccountLiability,
} from '@/domains/accounts/models/AccountModel';
import Currency from '@/components/marketing/Currency';
import MotionReveal from '@/components/marketing/MotionReveal';
import SectionHeader from '@/components/marketing/SectionHeader';
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
	cardSurface,
	cardSurfaceMuted,
	modalShell,
	pageBg,
	sectionLabel,
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
		<div className={cn('flex min-h-screen flex-col', pageBg)}>
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

			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				<SectionHeader
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

				<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{statCards.map((stat, index) => (
						<MotionReveal key={stat.label} delay={index * 0.06}>
							<div className={cn('p-5', cardSurfaceMuted)}>
								<p className={sectionLabel}>{stat.label}</p>
								<Currency
									amount={stat.amount}
									tone={stat.tone as 'balance-positive' | 'balance-negative'}
									className="mt-1 text-xl"
								/>
							</div>
						</MotionReveal>
					))}
				</div>

				{accounts.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
							<FiPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
							No accounts yet
						</h3>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Add your first account to start tracking balances
						</p>
						<Button variant="marketing" className="mt-4" onClick={() => setShowForm(true)}>
							Add Account
						</Button>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{accounts.map((account, index) => {
							const availableAmount = getAccountAvailableBalance(account);
							const liability = getAccountLiability(account);
							const displayAmount =
								account.type === 'credit' ? availableAmount : account.balance;
							const isNegative =
								account.type === 'credit'
									? availableAmount < 0
									: account.balance < 0;

							return (
								<MotionReveal key={account.id} delay={index * 0.06}>
									<div
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
											'group relative cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
											cardSurface
										)}
									>
										<div
											className="h-2 w-full"
											style={{ backgroundColor: account.color ?? '#6366f1' }}
										/>

										<div className="p-5">
											<div className="mb-3 flex items-start justify-between">
												<div className="min-w-0 flex-1">
													<h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
														{account.name}
													</h3>
													{account.bank && (
														<p className="truncate text-xs text-gray-500 dark:text-gray-400">
															{account.bank}
														</p>
													)}
												</div>
												<span className="ml-2 flex-shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
													{ACCOUNT_TYPE_LABELS[account.type]}
												</span>
											</div>

											<Currency
												amount={displayAmount}
												tone={isNegative ? 'balance-negative' : 'default'}
												className="text-2xl"
											/>

											<div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
												{isNegative || liability > 0 ? (
													<FiArrowDownRight className="h-3 w-3 text-red-500" />
												) : (
													<FiArrowUpRight className="h-3 w-3 text-emerald-500" />
												)}
												<span>
													{account.type === 'credit'
														? liability > 0
															? `Debt ${formatCurrency(liability)}`
															: 'Available credit'
														: 'Available balance'}
												</span>
											</div>
											{account.type === 'credit' && (
												<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
													Balance {formatCurrency(account.balance)} · Limit{' '}
													{formatCurrency(account.creditLimit ?? 0)}
												</p>
											)}
										</div>

										<div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
									</div>
								</MotionReveal>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default AccountsList;
