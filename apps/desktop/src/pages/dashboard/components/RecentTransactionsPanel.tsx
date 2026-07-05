import React, { useMemo } from 'react';
import { FiDollarSign } from 'react-icons/fi';
import Currency from '@/components/marketing/Currency';
import { Account, Transaction } from '@/types';
import {
	cardSurface,
	currencyBase,
	currencyExpense,
	rowDivider,
	sectionLabel,
} from '@/styles/marketingStyles';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { parseDbDate, parseDbDateOrNull } from '@/utils/date';

interface RecentTransactionsPanelProps {
	transactions: Transaction[];
	accounts: Account[];
	getCategoryPathLabel: (category: string, subcategory?: string) => string;
	onSelect: (transaction: Transaction) => void;
	onOpenHistory: () => void;
	compact?: boolean;
}

const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({
	transactions,
	getCategoryPathLabel,
	onSelect,
	onOpenHistory,
	compact = false,
}) => {
	const recentTransactions = useMemo(
		() =>
			[...transactions]
				.sort((left, right) => {
					const leftDate = parseDbDate(left.date ?? left.createdAt).getTime();
					const rightDate = parseDbDate(right.date ?? right.createdAt).getTime();
					const diff = rightDate - leftDate;
					if (diff !== 0) return diff;

					const leftCreated = parseDbDateOrNull(left.createdAt)?.getTime() ?? 0;
					const rightCreated = parseDbDateOrNull(right.createdAt)?.getTime() ?? 0;
					return rightCreated - leftCreated;
				})
				.slice(0, compact ? 5 : 6),
		[compact, transactions]
	);

	return (
		<section className={cn('flex flex-col p-5', cardSurface)}>
			<div className="mb-4 flex flex-shrink-0 items-start justify-between gap-3">
				<div>
					<p className={sectionLabel}>Recent</p>
					<h2 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
						Latest transactions
					</h2>
				</div>
				<button
					type="button"
					onClick={onOpenHistory}
					className="rounded-full px-3 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-50"
				>
					View all
				</button>
			</div>

			{recentTransactions.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center text-center">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
						<FiDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
					</div>
					<p className="font-medium text-gray-900 dark:text-gray-50">No transactions yet</p>
					<p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
						Add your first transaction and this feed will start filling in.
					</p>
				</div>
			) : (
				<div className="flex-1">
					{recentTransactions.map((transaction, index) => {
						const isPositive = transaction.type === 'income';
						const isTransfer = transaction.type === 'transfer';
						const date = parseDbDate(transaction.date ?? transaction.createdAt);

						return (
							<button
								key={transaction.id ?? `${transaction.title}-${date.toISOString()}`}
								type="button"
								onClick={() => onSelect(transaction)}
								className={cn(
									'group flex w-full items-center justify-between py-2.5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30',
									index < recentTransactions.length - 1 && rowDivider
								)}
							>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
										{transaction.title}
									</p>
									<p className="text-xs text-gray-400 dark:text-gray-500">
										{date.toLocaleDateString('en-ZA', {
											day: 'numeric',
											month: 'short',
										})}
										{!isTransfer &&
											` · ${getCategoryPathLabel(transaction.category, transaction.subcategory)}`}
										{isTransfer && ' · Transfer'}
									</p>
								</div>
								{isPositive ? (
									<Currency
										amount={transaction.amount}
										tone="income"
										className="ml-3 flex-shrink-0 text-sm"
										showSign
									/>
								) : isTransfer ? (
									<Currency
										amount={transaction.amount}
										className="ml-3 flex-shrink-0 text-sm"
									/>
								) : (
									<span
										className={cn(
											currencyBase,
											currencyExpense,
											'ml-3 flex-shrink-0 text-sm'
										)}
									>
										-{formatCurrency(transaction.amount).replace(/^-/, '')}
									</span>
								)}
							</button>
						);
					})}
				</div>
			)}
		</section>
	);
};

export default RecentTransactionsPanel;
