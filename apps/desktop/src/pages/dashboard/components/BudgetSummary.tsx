import React, { useMemo } from 'react';
import { FiAlertTriangle, FiTarget } from 'react-icons/fi';
import { useBudgetsContext } from '@/domains/budgets/context/BudgetsContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import {
	calculateBudgetSummary,
	getCurrentBudgetMonth,
} from '@/domains/budgets/models/BudgetModel';
import { formatCurrency } from '@/utils/formatCurrency';
import MarketingCard from '@/components/marketing/MarketingCard';

const BudgetSummary: React.FC = () => {
	const { budgets } = useBudgetsContext();
	const { transactions } = useTransactionsContext();
	const month = getCurrentBudgetMonth();
	const summary = useMemo(
		() => calculateBudgetSummary(budgets, transactions, month),
		[budgets, month, transactions]
	);

	if (summary.totalBudget === 0) return null;

	return (
		<MarketingCard
			header={
				<div>
					<h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
						<FiTarget className="h-4 w-4 text-blue-600 dark:text-blue-400" />
						Monthly budgets
					</h2>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Progress across published category budgets.
					</p>
				</div>
			}
		>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
				{[
					['Budget', formatCurrency(summary.totalBudget)],
					['Spent', formatCurrency(summary.totalSpent)],
					['Remaining', formatCurrency(summary.remaining)],
					['Warning', String(summary.warningCount)],
					['Over budget', String(summary.overCount)],
				].map(([label, value]) => (
					<div key={label} className="rounded-xl bg-gray-50/70 p-3 dark:bg-gray-800/40">
						<p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
						<p className="mt-1 flex items-center gap-1 text-sm font-semibold">
							{label === 'Over budget' && summary.overCount > 0 && (
								<FiAlertTriangle className="h-3.5 w-3.5 text-red-500" />
							)}
							{value}
						</p>
					</div>
				))}
			</div>
		</MarketingCard>
	);
};

export default BudgetSummary;
