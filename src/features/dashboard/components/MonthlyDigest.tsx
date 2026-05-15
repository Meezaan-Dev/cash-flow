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
import { DashboardSummary } from '@/features/dashboard/utils/dashboardSummary';
import {
	DashboardDigestCustomPeriod,
	DashboardDigestPeriod,
	DEFAULT_CUSTOM_DASHBOARD_DIGEST_PERIOD,
	clampDigestDay,
} from '@/features/dashboard/utils/digestPeriod';
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
		summary.saved >= 0
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';
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
		<section className="flex-shrink-0 overflow-hidden rounded-lg border bg-card shadow-sm">
			<div className={`border-b bg-muted/20 ${compact ? 'p-3' : 'p-5'}`}>
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{summary.periodLabel} digest
						</p>
						<div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
							<div>
								<p className="text-sm text-muted-foreground">
									Retained this period
								</p>
								<p
									className={`${compact ? 'text-3xl' : 'text-4xl'} mt-1 font-semibold tracking-tight ${savedTone}`}
								>
									{formatCurrency(summary.saved)}
								</p>
							</div>
							<div className="pb-1 text-sm text-muted-foreground">
								{summary.transactionCount} transactions tracked
							</div>
						</div>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-9 self-start px-3 text-xs"
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
				<div className="border-b bg-background p-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant={!isCustomPeriod ? 'secondary' : 'outline'}
								size="sm"
								onClick={() => onPeriodChange({ mode: 'monthToDate' })}
							>
								Month to date
							</Button>
							<Button
								type="button"
								variant={isCustomPeriod ? 'secondary' : 'outline'}
								size="sm"
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
									className="h-9 w-full sm:w-28"
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
									className="h-9 w-full sm:w-28"
								/>
							</div>
						</div>
					</div>
				</div>
			)}
			<div className="grid gap-px bg-border sm:grid-cols-3">
				<div className={`bg-card ${compact ? 'p-3' : 'p-4'}`}>
					<div className="mb-2 flex items-center justify-between gap-3">
						<p className="text-sm text-muted-foreground">Income</p>
						<FiArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
					</div>
					<p className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold text-primary`}>
						{formatCurrency(summary.income)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">Period inflow</p>
				</div>
				<div className={`bg-card ${compact ? 'p-3' : 'p-4'}`}>
					<div className="mb-2 flex items-center justify-between gap-3">
						<p className="text-sm text-muted-foreground">Spent</p>
						<FiArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
					</div>
					<p className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold text-red-600 dark:text-red-400`}>
						{formatCurrency(summary.expense)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Tracked expenses
					</p>
				</div>
				<div className={`bg-card ${compact ? 'p-3' : 'p-4'}`}>
					<div className="mb-2 flex items-center justify-between gap-3">
						<p className="text-sm text-muted-foreground">Retention</p>
						<FiTarget className="h-4 w-4 text-primary" />
					</div>
					<p className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold ${savedTone}`}>
						{Math.round(summary.progressPercent)}%
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{summary.income > 0
							? `${formatCurrency(summary.saved)} kept`
							: 'Add income to track retention'}
					</p>
				</div>
			</div>
			<div className="h-1.5 overflow-hidden bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${summary.progressPercent}%` }}
				/>
			</div>
		</section>
	);
};

export default MonthlyDigest;
