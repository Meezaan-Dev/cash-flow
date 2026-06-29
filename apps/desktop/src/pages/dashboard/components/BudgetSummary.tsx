import React, { useMemo } from 'react';
import { FiAlertTriangle, FiArrowRight, FiTarget } from 'react-icons/fi';
import { useBudgetsContext } from '@/domains/budgets/context/BudgetsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import {
	budgetOverlapsMonth,
	calculateBudgetProgress,
	getCurrentBudgetMonth,
	sortBudgetsByDisplayOrder,
} from '@/domains/budgets/models/BudgetModel';
import {
	getBudgetPeriodLabel,
	getBudgetTitle,
} from '@/domains/budgets/views/budgetDisplay';
import { Button } from '@/components/app/ui/button';
import {
	DataListHeader,
	DataListRow,
	DataListSurface,
	SummaryCard,
	SummaryCardGrid,
} from '@/components/app/page-layout';
import {
	getBudgetTransactionFilters,
	TransactionFilterDescriptor,
} from '@/shared/filters/utils/transactionFilters';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { useCurrentDate } from '@/hooks/useCurrentDate';

interface BudgetSummaryProps {
	onOpenBudgets: () => void;
	onOpenTransactions: (filters: TransactionFilterDescriptor) => void;
}

const statusStyles = {
	safe: {
		text: 'text-blue-600 dark:text-blue-400',
		label: 'On track',
	},
	warning: {
		text: 'text-amber-600 dark:text-amber-400',
		label: 'Watch spending',
	},
	over: {
		text: 'text-red-600 dark:text-red-400',
		label: 'Over budget',
	},
};

const BudgetSummary: React.FC<BudgetSummaryProps> = ({
	onOpenBudgets,
	onOpenTransactions,
}) => {
	const { budgets } = useBudgetsContext();
	const { transactions } = useTransactionsContext();
	const { getCategoryLabel, getSubcategoryLabel } = useCategoriesContext();
	const referenceDate = useCurrentDate();
	const progress = useMemo(() => {
		const month = getCurrentBudgetMonth(referenceDate);
		return sortBudgetsByDisplayOrder(budgets)
			.filter(
				(budget) =>
					budget.lifecycleStatus === 'published' &&
					budgetOverlapsMonth(budget, month)
			)
			.map((budget) =>
				calculateBudgetProgress(budget, transactions, referenceDate)
			);
	}, [budgets, referenceDate, transactions]);

	if (progress.length === 0) return null;

	const totalBudgeted = progress.reduce(
		(sum, item) => sum + item.budget.amount,
		0
	);
	const totalSpent = progress.reduce((sum, item) => sum + item.spent, 0);
	const totalRemaining = totalBudgeted - totalSpent;
	const attentionCount = progress.filter((item) => item.status !== 'safe').length;

	return (
		<section className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="flex items-center gap-2 text-lg font-semibold text-gray-950 dark:text-white">
						<FiTarget className="h-4 w-4 text-blue-600 dark:text-blue-400" />
						Budget health
					</h2>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						How current spending compares with active plans.
					</p>
				</div>
				<Button type="button" variant="outline" onClick={onOpenBudgets}>
					View all budgets
					<FiArrowRight className="h-4 w-4" />
				</Button>
			</div>

			<SummaryCardGrid>
				<SummaryCard label="Budgeted" amount={totalBudgeted} note="Published limits" />
				<SummaryCard label="Spent" amount={totalSpent} note="Matched expenses" />
				<SummaryCard
					label={totalRemaining >= 0 ? 'Remaining' : 'Over budget'}
					amount={Math.abs(totalRemaining)}
					tone={totalRemaining >= 0 ? 'balance-positive' : 'balance-negative'}
					note={totalRemaining >= 0 ? 'Available to spend' : 'Beyond limits'}
				/>
				<SummaryCard
					label="Needs attention"
					value={attentionCount}
					note={
						attentionCount === 1
							? '1 budget to review'
							: `${attentionCount} budgets to review`
					}
					icon={
						attentionCount > 0 ? (
							<FiAlertTriangle className="h-4 w-4 text-amber-500" />
						) : undefined
					}
				/>
			</SummaryCardGrid>

			<DataListSurface>
				<DataListHeader>
					<span>Budget name</span>
					<span>Spent and limit</span>
					<span>Budget data</span>
				</DataListHeader>
				{progress.slice(0, 5).map((item) => {
					const styles = statusStyles[item.status];
					const title = getBudgetTitle(
						item.budget,
						getCategoryLabel,
						getSubcategoryLabel
					);
					return (
						<DataListRow
							key={item.budget.id}
							role="button"
							tabIndex={0}
							onClick={() =>
								onOpenTransactions(
									getBudgetTransactionFilters(item.budget, referenceDate)
								)
							}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									event.currentTarget.click();
								}
							}}
							className="cursor-pointer"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
									{title}
								</p>
								<p className="truncate text-xs text-gray-500 dark:text-gray-400">
									{getBudgetPeriodLabel(item.budget, referenceDate)}
								</p>
							</div>
							<div>
								<p className="text-sm font-semibold text-gray-950 dark:text-white">
									{formatCurrency(item.spent)} of{' '}
									{formatCurrency(item.budget.amount)}
								</p>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									{Math.round(item.usedPercentage)}% used
								</p>
							</div>
							<div>
								<p className={cn('text-sm font-medium', styles.text)}>
									{styles.label}
								</p>
								<p className={cn('mt-1 text-xs font-medium', styles.text)}>
									{item.remaining >= 0
										? `${formatCurrency(item.remaining)} remaining`
										: `${formatCurrency(Math.abs(item.remaining))} over budget`}
								</p>
							</div>
						</DataListRow>
					);
				})}
			</DataListSurface>
		</section>
	);
};

export default BudgetSummary;
