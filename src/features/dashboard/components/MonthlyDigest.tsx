import React from 'react';
import { DashboardSummary } from '@/features/dashboard/utils/dashboardSummary';
import { formatCurrency } from '@/utils/formatCurrency';

interface MonthlyDigestProps {
	summary: DashboardSummary;
}

const MonthlyDigest: React.FC<MonthlyDigestProps> = ({ summary }) => {
	const savedTone =
		summary.saved >= 0
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';

	return (
		<section className="flex-shrink-0 rounded-lg border bg-card p-4">
			<div className="mb-4 flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{summary.monthLabel} digest
				</p>
				<p className="text-xs text-muted-foreground">
					{summary.transactionCount} transactions
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-3">
				<div>
					<p className="text-sm text-muted-foreground">Income</p>
					<p className="mt-1 text-2xl font-semibold text-primary">
						{formatCurrency(summary.income)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Current month inflow
					</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Spent</p>
					<p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
						{formatCurrency(summary.expense)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Tracked expenses
					</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Saved</p>
					<p className={`mt-1 text-2xl font-semibold ${savedTone}`}>
						{formatCurrency(summary.saved)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{summary.income > 0
							? `${Math.round(summary.progressPercent)}% of income retained`
							: 'Add income to track retention'}
					</p>
				</div>
			</div>
			<div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${summary.progressPercent}%` }}
				/>
			</div>
		</section>
	);
};

export default MonthlyDigest;
