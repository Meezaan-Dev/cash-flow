import React, { useMemo, useState } from 'react';
import { FiCalendar, FiClock } from 'react-icons/fi';
import type { Account } from '@/types';
import Currency from '@/components/marketing/Currency';
import MarketingCard from '@/components/marketing/MarketingCard';
import { Button } from '@/components/app/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { sectionLabel } from '@/styles/marketingStyles';
import type { DueRecurringDraft } from '@cash-flow/shared/recurring/dueRecurringDrafts';
import { SensitiveText } from '@/app/privacy/SensitiveValue';

interface UpcomingRecurringPreviewProps {
	drafts: DueRecurringDraft[];
	accounts: Account[];
	confirmingDraftId: string | null;
	onConfirm: (draft: DueRecurringDraft) => void;
	onEdit: (draft: DueRecurringDraft) => void;
}

const getDateKey = (date: Date): string => {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const isSameDay = (left: Date, right: Date): boolean =>
	left.getFullYear() === right.getFullYear() &&
	left.getMonth() === right.getMonth() &&
	left.getDate() === right.getDate();

const formatOccurrenceDate = (date: Date): string =>
	date.toLocaleDateString('en-ZA', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	});

const UpcomingRecurringPreview: React.FC<UpcomingRecurringPreviewProps> = ({
	drafts,
	accounts,
	confirmingDraftId,
	onConfirm,
	onEdit,
}) => {
	const today = useMemo(() => new Date(), []);
	const [selectedDraft, setSelectedDraft] = useState<DueRecurringDraft | null>(null);
	const previewDates = useMemo(
		() => Array.from({ length: 8 }, (_, index) => addDays(today, index)),
		[today]
	);
	const draftsByDate = useMemo(() => {
		return drafts.reduce<Record<string, DueRecurringDraft[]>>((groups, draft) => {
			const key = draft.occurrenceDateKey || getDateKey(draft.occurrenceDate);
			groups[key] = groups[key] ?? [];
			groups[key].push(draft);
			return groups;
		}, {});
	}, [drafts]);
	const selectedConfirmKey = selectedDraft
		? `${selectedDraft.recurringTransaction.id}:${selectedDraft.occurrenceDateKey}`
		: null;
	const selectedAccount = selectedDraft
		? accounts.find((account) => account.id === selectedDraft.recurringTransaction.accountId)
		: undefined;

	const handleApplySelected = () => {
		if (!selectedDraft) return;
		onConfirm(selectedDraft);
		setSelectedDraft(null);
	};

	const handleEditSelected = () => {
		if (!selectedDraft) return;
		onEdit(selectedDraft);
		setSelectedDraft(null);
	};

	return (
		<MarketingCard
			header={
				<div className="flex flex-col gap-1">
					<p className={sectionLabel}>Next 7 days</p>
					<h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
						<FiCalendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
						Planned recurring expenses
					</h2>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Upcoming recurring expenses that have not been confirmed yet.
					</p>
				</div>
			}
		>
			{drafts.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center dark:border-gray-800 dark:bg-gray-800/30">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
						<FiClock className="h-5 w-5" />
					</div>
					<p className="font-medium text-gray-900 dark:text-gray-50">Nothing due soon</p>
					<p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
						Recurring expenses due in the next 7 days will show up here.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto pb-1">
					<div className="min-w-[760px] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50">
						<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
									Upcoming
								</p>
								<p className="text-base font-semibold tracking-tight">8-day expense calendar</p>
							</div>
							<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
								{today.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}
							</p>
						</div>

						<div className="grid grid-cols-8 divide-x divide-gray-100 dark:divide-gray-800">
							{previewDates.map((date) => {
								const dateKey = getDateKey(date);
								const dayDrafts = draftsByDate[dateKey] ?? [];
								const isToday = isSameDay(date, today);

								return (
									<div
										key={dateKey}
										className={isToday ? 'm-1 min-h-[7.5rem] rounded-lg border border-blue-500 bg-blue-50/70 p-2.5 dark:border-blue-400 dark:bg-blue-950/30' : 'min-h-32 p-3'}
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
													{date.toLocaleDateString('en-ZA', { weekday: 'short' })}
												</p>
												<p className="text-2xl font-semibold leading-none tracking-tight">
													{date.getDate()}
												</p>
											</div>
											{isToday && (
												<span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-blue-500">
													Today
												</span>
											)}
										</div>

										{dayDrafts.length > 0 && (
											<div className="mt-3 space-y-1.5">
												{dayDrafts.map((draft) => {
													const recurringTransaction = draft.recurringTransaction;
													const confirmKey = `${recurringTransaction.id}:${draft.occurrenceDateKey}`;

													return (
														<button
															key={confirmKey}
															type="button"
															className="block w-full truncate border-l-2 border-blue-500 py-0.5 pl-2 text-left text-xs font-semibold text-gray-800 transition-colors hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 dark:hover:text-blue-400"
															onClick={() => setSelectedDraft(draft)}
														>
															<SensitiveText widthClassName="w-20">
																{recurringTransaction.title}
															</SensitiveText>
														</button>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}

			<Dialog open={!!selectedDraft} onOpenChange={(open) => !open && setSelectedDraft(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm recurring expense?</DialogTitle>
						<DialogDescription>
							{selectedDraft ? (
								<>
									Create{' '}
									<SensitiveText widthClassName="w-28">
										{selectedDraft.recurringTransaction.title}
									</SensitiveText>{' '}
									for {formatOccurrenceDate(selectedDraft.occurrenceDate)}?
								</>
							) : ''}
						</DialogDescription>
					</DialogHeader>
					{selectedDraft && (
						<div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40">
							<p className="font-semibold text-gray-950 dark:text-gray-50">
								<SensitiveText widthClassName="w-28">
									{selectedDraft.recurringTransaction.title}
								</SensitiveText>
							</p>
							<p className="mt-1 text-gray-500 dark:text-gray-400">
								{selectedAccount ? (
									<>
										<SensitiveText widthClassName="w-24">
											{selectedAccount.name}
										</SensitiveText>
										{' - '}
									</>
								) : ''}
								<Currency amount={selectedDraft.recurringTransaction.amount} tone="balance-negative" />
							</p>
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleEditSelected}>
							Edit this transaction
						</Button>
						<Button
							type="button"
							variant="marketing"
							onClick={handleApplySelected}
							disabled={!!selectedConfirmKey && confirmingDraftId === selectedConfirmKey}
						>
							Apply as is
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</MarketingCard>
	);
};

export default UpcomingRecurringPreview;
