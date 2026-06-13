import React, { useState } from 'react';
import {
	FiArrowDownCircle,
	FiArrowUpCircle,
	FiCalendar,
	FiChevronDown,
	FiDollarSign,
	FiTrendingUp,
} from 'react-icons/fi';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { DashboardSummary } from '@/pages/dashboard/utils/dashboardSummary';
import {
	DashboardDigestCustomPeriod,
	DashboardDigestPeriod,
	DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD,
	clampDigestDay,
} from '@/pages/dashboard/utils/digestPeriod';
import { FilterBar, SummaryCard, SummaryCardGrid } from '@/components/app/page-layout';
import { TransactionFilterDescriptor } from '@/shared/filters/utils/transactionFilters';

interface MonthlyDigestProps {
	summary: DashboardSummary;
	period: DashboardDigestPeriod;
	onPeriodChange: (period: DashboardDigestPeriod) => void;
	onOpenTransactions: (filters: TransactionFilterDescriptor) => void;
	compact?: boolean;
}

const MonthlyDigest: React.FC<MonthlyDigestProps> = ({
	summary,
	period,
	onPeriodChange,
	onOpenTransactions,
}) => {
	const [isPeriodOpen, setIsPeriodOpen] = useState(false);
	const isCustomPeriod = period.mode === 'customCycle';
	const customPeriod: DashboardDigestCustomPeriod = isCustomPeriod
		? period
		: DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD;

	const handleCustomDayChange = (field: 'startDay' | 'endDay', value: string) => {
		onPeriodChange({
			...customPeriod,
			[field]: clampDigestDay(Number(value)),
		});
	};

	return (
		<section className="space-y-4">
			<div className="flex justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 rounded-full border-gray-200 px-3 text-xs dark:border-gray-700"
					onClick={() => setIsPeriodOpen((open) => !open)}
					aria-expanded={isPeriodOpen}
				>
					<FiCalendar className="h-3.5 w-3.5" />
					{summary.periodLabel}
					<FiChevronDown
						className={`h-3.5 w-3.5 transition-transform ${
							isPeriodOpen ? 'rotate-180' : ''
						}`}
					/>
				</Button>
			</div>
			{isPeriodOpen && (
				<FilterBar>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant={!isCustomPeriod ? 'marketing' : 'outline'}
								size="sm"
								className={isCustomPeriod ? 'rounded-full' : ''}
								onClick={() => onPeriodChange({ mode: 'monthToDate' })}
							>
								Month to date
							</Button>
							<Button
								type="button"
								variant={isCustomPeriod ? 'marketing' : 'outline'}
								size="sm"
								className={!isCustomPeriod ? 'rounded-full' : ''}
								onClick={() => onPeriodChange(DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD)}
							>
								Custom cycle
							</Button>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div>
								<Label htmlFor="digest-start-day" className="mb-1 block text-xs">
									Start day
								</Label>
								<Input
									id="digest-start-day"
									type="number"
									min={1}
									max={31}
									value={customPeriod.startDay}
									onFocus={() => {
										if (!isCustomPeriod) {
											onPeriodChange(DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD);
										}
									}}
									onChange={(event) =>
										handleCustomDayChange('startDay', event.target.value)
									}
									className="h-9 w-full rounded-xl sm:w-28"
								/>
							</div>
							<div>
								<Label htmlFor="digest-end-day" className="mb-1 block text-xs">
									End day
								</Label>
								<Input
									id="digest-end-day"
									type="number"
									min={1}
									max={31}
									value={customPeriod.endDay}
									onFocus={() => {
										if (!isCustomPeriod) {
											onPeriodChange(DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD);
										}
									}}
									onChange={(event) =>
										handleCustomDayChange('endDay', event.target.value)
									}
									className="h-9 w-full rounded-xl sm:w-28"
								/>
							</div>
						</div>
					</div>
				</FilterBar>
			)}
			<SummaryCardGrid>
				<SummaryCard
					label="Available balance"
					amount={summary.availableBalance}
					tone={summary.availableBalance >= 0 ? 'balance-positive' : 'balance-negative'}
					note="Across linked accounts"
					icon={<FiDollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
				/>
				<SummaryCard
					label="Income"
					amount={summary.income}
					tone="income"
					note={`${summary.transactionCount} transactions in this period`}
					icon={<FiArrowUpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
					onClick={() =>
						onOpenTransactions({
							type: 'income',
							startDate: summary.startDate,
							endDate: summary.endDate,
						})
					}
				/>
				<SummaryCard
					label="Expenses"
					amount={summary.expense}
					tone="expense"
					note="Tracked spending"
					icon={<FiArrowDownCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
					onClick={() =>
						onOpenTransactions({
							type: 'expense',
							startDate: summary.startDate,
							endDate: summary.endDate,
						})
					}
				/>
				<SummaryCard
					label="Net change"
					amount={summary.saved}
					tone={summary.saved >= 0 ? 'balance-positive' : 'balance-negative'}
					note={`${Math.round(summary.progressPercent)}% of income retained`}
					icon={<FiTrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
				/>
			</SummaryCardGrid>
		</section>
	);
};

export default MonthlyDigest;
