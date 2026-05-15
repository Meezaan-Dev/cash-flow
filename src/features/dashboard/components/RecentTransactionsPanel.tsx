import React, { useMemo } from 'react';
import {
	FiArrowDown,
	FiArrowUp,
	FiCreditCard,
	FiDollarSign,
	FiHome,
	FiShoppingCart,
} from 'react-icons/fi';
import { Account, Transaction } from '@/types';
import { cn } from '@/lib/utils';
import { parseDbDate } from '@/utils/date';
import { formatCurrency } from '@/utils/formatCurrency';

interface RecentTransactionsPanelProps {
	transactions: Transaction[];
	accounts: Account[];
	getCategoryPathLabel: (category: string, subcategory?: string) => string;
	onSelect: (transaction: Transaction) => void;
	onOpenHistory: () => void;
	compact?: boolean;
}

const getTransactionIcon = (transaction: Transaction) => {
	if (transaction.type === 'income') return FiArrowUp;
	if (transaction.type === 'transfer') return FiCreditCard;
	if (transaction.category === 'food') return FiShoppingCart;
	if (transaction.category === 'personal') return FiHome;
	return FiArrowDown;
};

const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({
	transactions,
	accounts,
	getCategoryPathLabel,
	onSelect,
	onOpenHistory,
	compact = false,
}) => {
	const accountColorMap = useMemo(() => {
		const map = new Map<string, string>();
		accounts.forEach((account) => {
			if (account.id) map.set(account.id, account.color ?? '#6366f1');
		});
		return map;
	}, [accounts]);

	const recentTransactions = useMemo(
		() =>
			[...transactions]
				.sort((left, right) => {
					const leftDate = parseDbDate(left.date ?? left.createdAt);
					const rightDate = parseDbDate(right.date ?? right.createdAt);
					return rightDate.getTime() - leftDate.getTime();
				})
				.slice(0, compact ? 5 : 6),
		[compact, transactions]
	);
	const rowPadding = compact ? 'py-2' : 'py-3';
	const iconSize = compact ? 'h-9 w-9' : 'h-10 w-10';

	return (
		<section className="flex h-full min-h-0 flex-col rounded-lg border bg-card p-3 shadow-sm">
			<div className="mb-2 flex flex-shrink-0 items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Recent
					</p>
					<h2 className="mt-1 text-lg font-semibold tracking-tight">
						Latest transactions
					</h2>
				</div>
				<button
					type="button"
					onClick={onOpenHistory}
					className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					View all
				</button>
			</div>

			{recentTransactions.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center text-center">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
						<FiDollarSign className="h-5 w-5 text-primary" />
					</div>
					<p className="font-medium">No transactions yet</p>
					<p className="mt-1 max-w-xs text-sm text-muted-foreground">
						Add your first transaction and this feed will start filling in.
					</p>
				</div>
			) : (
				<div className="min-h-0 flex-1 divide-y overflow-y-auto">
					{recentTransactions.map((transaction) => {
						const Icon = getTransactionIcon(transaction);
						const isPositive = transaction.type === 'income';
						const isTransfer = transaction.type === 'transfer';
						const amountPrefix = isPositive ? '+' : isTransfer ? '' : '-';
						const amountTone = isPositive
							? 'text-green-600 dark:text-green-400'
							: isTransfer
								? 'text-muted-foreground'
								: 'text-red-600 dark:text-red-400';
						const date = parseDbDate(transaction.date ?? transaction.createdAt);
						const color = accountColorMap.get(transaction.accountId) ?? '#6366f1';

						return (
							<button
								key={transaction.id ?? `${transaction.title}-${date.toISOString()}`}
								type="button"
								onClick={() => onSelect(transaction)}
								className={cn(
									'group flex w-full items-center gap-3 px-1 text-left transition-colors hover:bg-muted/50 sm:px-2',
									rowPadding
								)}
							>
								<span
									className={cn(
										'flex flex-shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground',
										iconSize
									)}
									style={{ borderLeftColor: color, borderLeftWidth: 4 }}
								>
									<Icon className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium">
										{transaction.title}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{isTransfer
											? 'Transfer'
											: getCategoryPathLabel(
													transaction.category,
													transaction.subcategory
												)}{' '}
										-{' '}
										{date.toLocaleDateString('en-ZA', {
											day: 'numeric',
											month: 'short',
										})}
									</span>
								</span>
								<span className="min-w-[6rem] text-right">
									<span
										className={cn('block text-sm font-semibold tabular-nums', amountTone)}
									>
										{amountPrefix}
										{formatCurrency(transaction.amount)}
									</span>
									<span className="text-xs text-muted-foreground">
										{transaction.type}
									</span>
								</span>
							</button>
						);
					})}
				</div>
			)}
		</section>
	);
};

export default RecentTransactionsPanel;
