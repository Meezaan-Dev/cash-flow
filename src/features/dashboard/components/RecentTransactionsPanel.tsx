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
import { parseDbDate } from '@/utils/date';
import { formatCurrency } from '@/utils/formatCurrency';

interface RecentTransactionsPanelProps {
	transactions: Transaction[];
	accounts: Account[];
	getCategoryPathLabel: (category: string, subcategory?: string) => string;
	onSelect: (transaction: Transaction) => void;
	onOpenHistory: () => void;
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
				.slice(0, 6),
		[transactions]
	);

	return (
		<section className="flex h-full min-h-[22rem] flex-col rounded-lg border bg-card p-4 xl:min-h-0">
			<div className="mb-4 flex flex-shrink-0 items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Recent
				</p>
				<button
					type="button"
					onClick={onOpenHistory}
					className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
				<div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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
								className="group flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-3 text-left transition-colors hover:border-border hover:bg-muted/60"
							>
								<span
									className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
									style={{ boxShadow: `inset 3px 0 0 ${color}` }}
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
								<span className={`text-sm font-semibold ${amountTone}`}>
									{amountPrefix}
									{formatCurrency(transaction.amount)}
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
