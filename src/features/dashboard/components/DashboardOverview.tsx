import React, { useCallback, useMemo, useState } from 'react';
import { FiEye, FiSearch, FiSettings } from 'react-icons/fi';
import AIChatbot from '@/features/ai/components/AIChatbot';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/features/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { Button } from '@/components/app/ui/button';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import AccountBalanceStrip from '@/features/dashboard/components/AccountBalanceStrip';
import MonthlyDigest from '@/features/dashboard/components/MonthlyDigest';
import QuickTransactionPanel from '@/features/dashboard/components/QuickTransactionPanel';
import RecentTransactionsPanel from '@/features/dashboard/components/RecentTransactionsPanel';
import { calculateDashboardSummary } from '@/features/dashboard/utils/dashboardSummary';
import {
	DashboardDigestPeriod,
	loadDashboardDigestPeriod,
	saveDashboardDigestPeriod,
} from '@/features/dashboard/utils/digestPeriod';

interface DashboardOverviewProps {
	onCreateAccount: () => void;
	onOpenAccounts: () => void;
	onOpenHistory: () => void;
	onOpenSettings: () => void;
	onSelectTransaction: (transaction: Transaction) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
	onCreateAccount,
	onOpenAccounts,
	onOpenHistory,
	onOpenSettings,
	onSelectTransaction,
}) => {
	const { transactions } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryPathLabel } = useCategoriesContext();
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
	const netWorthTone =
		summary.saved >= 0
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 md:px-6 lg:px-8 xl:overflow-hidden">
				<header className="mb-4 flex flex-shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
						<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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

				<div className="flex min-h-0 flex-1 flex-col gap-4">
					<MonthlyDigest
						summary={summary}
						period={digestPeriod}
						onPeriodChange={handleDigestPeriodChange}
					/>

					<div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)_minmax(320px,0.9fr)]">
						<RecentTransactionsPanel
							transactions={transactions}
							accounts={accounts}
							getCategoryPathLabel={getCategoryPathLabel}
							onSelect={onSelectTransaction}
							onOpenHistory={onOpenHistory}
						/>
						<QuickTransactionPanel onCreateAccount={onCreateAccount} />
						<AIChatbot variant="docked" />
					</div>

					<div className="flex-shrink-0">
						<AccountBalanceStrip
							accounts={accounts}
							onOpenAccounts={onOpenAccounts}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardOverview;
