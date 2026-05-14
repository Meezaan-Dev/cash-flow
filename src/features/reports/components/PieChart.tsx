import React, { useMemo } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DateRange, PieChartComponentProps } from '@/types';
import DateRangeFilter from '@/features/filters/components/DateRangeFilter';
import { Button } from '@/components/app/ui/button';
import { X } from 'lucide-react';

const PieChartComponent: React.FC<PieChartComponentProps> = ({
	data,
	onClose,
	dateRange,
	onDateRangeChange,
}) => {
	const handleDateRangeChange = (newRange: DateRange) => {
		if (onDateRangeChange) {
			onDateRangeChange(newRange);
		}
	};

	const handleClearDateRange = () => {
		if (onDateRangeChange) {
			onDateRangeChange({ startDate: '', endDate: '' });
		}
	};

	const totalExpense = useMemo(() => {
		return data.reduce((sum, item) => sum + item.value, 0);
	}, [data]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-6">
			<div className="w-full max-w-4xl rounded-lg border bg-card p-4 md:p-6 shadow-lg">
				<div className="mb-4 md:mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-xl md:text-2xl font-semibold">Expense Breakdown</h2>
						<p className="text-xs md:text-sm text-muted-foreground">
							Visualization of your spending categories
						</p>
					</div>
					<Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chart">
						<X className="h-5 w-5" />
					</Button>
				</div>

				{onDateRangeChange && (
					<div className="mb-4 md:mb-6">
						<DateRangeFilter
							dateRange={dateRange || { startDate: '', endDate: '' }}
							onDateRangeChange={handleDateRangeChange}
							onClear={handleClearDateRange}
						/>
					</div>
				)}

				{data.length === 0 ? (
					<div className="flex items-center justify-center rounded-lg border border-dashed py-12">
						<div className="text-center">
							<p className="text-sm md:text-base text-muted-foreground">
								No expenses found for the selected date range
							</p>
						</div>
					</div>
				) : (
					<>
						<div className="mb-6 flex flex-col md:flex-row gap-6">
							<div className="flex-1 flex items-center justify-center">
								<ResponsiveContainer width="100%" height={300}>
									<RechartsPieChart key={`chart-${data.length}`}>
										<Pie
											data={data}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={90}
											paddingAngle={2}
											dataKey="value"
											label={({ percent }) =>
												`${(percent * 100).toFixed(0)}%`
											}
											labelLine={false}
										>
											{data.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={entry.color}
													stroke="hsl(var(--card))"
													strokeWidth={2}
												/>
											))}
										</Pie>
										<Tooltip
											formatter={(value: number) => [
												`R ${value.toFixed(2)}`,
												'Amount',
											]}
											contentStyle={{
												background: 'hsl(var(--card))',
												border: '1px solid hsl(var(--border))',
												borderRadius: '8px',
												boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
												color: 'hsl(var(--foreground))',
											}}
											labelStyle={{
												color: 'hsl(var(--foreground))',
											}}
											itemStyle={{
												color: 'hsl(var(--foreground))',
											}}
										/>
									</RechartsPieChart>
								</ResponsiveContainer>
							</div>

							<div className="flex-1 flex flex-col justify-center">
								<div className="rounded-lg border bg-muted/30 p-4 mb-4">
									<p className="text-xs md:text-sm text-muted-foreground mb-1">
										Total Expenses
									</p>
									<p className="text-2xl md:text-3xl font-bold">
										R {totalExpense.toFixed(2)}
									</p>
								</div>
								<div className="space-y-2">
									{data.map((item, index) => (
										<div
											key={index}
											className="flex items-center justify-between rounded-lg border p-2 md:p-3 text-sm"
										>
											<div className="flex items-center gap-3 flex-1 min-w-0">
												<div
													className="h-3 w-3 md:h-4 md:w-4 rounded-full flex-shrink-0"
													style={{ backgroundColor: item.color }}
												/>
												<span className="font-medium truncate">
													{item.name}
												</span>
											</div>
											<span className="font-semibold flex-shrink-0 ml-2">
												R {item.value.toFixed(2)}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default PieChartComponent;
