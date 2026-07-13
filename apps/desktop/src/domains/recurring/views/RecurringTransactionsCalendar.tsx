import React, { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { RecurringTransaction } from '@/domains/recurring/models/RecurringTransactionModel';
import { Button } from '@/components/app/ui/button';
import { Badge } from '@/components/app/ui/badge';
import { formatCurrency } from '@/utils/formatCurrency';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { getCategoryColor, getContrastingTextColor } from '@/domains/categories/utils/categoryColors';
import { getRecurringFrequencyLabel } from './recurringDisplay';

type Props = {
	transactions: RecurringTransaction[];
	onEdit: (transaction: RecurringTransaction) => void;
	onDelete: (id: string) => void;
	getCategoryPathLabel: (categoryId: string, subcategoryId?: string) => string;
};

type DayBucketItem = {
	transaction: RecurringTransaction;
	isOverflowDay: boolean;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toMondayFirstIndex = (jsDayIndex: number): number => (jsDayIndex + 6) % 7;

const RecurringTransactionsCalendar: React.FC<Props> = ({
	transactions,
	onEdit,
	onDelete,
	getCategoryPathLabel,
}) => {
	const { accounts } = useAccountsContext();

	const [visibleMonth, setVisibleMonth] = useState(() => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	});
	const [selectedDay, setSelectedDay] = useState<number | null>(null);
	const [isDayModalOpen, setIsDayModalOpen] = useState(false);

	const today = useMemo(() => new Date(), []);
	const daysInMonth = useMemo(
		() => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate(),
		[visibleMonth]
	);

	const firstWeekdayIndex = useMemo(
		() => toMondayFirstIndex(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay()),
		[visibleMonth]
	);

	const { transactionsByDay, unscheduledCount } = useMemo(() => {
		const byDay = new Map<number, DayBucketItem[]>();
		let missingExpectedDateCount = 0;

		for (const transaction of transactions) {
			if (!transaction.expectedDate) {
				missingExpectedDateCount += 1;
				continue;
			}

			const expectedDay = transaction.expectedDate;
			const displayDay = Math.min(expectedDay, daysInMonth);
			const bucket = byDay.get(displayDay) ?? [];
			bucket.push({
				transaction,
				isOverflowDay: expectedDay > daysInMonth,
			});
			byDay.set(displayDay, bucket);
		}

		return { transactionsByDay: byDay, unscheduledCount: missingExpectedDateCount };
	}, [transactions, daysInMonth]);

	const monthLabel = visibleMonth.toLocaleDateString(undefined, {
		month: 'long',
		year: 'numeric',
	});

	const totalGridCells = Math.ceil((firstWeekdayIndex + daysInMonth) / 7) * 7;
	const gridCells = Array.from({ length: totalGridCells }, (_, index) => {
		const dayNumber = index - firstWeekdayIndex + 1;
		if (dayNumber < 1 || dayNumber > daysInMonth) {
			return { dayNumber: null, key: `empty-${index}` };
		}
		return { dayNumber, key: `day-${dayNumber}` };
	});

	const hasTransactionsInVisibleMonth = transactionsByDay.size > 0;
	const selectedDayItems = selectedDay ? transactionsByDay.get(selectedDay) ?? [] : [];

	const openDayModal = (dayNumber: number) => {
		setSelectedDay(dayNumber);
		setIsDayModalOpen(true);
	};

	return (
		<div className="rounded-xl border bg-card p-4">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold">{monthLabel}</h2>
					<p className="text-xs text-muted-foreground">
						Mapped by expected day of month (1-31)
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() =>
							setVisibleMonth(
								(previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1)
							)
						}
						aria-label="Previous month"
					>
						<FiChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const now = new Date();
							setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
						}}
					>
						Today
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() =>
							setVisibleMonth(
								(previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1)
							)
						}
						aria-label="Next month"
					>
						<FiChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="mb-2 grid grid-cols-7 gap-2">
				{WEEKDAY_LABELS.map((weekday) => (
					<div
						key={weekday}
						className="rounded-md border border-dashed px-2 py-1 text-center text-xs font-medium text-muted-foreground"
					>
						{weekday}
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
				{gridCells.map((cell) => {
					if (cell.dayNumber === null) {
						return <div key={cell.key} className="hidden min-h-28 rounded-lg border bg-muted/30 lg:block" />;
					}

					const dayItems = transactionsByDay.get(cell.dayNumber) ?? [];
					const showItems = dayItems.slice(0, 3);
					const hiddenCount = Math.max(dayItems.length - showItems.length, 0);
					const isToday =
						today.getFullYear() === visibleMonth.getFullYear() &&
						today.getMonth() === visibleMonth.getMonth() &&
						today.getDate() === cell.dayNumber;

					return (
						<div
							key={cell.key}
							className={`min-h-28 rounded-lg border p-2 ${dayItems.length > 0 ? 'cursor-pointer hover:bg-muted/20' : ''}`}
							onClick={() => dayItems.length > 0 && openDayModal(cell.dayNumber)}
							role={dayItems.length > 0 ? 'button' : undefined}
							tabIndex={dayItems.length > 0 ? 0 : -1}
							onKeyDown={(event) => {
								if (
									dayItems.length > 0 &&
									(event.key === 'Enter' || event.key === ' ')
								) {
									event.preventDefault();
									openDayModal(cell.dayNumber);
								}
							}}
							aria-label={dayItems.length > 0 ? `Open day ${cell.dayNumber} transactions` : undefined}
						>
							<div className="mb-2 flex items-center justify-between">
								<span
									className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}
								>
									{cell.dayNumber}
								</span>
								{dayItems.length > 0 && (
									<Badge variant="secondary" className="text-[10px]">
										{dayItems.length}
									</Badge>
								)}
							</div>

							<div className="space-y-1.5">
								{showItems.map(({ transaction, isOverflowDay }, index) => {
									const categoryColor = getCategoryColor(transaction.category);
									const textColor = getContrastingTextColor(categoryColor);

									return (
										<button
											type="button"
											key={transaction.id ?? `${cell.dayNumber}-${transaction.title}-${index}`}
											className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs font-medium opacity-95 transition-opacity hover:opacity-100"
											style={{
												backgroundColor: categoryColor,
												color: textColor,
											}}
											onClick={(event) => {
												event.stopPropagation();
												openDayModal(cell.dayNumber!);
											}}
										>
											{transaction.title}
											{isOverflowDay ? ` (from day ${transaction.expectedDate})` : ''}
										</button>
									);
								})}
								{hiddenCount > 0 && (
									<button
										type="button"
										className="text-[11px] text-muted-foreground hover:text-foreground"
										onClick={(event) => {
											event.stopPropagation();
											openDayModal(cell.dayNumber!);
										}}
									>
										+{hiddenCount} more
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{!hasTransactionsInVisibleMonth && (
				<div className="mt-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
					No recurring transactions are scheduled on calendar days for this month with current
					filters.
				</div>
			)}

			{unscheduledCount > 0 && (
				<div className="mt-3 text-xs text-muted-foreground">
					{unscheduledCount} {unscheduledCount === 1 ? 'transaction is' : 'transactions are'} missing an
					expected day and cannot be shown on the calendar.
				</div>
			)}

			<Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>
							Day {selectedDay} - {monthLabel}
						</DialogTitle>
						<DialogDescription>
							Recurring transactions scheduled for this calendar day.
						</DialogDescription>
					</DialogHeader>
					{selectedDayItems.length === 0 ? (
						<p className="text-sm text-muted-foreground">No transactions for this day.</p>
					) : (
						<div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
							{selectedDayItems.map(({ transaction, isOverflowDay }) => (
								<div
									key={transaction.id}
									className="flex items-start justify-between gap-3 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{transaction.title}</p>
										<p className="text-xs text-muted-foreground">
											{getCategoryPathLabel(
												transaction.category,
												transaction.subcategory
											)} •{' '}
											{getRecurringFrequencyLabel(transaction.frequency)}
											{transaction.accountId && (() => {
												const acct = accounts.find((a) => a.id === transaction.accountId);
												return acct ? <> • {acct.name}</> : null;
											})()}
										</p>
										<p className="mt-1 text-sm font-medium">
											{formatCurrency(transaction.amount)}
										</p>
										{isOverflowDay && (
											<Badge variant="outline" className="mt-1 text-[10px]">
												From day {transaction.expectedDate}
											</Badge>
										)}
									</div>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => onEdit(transaction)}
											aria-label="Edit recurring transaction"
										>
											<FiEdit className="h-4 w-4" />
										</Button>
										{transaction.id && (
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-destructive hover:text-destructive"
												onClick={() => onDelete(transaction.id!)}
												aria-label="Delete recurring transaction"
											>
												<FiTrash2 className="h-4 w-4" />
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default RecurringTransactionsCalendar;
