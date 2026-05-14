import React from 'react';
import { FiArrowDownRight, FiArrowUpRight, FiCreditCard, FiPlus } from 'react-icons/fi';
import {
	ACCOUNT_TYPE_LABELS,
	calculateNetWorth,
	getAccountLiability,
} from '@/features/accounts/models/AccountModel';
import { Account } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';

interface AccountBalanceStripProps {
	accounts: Account[];
	onOpenAccounts: () => void;
}

const AccountBalanceStrip: React.FC<AccountBalanceStripProps> = ({
	accounts,
	onOpenAccounts,
}) => {
	const hasOverflow = accounts.length > 4;
	const displayAccounts = accounts.slice(0, hasOverflow ? 3 : 4);
	const remainingCount = Math.max(0, accounts.length - displayAccounts.length);
	const totalBalance = calculateNetWorth(accounts).netWorth;

	return (
		<section
			aria-label="Account balances"
			className="overflow-hidden rounded-lg border bg-card"
		>
			<div className="flex items-center justify-between gap-3 border-b px-3 py-2">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Accounts
					</p>
					<p className="truncate text-xs text-muted-foreground">
						{accounts.length > 0
							? `${accounts.length} linked - net ${formatCurrency(totalBalance)}`
							: 'No accounts linked yet'}
					</p>
				</div>
				<button
					type="button"
					onClick={onOpenAccounts}
					className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					View all
				</button>
			</div>

			<div
				className="grid gap-px bg-border"
				style={{
					gridTemplateColumns:
						'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
				}}
			>
				{displayAccounts.length === 0 ? (
					<button
						type="button"
						onClick={onOpenAccounts}
						className="flex min-h-16 items-center gap-3 bg-card p-3 text-left transition-colors hover:bg-muted/60"
					>
						<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
							<FiPlus className="h-4 w-4" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block font-medium">Create your first account</span>
							<span className="block text-sm text-muted-foreground">
								Accounts anchor balances for transactions and transfers.
							</span>
						</span>
					</button>
				) : (
					<>
						{displayAccounts.map((account) => {
							const isNegative = getAccountLiability(account) > 0;
							const BalanceIcon = isNegative ? FiArrowDownRight : FiArrowUpRight;
							const balanceTone = isNegative
								? 'text-red-600 dark:text-red-400'
								: 'text-foreground';

							return (
								<button
									key={account.id ?? account.name}
									type="button"
									onClick={onOpenAccounts}
									className="group relative flex min-h-16 min-w-0 items-center justify-between gap-3 bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
								>
									<span
										className="absolute inset-y-2 left-0 w-1 rounded-r-full"
										style={{ backgroundColor: account.color ?? '#6366f1' }}
									/>
									<span className="ml-2 flex min-w-0 flex-1 items-center gap-2">
										<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
											<FiCreditCard className="h-4 w-4" />
										</span>
										<span className="min-w-0">
											<span className="block truncate text-sm font-medium">
												{account.name}
											</span>
											<span className="block truncate text-xs text-muted-foreground">
												{account.bank
													? `${account.bank} - ${ACCOUNT_TYPE_LABELS[account.type]}`
													: ACCOUNT_TYPE_LABELS[account.type]}
											</span>
										</span>
									</span>
									<span className="flex min-w-0 flex-shrink-0 flex-col items-end">
										<span
											className={`max-w-[8rem] truncate text-right text-sm font-semibold tabular-nums sm:max-w-[9rem] ${balanceTone}`}
										>
											{formatCurrency(account.balance)}
										</span>
										<span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
											<BalanceIcon className="h-3 w-3" />
											{isNegative ? 'Owing' : 'Available'}
										</span>
									</span>
								</button>
							);
						})}

						{hasOverflow && (
							<button
								type="button"
								onClick={onOpenAccounts}
								className="flex min-h-16 min-w-0 items-center justify-between gap-3 bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
							>
								<span className="min-w-0">
									<span className="block text-sm font-medium">
										{remainingCount} more account{remainingCount === 1 ? '' : 's'}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										Open accounts to review every balance.
									</span>
								</span>
								<span className="rounded-full border px-2 py-1 text-xs font-medium text-muted-foreground">
									View
								</span>
							</button>
						)}
					</>
				)}
			</div>
		</section>
	);
};

export default AccountBalanceStrip;
