import React from 'react';
import { FiArrowDownRight, FiArrowUpRight, FiCreditCard, FiPlus } from 'react-icons/fi';
import {
	ACCOUNT_TYPE_LABELS,
	calculateNetWorth,
	getAccountLiability,
} from '@/features/accounts/models/AccountModel';
import { Account } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';

interface AccountBalanceStripProps {
	accounts: Account[];
	onOpenAccounts: () => void;
	compact?: boolean;
}

const AccountBalanceStrip: React.FC<AccountBalanceStripProps> = ({
	accounts,
	onOpenAccounts,
	compact = false,
}) => {
	const displayLimit = compact ? 3 : accounts.length > 4 ? 3 : 4;
	const hasOverflow = accounts.length > displayLimit;
	const displayAccounts = accounts.slice(0, displayLimit);
	const remainingCount = Math.max(0, accounts.length - displayAccounts.length);
	const totalBalance = calculateNetWorth(accounts).netWorth;
	const headerPadding = compact ? 'p-3' : 'p-4';
	const contentSpacing = compact ? 'gap-2 p-2' : 'gap-3 p-3';
	const rowDensity = compact ? 'min-h-16 p-2.5' : 'min-h-24 p-3';
	const totalTextSize = compact ? 'text-xl' : 'text-2xl';

	return (
		<section
			aria-label="Account balances"
			className="overflow-hidden rounded-lg border bg-card shadow-sm"
		>
			<div
				className={cn(
					'flex items-start justify-between gap-3 border-b bg-muted/20',
					headerPadding
				)}
			>
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Accounts
					</p>
					<p className={cn('mt-1 font-semibold tracking-tight', totalTextSize)}>
						{formatCurrency(totalBalance)}
					</p>
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{accounts.length > 0
							? `${accounts.length} linked account${accounts.length === 1 ? '' : 's'}`
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
				className={cn('grid', contentSpacing)}
				style={{
					gridTemplateColumns:
						'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
				}}
			>
				{displayAccounts.length === 0 ? (
					<button
						type="button"
						onClick={onOpenAccounts}
						className={cn(
							'flex items-center gap-3 rounded-md border bg-background text-left transition-colors hover:bg-muted/60',
							rowDensity
						)}
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
									className={cn(
										'group relative flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md border bg-background text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
										rowDensity
									)}
								>
									<span
										className="absolute inset-y-3 left-0 w-1 rounded-r-full"
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
								className={cn(
									'flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
									rowDensity
								)}
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
