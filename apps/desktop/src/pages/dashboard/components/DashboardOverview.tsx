import React, { useCallback, useMemo, useState } from 'react';
import { FiCheck, FiEye, FiRefreshCw, FiSearch, FiSettings } from 'react-icons/fi';
import { getDueRecurringDrafts } from '@cash-flow/shared/recurring/dueRecurringDrafts';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import AIChatbot from '@/domains/ai/components/AIChatbot';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { Button } from '@/components/app/ui/button';
import { useToast } from '@/components/app/ui/use-toast';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import AccountBalanceStrip from '@/pages/dashboard/components/AccountBalanceStrip';
import MonthlyDigest from '@/pages/dashboard/components/MonthlyDigest';
import RecentTransactionsPanel from '@/pages/dashboard/components/RecentTransactionsPanel';
import { calculateDashboardSummary } from '@/pages/dashboard/utils/dashboardSummary';
import {
	DashboardDigestPeriod,
	loadDashboardDigestPeriod,
	saveDashboardDigestPeriod,
} from '@/pages/dashboard/utils/digestPeriod';

interface DashboardOverviewProps {
	onOpenAccounts: () => void;
	onOpenHistory: () => void;
	onOpenSettings: () => void;
	onSelectTransaction: (transaction: Transaction) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
	onOpenAccounts,
	onOpenHistory,
	onOpenSettings,
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
	const netWorthTone =
		summary.saved >= 0
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';

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

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-5 lg:px-6 xl:overflow-hidden xl:px-6">
				<header className="mb-3 flex flex-shrink-0 flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							CashFlow overview
						</p>
						<h1 className="mt-1 text-2xl font-semibold tracking-tight">
							Dashboard
						</h1>
						<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
							<span>Net worth {formatCurrency(summary.netWorth)}</span>
							<span className={netWorthTone}>
								{summary.saved >= 0 ? '+' : ''}
								{formatCurrency(summary.saved)} this period
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={onOpenHistory}
							aria-label="Search transactions"
						>
							<FiSearch className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={onOpenSettings}
							aria-label="Open dashboard settings"
						>
							<FiSettings className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={onOpenAccounts}
							aria-label="View accounts"
						>
							<FiEye className="h-4 w-4" />
						</Button>
					</div>
				</header>

				<div className="grid flex-1 gap-3 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
					<MonthlyDigest
						summary={summary}
						period={digestPeriod}
						onPeriodChange={handleDigestPeriodChange}
						compact
					/>

					{dueRecurringDrafts.length > 0 && (
						<section className="rounded-lg border bg-card p-3">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div>
									<h2 className="flex items-center gap-2 text-sm font-semibold">
										<FiRefreshCw className="h-4 w-4 text-primary" />
										Due today
									</h2>
									<p className="text-xs text-muted-foreground">
										Confirm recurring expenses that should become transactions.
									</p>
								</div>
							</div>
							<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
								{dueRecurringDrafts.map((draft) => {
									const recurringTransaction = draft.recurringTransaction;
									const account = accounts.find(
										(item) => item.id === recurringTransaction.accountId
									);
									return (
										<div
											key={recurringTransaction.id}
											className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
										>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold">
													{recurringTransaction.title}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{getCategoryPathLabel(
														recurringTransaction.category,
														recurringTransaction.subcategory
													)}
													{account ? ` • ${account.name}` : ''}
												</p>
												<p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
													{formatCurrency(recurringTransaction.amount)}
												</p>
											</div>
											<Button
												type="button"
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
						</section>
					)}

					<div className="grid gap-3 xl:min-h-0 xl:grid-cols-[minmax(280px,0.78fr)_minmax(360px,1fr)_minmax(320px,0.85fr)]">
						<AccountBalanceStrip
							accounts={accounts}
							onOpenAccounts={onOpenAccounts}
							compact
						/>
						<RecentTransactionsPanel
							transactions={transactions}
							accounts={accounts}
							getCategoryPathLabel={getCategoryPathLabel}
							onSelect={onSelectTransaction}
							onOpenHistory={onOpenHistory}
							compact
						/>
						<div className="min-h-[28rem] xl:min-h-0">
							<AIChatbot variant="docked" alwaysDocked />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardOverview;
