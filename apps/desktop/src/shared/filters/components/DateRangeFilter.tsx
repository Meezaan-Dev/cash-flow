import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { DateRange } from '@/types';

interface DateRangeFilterProps {
	dateRange: DateRange;
	onDateRangeChange: (range: DateRange) => void;
	onClear: () => void;
	showCustomInputs?: boolean;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
	dateRange,
	onDateRangeChange,
	onClear,
	showCustomInputs = false,
}) => {
	const [isCustomRange, setIsCustomRange] = useState(false);

	const presetRanges = [
		{ label: 'Last 7 days', value: '7days' },
		{ label: 'Last 30 days', value: '30days' },
		{ label: 'Last 3 months', value: '3months' },
		{ label: 'Last 6 months', value: '6months' },
		{ label: 'This year', value: 'thisYear' },
		{ label: 'Custom range', value: 'custom' },
	];

	const getPresetDates = (preset: string): DateRange => {
		const today = new Date();
		const startDate = new Date();

		switch (preset) {
			case '7days':
				startDate.setDate(today.getDate() - 7);
				break;
			case '30days':
				startDate.setDate(today.getDate() - 30);
				break;
			case '3months':
				startDate.setMonth(today.getMonth() - 3);
				break;
			case '6months':
				startDate.setMonth(today.getMonth() - 6);
				break;
			case 'thisYear':
				startDate.setMonth(0, 1);
				break;
			default:
				return dateRange;
		}

		return {
			startDate: startDate.toISOString().split('T')[0],
			endDate: today.toISOString().split('T')[0],
		};
	};

	const detectActivePreset = (): string => {
		if (!dateRange.startDate || !dateRange.endDate) {
			return 'all';
		}

		if (isCustomRange) {
			return 'custom';
		}

		// Check which preset matches the current date range
		const today = new Date();
		const currentStart = new Date(dateRange.startDate);
		const daysDiff = Math.floor(
			(today.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (daysDiff >= 6 && daysDiff <= 8) return '7days';
		if (daysDiff >= 29 && daysDiff <= 31) return '30days';
		if (
			Math.abs(today.getMonth() - currentStart.getMonth()) === 3 ||
			Math.abs(today.getMonth() - currentStart.getMonth()) === 9
		)
			return '3months';
		if (Math.abs(today.getMonth() - currentStart.getMonth()) === 6) return '6months';
		if (
			currentStart.getMonth() === 0 &&
			currentStart.getDate() === 1 &&
			currentStart.getFullYear() === today.getFullYear()
		)
			return 'thisYear';

		return 'custom';
	};

	const handlePresetChange = (preset: string) => {
		if (preset === 'custom') {
			setIsCustomRange(true);
		} else {
			setIsCustomRange(false);
			const newRange = getPresetDates(preset);
			onDateRangeChange(newRange);
		}
	};

	const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
		onDateRangeChange({
			...dateRange,
			[field]: value,
		});
	};

	const formatDateRange = (range: DateRange): string => {
		if (!range.startDate || !range.endDate) return 'Select date range';

		const start = new Date(range.startDate).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
		const end = new Date(range.endDate).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});

		return `${start} - ${end}`;
	};

	const isRangeActive = dateRange.startDate && dateRange.endDate;
	const activePreset = detectActivePreset();

	const shouldShowCustomInputs = isCustomRange || showCustomInputs;

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
				<div className="flex-1 sm:flex-initial">
					<Select value={activePreset} onValueChange={handlePresetChange}>
						<SelectTrigger id="preset-select" className="w-full sm:w-[180px]">
							<SelectValue placeholder="Date Range" />
						</SelectTrigger>
						<SelectContent>
							{presetRanges.map((preset) => (
								<SelectItem key={preset.value} value={preset.value}>
									{preset.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{shouldShowCustomInputs && (
					<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
						<div className="flex-1 sm:flex-initial">
							<Label
								htmlFor="start-date"
								className="text-xs md:text-sm font-medium mb-2 block"
							>
								Start Date
							</Label>
							<Input
								id="start-date"
								type="date"
								value={dateRange.startDate}
								onChange={(e) =>
									handleCustomDateChange('startDate', e.target.value)
								}
								className="w-full sm:w-[140px]"
							/>
						</div>
						<div className="flex-1 sm:flex-initial">
							<Label
								htmlFor="end-date"
								className="text-xs md:text-sm font-medium mb-2 block"
							>
								End Date
							</Label>
							<Input
								id="end-date"
								type="date"
								value={dateRange.endDate}
								onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
								className="w-full sm:w-[140px]"
							/>
						</div>
					</div>
				)}
			</div>

			{isRangeActive && (
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground md:text-sm">
						<span>{formatDateRange(dateRange)}</span>
						<button
							onClick={onClear}
							className="rounded-full hover:bg-muted transition-colors"
							aria-label="Clear date range"
						>
							<FiX className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default DateRangeFilter;
