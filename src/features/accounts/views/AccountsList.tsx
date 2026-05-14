import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { Account } from '@/types';
import {
	ACCOUNT_TYPE_LABELS,
	getAccountAvailableBalance,
	getAccountLiability,
} from '@/features/accounts/models/AccountModel';
import { formatCurrency } from '@/utils/formatCurrency';
import { Button } from '@/components/app/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
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

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="w-[90vw] md:w-full rounded-lg">
					<DialogHeader>
						<DialogTitle>Delete Account</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this account? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="flex-1 overflow-y-auto p-4 md:p-8">
				{/* Page header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
							Accounts
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Manage your bank and cash accounts
						</p>
					</div>
					<Button onClick={() => setShowForm(true)}>
						<FiPlus className="mr-2 h-4 w-4" />
						Add Account
					</Button>
				</div>

				{/* Net Worth summary */}
				<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<div className="rounded-xl border bg-card p-5">
						<p className="text-sm text-muted-foreground">Available to Spend</p>
						<p
							className={`mt-1 text-xl font-bold ${
								availableBalance >= 0
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'
							}`}
						>
							{formatCurrency(availableBalance)}
						</p>
					</div>
					<div className="rounded-xl border bg-card p-5">
						<p className="text-sm text-muted-foreground">Total Assets</p>
						<p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
							{formatCurrency(netWorth.assets)}
						</p>
					</div>
					<div className="rounded-xl border bg-card p-5">
						<p className="text-sm text-muted-foreground">Total Liabilities</p>
						<p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
							{formatCurrency(netWorth.liabilities)}
						</p>
					</div>
					<div className="rounded-xl border bg-card p-5">
						<p className="text-sm text-muted-foreground">Net Worth</p>
						<p
							className={`mt-1 text-xl font-bold ${
								netWorth.netWorth >= 0
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'
							}`}
						>
							{formatCurrency(netWorth.netWorth)}
						</p>
					</div>
				</div>

				{/* Account grid */}
				{accounts.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<FiPlus className="h-6 w-6 text-primary" />
						</div>
						<h3 className="text-lg font-semibold">No accounts yet</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Add your first account to start tracking balances
						</p>
						<Button className="mt-4" onClick={() => setShowForm(true)}>
							Add Account
						</Button>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{accounts.map((account) => {
							const availableAmount = getAccountAvailableBalance(account);
							const liability = getAccountLiability(account);
							const displayAmount =
								account.type === 'credit' ? availableAmount : account.balance;
							const isNegative =
								account.type === 'credit'
									? availableAmount < 0
									: account.balance < 0;

							return (
								<div
									key={account.id}
									role="button"
									tabIndex={0}
									onClick={() =>
										account.id && navigate(`/accounts/${account.id}`)
									}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											if (account.id) navigate(`/accounts/${account.id}`);
										}
									}}
									className="group relative cursor-pointer rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									{/* Colour strip */}
									<div
										className="h-2 w-full"
										style={{
											backgroundColor: account.color ?? '#6366f1',
										}}
									/>

									<div className="p-5">
										<div className="mb-3 flex items-start justify-between">
											<div className="flex-1 min-w-0">
												<h3 className="truncate text-base font-semibold">
													{account.name}
												</h3>
												{account.bank && (
													<p className="text-xs text-muted-foreground truncate">
														{account.bank}
													</p>
												)}
											</div>
											<span className="ml-2 flex-shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
												{ACCOUNT_TYPE_LABELS[account.type]}
											</span>
										</div>

										<p
											className={`text-2xl font-bold ${
												isNegative
													? 'text-red-600 dark:text-red-400'
													: 'text-foreground'
											}`}
										>
											{formatCurrency(displayAmount)}
										</p>

										<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
											{isNegative || liability > 0 ? (
												<FiArrowDownRight className="h-3 w-3 text-red-500" />
											) : (
												<FiArrowUpRight className="h-3 w-3 text-green-500" />
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
											<p className="mt-1 text-xs text-muted-foreground">
												Balance {formatCurrency(account.balance)} &#183; Limit{' '}
												{formatCurrency(account.creditLimit ?? 0)}
											</p>
										)}
									</div>

									{/* Action buttons - visible on hover */}
									<div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
										<button
											onClick={(e) => handleEdit(e, account)}
											className="rounded-md border bg-background p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
											aria-label="Edit account"
										>
											<FiEdit2 className="h-3.5 w-3.5" />
										</button>
										<button
											onClick={(e) =>
												account.id && handleDeleteClick(e, account.id)
											}
											className="rounded-md border bg-background p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
											aria-label="Delete account"
										>
											<FiTrash2 className="h-3.5 w-3.5" />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default AccountsList;
