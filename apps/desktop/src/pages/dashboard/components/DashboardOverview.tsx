import React, { useCallback, useMemo, useState } from 'react';
import { FiCheck, FiPlus, FiRefreshCw, FiSettings } from 'react-icons/fi';
import { getDueRecurringDrafts } from '@cash-flow/shared/recurring/dueRecurringDrafts';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import AIChatbot from '@/domains/ai/components/AIChatbot';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import Currency from '@/components/marketing/Currency';
import MotionReveal from '@/components/marketing/MotionReveal';
import MarketingCard from '@/components/marketing/MarketingCard';
import { PageHeader, PageShell } from '@/components/app/page-layout';
import { Button } from '@/components/app/ui/button';
import { useToast } from '@/components/app/ui/use-toast';
import { Transaction } from '@/types';
import AccountBalanceStrip from '@/pages/dashboard/components/AccountBalanceStrip';
import MonthlyDigest from '@/pages/dashboard/components/MonthlyDigest';
import RecentTransactionsPanel from '@/pages/dashboard/components/RecentTransactionsPanel';
import BudgetSummary from '@/pages/dashboard/components/BudgetSummary';
import { calculateDashboardSummary } from '@/pages/dashboard/utils/dashboardSummary';
import {
	DashboardDigestPeriod,
	loadDashboardDigestPeriod,
	saveDashboardDigestPeriod,
} from '@/pages/dashboard/utils/digestPeriod';
import { TransactionFilterDescriptor } from '@/shared/filters/utils/transactionFilters';

interface DashboardOverviewProps {
	onOpenAccounts: () => void;
	onOpenHistory: () => void;
	onOpenBudgets: () => void;
	onOpenSettings: () => void;
	onCreateTransaction: () => void;
	onOpenTransactions: (filters: TransactionFilterDescriptor) => void;
	onSelectTransaction: (transaction: Transaction) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
	onOpenAccounts,
	onOpenHistory,
	onOpenBudgets,
	onOpenSettings,
	onCreateTransaction,
	onOpenTransactions,
	onSelectTransaction,
}) => {
	const { transactions, recurringTransactions, addTransaction } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryPathLabel } = useCategoriesContext();
	const { toast } = useToast();
	const { mainAccountId } = useMainAccountPreference();
	const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);
	const [digestPeriod, setDigestPeriod] = useState<DashboardDigestPeriod>(() =>
		loadDashboardDigestPeriod()
	);
	const handleDigestPeriodChange = useCallback((nextPeriod: DashboardDigestPeriod) => {
		setDigestPeriod(nextPeriod);
		saveDashboardDigestPeriod(nextPeriod);
	}, []);
	const summary = useMemo(
		() => calculateDashboardSummary(transactions, accounts, new Date(), digestPeriod),
		[accounts, digestPeriod, transactions]
	);
	const dueRecurringDrafts = useMemo(
		() => getDueRecurringDrafts(recurringTransactions, transactions, new Date()),
		[recurringTransactions, transactions]
	);
	const defaultAccountId = useMemo(() => {
		const mainAccount = accounts.find((account) => account.id === mainAccountId);
		return mainAccount?.id ?? accounts[0]?.id;
	}, [accounts, mainAccountId]);

	const handleConfirmRecurringDraft = async (
		draft: (typeof dueRecurringDrafts)[number]
	) => {
		const recurringTransaction = draft.recurringTransaction;
		const accountId = recurringTransaction.accountId ?? defaultAccountId;

		if (!recurringTransaction.id || !accountId) {
			toast({
				title: 'Account needed',
				description: 'Add an account to this recurring expense before confirming it.',
				variant: 'destructive',
			});
			return;
		}

		setConfirmingDraftId(recurringTransaction.id);
		try {
			await addTransaction({
				type: 'expense',
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
				title: 'Recurring expense confirmed',
				description: `${recurringTransaction.title} was added to today.`,
			});
		} catch (error) {
			toast({
				title: 'Could not confirm expense',
				description:
					error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive',
			});
		} finally {
			setConfirmingDraftId(null);
		}
	};

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
			<MotionReveal>
				<PageHeader
					title="Dashboard"
					subtitle={
						<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
							<span>
								Net worth <Currency amount={summary.netWorth} className="text-sm" />
							</span>
							<span>{summary.periodLabel}</span>
						</span>
					}
					actions={headerActions}
				/>
			</MotionReveal>

			<div className="space-y-8">
				<MotionReveal delay={0.06}>
						<MonthlyDigest
							summary={summary}
							period={digestPeriod}
							onPeriodChange={handleDigestPeriodChange}
							onOpenTransactions={onOpenTransactions}
						/>
				</MotionReveal>

				<MotionReveal delay={0.12}>
					<BudgetSummary
						onOpenBudgets={onOpenBudgets}
						onOpenTransactions={onOpenTransactions}
					/>
				</MotionReveal>

				<div className="grid gap-4 xl:grid-cols-2">
					<MotionReveal delay={0.18}>
						<RecentTransactionsPanel
							transactions={transactions}
							accounts={accounts}
							getCategoryPathLabel={getCategoryPathLabel}
							onSelect={onSelectTransaction}
							onOpenHistory={onOpenHistory}
						/>
					</MotionReveal>
					<MotionReveal delay={0.24}>
						<AccountBalanceStrip
							accounts={accounts}
							onOpenAccounts={onOpenAccounts}
						/>
					</MotionReveal>
				</div>

				{dueRecurringDrafts.length > 0 && (
					<MotionReveal delay={0.28}>
							<MarketingCard
								header={
									<div>
										<h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
											<FiRefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
											Due today
										</h2>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Confirm recurring expenses that should become transactions.
										</p>
									</div>
								}
							>
								<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
									{dueRecurringDrafts.map((draft) => {
										const recurringTransaction = draft.recurringTransaction;
										const account = accounts.find(
											(item) => item.id === recurringTransaction.accountId
										);
										return (
											<div
												key={recurringTransaction.id}
												className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/40"
											>
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
														{recurringTransaction.title}
													</p>
													<p className="truncate text-xs text-gray-500 dark:text-gray-400">
														{getCategoryPathLabel(
															recurringTransaction.category,
															recurringTransaction.subcategory
														)}
														{account ? ` • ${account.name}` : ''}
													</p>
													<Currency
														amount={recurringTransaction.amount}
														tone="balance-negative"
														className="mt-1 text-sm"
													/>
												</div>
												<Button
													type="button"
													variant="marketing"
													size="sm"
													onClick={() => handleConfirmRecurringDraft(draft)}
													disabled={confirmingDraftId === recurringTransaction.id}
												>
													<FiCheck className="mr-2 h-4 w-4" />
													Confirm
												</Button>
											</div>
										);
									})}
								</div>
							</MarketingCard>
					</MotionReveal>
				)}

				<MotionReveal delay={0.32} className="min-h-[28rem]">
					<AIChatbot variant="docked" alwaysDocked />
				</MotionReveal>
			</div>
		</PageShell>
	);
};

export default DashboardOverview;
