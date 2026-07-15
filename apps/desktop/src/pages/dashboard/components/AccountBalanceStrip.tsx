import React from 'react';
import { FiArrowDownRight, FiArrowUpRight, FiPlus } from 'react-icons/fi';
import {
	ACCOUNT_TYPE_LABELS,
	calculateNetWorth,
	getAccountLiability,
} from '@cash-flow/shared/accounts/AccountModel';
import Currency from '@/components/marketing/Currency';
import { Account } from '@/types';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

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
	const totalTextSize = compact ? 'text-xl' : 'text-2xl';

	return (
		<section aria-label="Account balances" className={cn('overflow-hidden', cardSurface)}>
			<div
				className={cn(
					'flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/40 dark:border-gray-800 dark:bg-gray-800/20',
					headerPadding
				)}
			>
				<div className="min-w-0">
					<p className={sectionLabel}>Accounts</p>
					<Currency amount={totalBalance} className={cn('mt-1 tracking-tight', totalTextSize)} />
					<p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
						{accounts.length > 0
							? `${accounts.length} linked account${accounts.length === 1 ? '' : 's'}`
							: 'No accounts linked yet'}
					</p>
				</div>
				<button
					type="button"
					onClick={onOpenAccounts}
					className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-50"
				>
					View all
				</button>
			</div>

			<div className={cn('grid', contentSpacing)}>
				{displayAccounts.length === 0 ? (
					<button
						type="button"
						onClick={onOpenAccounts}
						className={cn(
							'flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800/50',
						)}
					>
						<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
							<FiPlus className="h-4 w-4" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block font-medium text-gray-900 dark:text-gray-50">
								Create your first account
							</span>
							<span className="block text-sm text-gray-500 dark:text-gray-400">
								Accounts anchor balances for transactions and transfers.
							</span>
						</span>
					</button>
				) : (
					<>
						{displayAccounts.map((account) => {
							const isNegative = getAccountLiability(account) > 0;
							const BalanceIcon = isNegative ? FiArrowDownRight : FiArrowUpRight;

							return (
								<button
									key={account.id ?? account.name}
									type="button"
									onClick={onOpenAccounts}
									className={cn(
										'group relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-left transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-800/40',
									)}
								>
									<p className={sectionLabel}>
										{account.bank
											? `${account.bank} - ${ACCOUNT_TYPE_LABELS[account.type]}`
											: ACCOUNT_TYPE_LABELS[account.type]}
									</p>
									<p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
										{account.name}
									</p>
									<Currency
										amount={account.balance}
										tone={isNegative ? 'balance-negative' : 'default'}
										className="text-2xl"
									/>
									<span className="flex items-center gap-1 text-xs text-gray-400">
										<BalanceIcon className="h-3 w-3" />
										{isNegative ? 'Owing' : 'Available'}
									</span>
									<span
										className="absolute inset-y-3 right-0 w-1 rounded-l-full"
										style={{ backgroundColor: account.color ?? '#6366f1' }}
									/>
								</button>
							);
						})}

						{hasOverflow && (
							<button
								type="button"
								onClick={onOpenAccounts}
								className={cn(
									'flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50',
								)}
							>
								<span className="min-w-0">
									<span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
										{remainingCount} more account{remainingCount === 1 ? '' : 's'}
									</span>
									<span className="block truncate text-xs text-gray-500 dark:text-gray-400">
										Open accounts to review every balance.
									</span>
								</span>
								<span className="rounded-full border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
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
