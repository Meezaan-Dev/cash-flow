import React, { useMemo, useState } from 'react';
import { FiPlus, FiSettings } from 'react-icons/fi';
import {
	getUpcomingRecurringDrafts,
	type DueRecurringDraft,
} from '@cash-flow/shared/recurring/dueRecurringDrafts';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { calculateNetWorth } from '@cash-flow/shared/accounts/AccountModel';
import { calculateAvailableBalance } from '@cash-flow/shared/accounts/AccountModel';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { usePlanningContext } from '@/domains/planning/context/PlanningContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import Currency from '@/components/marketing/Currency';
import MotionReveal from '@/components/marketing/MotionReveal';
import {
	DataListRow,
	PageHeader,
	PageShell,
} from '@/components/app/page-layout';
import { Button } from '@/components/app/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { useToast } from '@/components/app/ui/use-toast';
import { Transaction } from '@/types';
import RecentTransactionsPanel from '@/pages/dashboard/components/RecentTransactionsPanel';
import { TransactionFilterDescriptor } from '@/shared/filters/utils/transactionFilters';
import { calculateDashboardSummary } from '@/pages/dashboard/utils/dashboardSummary';
import { SensitiveText, SensitiveValue } from '@/app/privacy/SensitiveValue';
import { formatCurrency } from '@/utils/formatCurrency';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

interface DashboardOverviewProps {
	onOpenHistory: () => void;
	onOpenBudgets: () => void;
	onOpenPlanning: () => void;
	onOpenSettings: () => void;
	onCreateTransaction: () => void;
	onOpenTransactions: (filters: TransactionFilterDescriptor) => void;
	onSelectTransaction: (transaction: Transaction) => void;
	onEditRecurringDraft: (draft: DueRecurringDraft) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
	onOpenHistory,
	onOpenPlanning,
	onOpenSettings,
	onCreateTransaction,
	onSelectTransaction,
	onEditRecurringDraft,
}) => {
	const { transactions, recurringTransactions, addTransaction } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryPathLabel } = useCategoriesContext();
	const { getRemainingPlannedExpenses, getCurrentMonthKey } = usePlanningContext();
	const { toast } = useToast();
	const { mainAccountId } = useMainAccountPreference();
	const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);
	const [selectedRecurringDraft, setSelectedRecurringDraft] =
		useState<DueRecurringDraft | null>(null);
	const netWorth = useMemo(() => calculateNetWorth(accounts).netWorth, [accounts]);
	const availableBalance = useMemo(
		() => calculateAvailableBalance(accounts),
		[accounts]
	);
	const currentMonth = getCurrentMonthKey();
	const dashboardSummary = useMemo(
		() => calculateDashboardSummary(transactions, accounts, new Date()),
		[accounts, transactions]
	);
	const remainingPlannedExpenses = useMemo(
		() => getRemainingPlannedExpenses(currentMonth),
		[currentMonth, getRemainingPlannedExpenses]
	);
	const upcomingRecurringDrafts = useMemo(
		() => getUpcomingRecurringDrafts(recurringTransactions, transactions, new Date(), 7),
		[recurringTransactions, transactions]
	);
	const compactRecurringDrafts = upcomingRecurringDrafts.slice(0, 3);
	const compactPlannedExpenses = remainingPlannedExpenses.slice(0, 3);
	const comingUpCount = upcomingRecurringDrafts.length + remainingPlannedExpenses.length;

	const defaultAccountId = useMemo(() => {
		const mainAccount = accounts.find((account) => account.id === mainAccountId);
		return mainAccount?.id ?? accounts[0]?.id;
	}, [accounts, mainAccountId]);

	const handleConfirmRecurringDraft = async (
		draft: (typeof upcomingRecurringDrafts)[number]
	) => {
		const recurringTransaction = draft.recurringTransaction;
		const accountId = recurringTransaction.accountId ?? defaultAccountId;
		const confirmKey = `${recurringTransaction.id}:${draft.occurrenceDateKey}`;
		const transactionType = recurringTransaction.type ?? 'expense';

		if (!recurringTransaction.id || !accountId) {
			toast({
				title: 'Account needed',
				description: 'Add an account to this recurring transaction before confirming it.',
				variant: 'destructive',
			});
			return;
		}

		setConfirmingDraftId(confirmKey);
		try {
			await addTransaction({
				type: transactionType,
				accountId,
				title: recurringTransaction.title,
				amount: recurringTransaction.amount,
				category: recurringTransaction.category,
				subcategory: recurringTransaction.subcategory,
				description: recurringTransaction.description,
				date: draft.occurrenceDate,
				recurringTransactionId: recurringTransaction.id,
				recurringOccurrenceDate: draft.occurrenceDateKey,
			});
			toast({
				title: 'Recurring transaction confirmed',
				description: `${recurringTransaction.title} was added for ${draft.occurrenceDate.toLocaleDateString('en-ZA')}.`,
			});
			setSelectedRecurringDraft(null);
		} catch (error) {
			toast({
				title: 'Could not confirm transaction',
				description:
					error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive',
			});
		} finally {
			setConfirmingDraftId(null);
		}
	};

	const handleEditRecurringDraft = () => {
		if (!selectedRecurringDraft) return;
		onEditRecurringDraft(selectedRecurringDraft);
		setSelectedRecurringDraft(null);
	};

	const selectedRecurringConfirmKey = selectedRecurringDraft
		? `${selectedRecurringDraft.recurringTransaction.id}:${selectedRecurringDraft.occurrenceDateKey}`
		: null;

	const headerActions = (
		<div className="flex items-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="icon"
				onClick={onOpenSettings}
				aria-label="Open dashboard settings"
			>
				<FiSettings className="h-4 w-4" />
			</Button>
			<Button type="button" variant="marketing" onClick={onCreateTransaction}>
				<FiPlus className="h-4 w-4" />
				New transaction
			</Button>
		</div>
	);

	return (
		<PageShell>
			<div className="mx-auto w-full max-w-6xl space-y-10">
				<MotionReveal>
					<PageHeader title="Dashboard" actions={headerActions} />
				</MotionReveal>
				<MotionReveal delay={0.04}>
					<section className="space-y-3">
						<p className={cn('text-sm font-medium text-gray-500 dark:text-gray-400')}>
							Available
						</p>
						<div className="flex flex-wrap items-end gap-x-6 gap-y-2">
							<Currency
								amount={availableBalance}
								className="text-4xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-5xl"
								tone={availableBalance >= 0 ? 'balance-positive' : 'balance-negative'}
							/>
							<p className="pb-1 text-sm text-gray-500 dark:text-gray-400">
								Net worth{' '}
								<Currency amount={netWorth} className="text-sm font-medium" />
							</p>
						</div>
						<div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 sm:max-w-xl">
							<div className={cn(cardSurface, 'px-4 py-3')}>
								<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
									Spent this month
								</p>
								<Currency
									amount={dashboardSummary.expense}
									tone="expense"
									className="mt-1 text-lg font-semibold"
								/>
							</div>
							<div className={cn(cardSurface, 'px-4 py-3')}>
								<p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
									Coming up
								</p>
								<p className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
									{comingUpCount} item{comingUpCount === 1 ? '' : 's'}
								</p>
							</div>
						</div>
					</section>
				</MotionReveal>

				<MotionReveal delay={0.1}>
					<div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
						<section className={cn(cardSurface, 'flex min-h-[320px] flex-col overflow-hidden')}>
							<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
								<p className={sectionLabel}>Coming up</p>
								<h2 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
									Next money moves
								</h2>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Recurring and planned items that need attention soon.
								</p>
							</div>
							<div className="flex min-h-0 flex-1 flex-col">
								{compactRecurringDrafts.length === 0 && compactPlannedExpenses.length === 0 ? (
									<div className="flex flex-1 items-center px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
										Nothing due soon and no planned expenses remaining this month.
									</div>
								) : (
									<>
										{compactRecurringDrafts.map((draft) => {
											const recurringTransaction = draft.recurringTransaction;
											const confirmKey = `${recurringTransaction.id}:${draft.occurrenceDateKey}`;
											return (
												<DataListRow
													key={confirmKey}
													className="grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto]"
												>
													<button
														type="button"
														onClick={() => setSelectedRecurringDraft(draft)}
														className="min-w-0 text-left"
													>
														<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
															<SensitiveText widthClassName="w-32">
																{recurringTransaction.title}
															</SensitiveText>
														</p>
														<p className="truncate text-xs text-gray-500 dark:text-gray-400">
															Recurring · {formatShortDate(draft.occurrenceDate)}
														</p>
													</button>
													<div className="flex items-center gap-3">
														<SensitiveValue widthClassName="w-20">
															{formatCurrency(recurringTransaction.amount)}
														</SensitiveValue>
														<Button
															type="button"
															variant="outline"
															onClick={() => void handleConfirmRecurringDraft(draft)}
															disabled={confirmingDraftId === confirmKey}
														>
															Apply
														</Button>
													</div>
												</DataListRow>
											);
										})}
										{compactPlannedExpenses.map((expense) => (
											<DataListRow
												key={expense.id}
												className="grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto]"
											>
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
														<SensitiveText widthClassName="w-32">
															{expense.title}
														</SensitiveText>
													</p>
													<p className="truncate text-xs text-gray-500 dark:text-gray-400">
														Planned ·{' '}
														{getCategoryPathLabel(expense.category, expense.subcategory)}
													</p>
												</div>
												<SensitiveValue widthClassName="w-20">
													{formatCurrency(expense.amount)}
												</SensitiveValue>
											</DataListRow>
										))}
									</>
								)}
								<div className="mt-auto border-t border-gray-100 px-5 py-3 dark:border-gray-800">
									<Button type="button" variant="ghost" onClick={onOpenPlanning}>
										View planning
									</Button>
								</div>
							</div>
						</section>

						<section className="flex min-h-[320px] flex-col">
							<RecentTransactionsPanel
								transactions={transactions}
								accounts={accounts}
								getCategoryPathLabel={getCategoryPathLabel}
								onSelect={onSelectTransaction}
								onOpenHistory={onOpenHistory}
								limit={5}
								className="h-full min-h-[320px] flex-1"
							/>
						</section>
					</div>
				</MotionReveal>
			</div>

			<Dialog
				open={!!selectedRecurringDraft}
				onOpenChange={(open) => !open && setSelectedRecurringDraft(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm recurring transaction?</DialogTitle>
						<DialogDescription>
							{selectedRecurringDraft ? (
								<>
									Create{' '}
									<SensitiveText widthClassName="w-28">
										{selectedRecurringDraft.recurringTransaction.title}
									</SensitiveText>{' '}
									for {formatShortDate(selectedRecurringDraft.occurrenceDate)}?
								</>
							) : (
								''
							)}
						</DialogDescription>
					</DialogHeader>
					{selectedRecurringDraft && (
						<div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40">
							<p className="font-semibold text-gray-950 dark:text-gray-50">
								<SensitiveText widthClassName="w-28">
									{selectedRecurringDraft.recurringTransaction.title}
								</SensitiveText>
							</p>
							<p className="mt-1 text-gray-500 dark:text-gray-400">
								<Currency
									amount={selectedRecurringDraft.recurringTransaction.amount}
									tone={
										selectedRecurringDraft.recurringTransaction.type === 'income'
											? 'balance-positive'
											: 'balance-negative'
									}
								/>
							</p>
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleEditRecurringDraft}>
							Edit this transaction
						</Button>
						<Button
							type="button"
							variant="marketing"
							onClick={() =>
								selectedRecurringDraft &&
								void handleConfirmRecurringDraft(selectedRecurringDraft)
							}
							disabled={
								!!selectedRecurringConfirmKey &&
								confirmingDraftId === selectedRecurringConfirmKey
							}
						>
							Apply as is
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
};

const formatShortDate = (date: Date): string =>
	date.toLocaleDateString('en-ZA', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});

export default DashboardOverview;
