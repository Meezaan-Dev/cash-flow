import React, { useState } from 'react';
import {
	FiArrowDownCircle,
	FiArrowUpCircle,
	FiCalendar,
	FiChevronDown,
	FiTarget,
} from 'react-icons/fi';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import Currency from '@/components/marketing/Currency';
import { DashboardSummary } from '@/pages/dashboard/utils/dashboardSummary';
import {
	DashboardDigestCustomPeriod,
	DashboardDigestPeriod,
	DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD,
	clampDigestDay,
} from '@/pages/dashboard/utils/digestPeriod';
import {
	cardSurface,
	cardSurfaceMuted,
	progressFill,
	progressTrack,
	sectionLabel,
} from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';

interface MonthlyDigestProps {
	summary: DashboardSummary;
	period: DashboardDigestPeriod;
	onPeriodChange: (period: DashboardDigestPeriod) => void;
	compact?: boolean;
}

const MonthlyDigest: React.FC<MonthlyDigestProps> = ({
	summary,
	period,
	onPeriodChange,
	compact = false,
}) => {
	const [isPeriodOpen, setIsPeriodOpen] = useState(false);
	const savedTone =
		summary.saved >= 0 ? 'balance-positive' : 'balance-negative';
	const isCustomPeriod = period.mode === 'customCycle';
	const customPeriod: DashboardDigestCustomPeriod = isCustomPeriod
		? period
		: DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD;
	const headerPadding = compact ? 'p-3' : 'p-5';
	const heroAmountSize = compact ? 'text-3xl' : 'text-4xl';

	const handleCustomDayChange = (field: 'startDay' | 'endDay', value: string) => {
		onPeriodChange({
			...customPeriod,
			[field]: clampDigestDay(Number(value)),
		});
	};

	return (
		<section className={cn('flex-shrink-0 overflow-hidden', cardSurface)}>
			<div className={cn('border-b border-gray-100 bg-gray-50/40 dark:border-gray-800 dark:bg-gray-800/20', headerPadding)}>
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<p className={sectionLabel}>{summary.periodLabel} digest</p>
						<div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
							<div>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Retained this period
								</p>
								<Currency
									amount={summary.saved}
									tone={savedTone}
									className={cn('mt-1 tracking-tight', heroAmountSize)}
								/>
							</div>
							<div className="pb-1 text-sm text-gray-500 dark:text-gray-400">
								{summary.transactionCount} transactions tracked
							</div>
						</div>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-9 self-start rounded-full border-gray-200 px-3 text-xs dark:border-gray-700"
						onClick={() => setIsPeriodOpen((open) => !open)}
						aria-expanded={isPeriodOpen}
					>
						<FiCalendar className="h-3.5 w-3.5" />
						Period
						<FiChevronDown
							className={`h-3.5 w-3.5 transition-transform ${
								isPeriodOpen ? 'rotate-180' : ''
							}`}
						/>
					</Button>
				</div>
			</div>
			{isPeriodOpen && (
				<div className="border-b border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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
				</div>
			)}
			<div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
				<div className={cn('p-4', cardSurfaceMuted)}>
					<div className="mb-2 flex items-center justify-between gap-3">
						<p className={sectionLabel}>Income</p>
						<FiArrowUpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					</div>
					<Currency amount={summary.income} tone="income" className="text-2xl" />
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Period inflow</p>
				</div>
				<div className={cn('p-4', cardSurfaceMuted)}>
					<div className="mb-2 flex items-center justify-between gap-3">
						<p className={sectionLabel}>Spent</p>
						<FiArrowDownCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
					</div>
					<Currency amount={summary.expense} tone="expense" className="text-2xl" />
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tracked expenses</p>
				</div>
				<div className={cn('p-4', cardSurfaceMuted)}>
					<div className="mb-2 flex items-center justify-between gap-3">
						<p className={sectionLabel}>Retention</p>
						<FiTarget className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					</div>
					<p
						className={cn(
							'font-mono text-2xl font-semibold',
							summary.saved >= 0
								? 'text-emerald-600 dark:text-emerald-400'
								: 'text-red-500 dark:text-red-400'
						)}
					>
						{Math.round(summary.progressPercent)}%
					</p>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{summary.income > 0
							? `${formatCurrency(summary.saved)} kept`
							: 'Add income to track retention'}
					</p>
				</div>
			</div>
			<div className={cn('h-1.5 overflow-hidden', progressTrack)}>
				<div
					className={cn('h-full rounded-full transition-all', progressFill)}
					style={{ width: `${summary.progressPercent}%` }}
				/>
			</div>
		</section>
	);
};

export default MonthlyDigest;
