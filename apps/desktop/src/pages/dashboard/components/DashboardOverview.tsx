import React, { useMemo, useState } from 'react';
import { FiPlus, FiSettings } from 'react-icons/fi';
import {
	getUpcomingRecurringDrafts,
	type DueRecurringDraft,
} from '@cash-flow/shared/recurring/dueRecurringDrafts';
import { useMainAccountPreference } from '@cash-flow/shared/accounts/mainAccountPreference';
import { calculateNetWorth } from '@cash-flow/shared/accounts/AccountModel';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import Currency from '@/components/marketing/Currency';
import MotionReveal from '@/components/marketing/MotionReveal';
import { PageHeader, PageShell } from '@/components/app/page-layout';
import { Button } from '@/components/app/ui/button';
import { useToast } from '@/components/app/ui/use-toast';
import { Transaction } from '@/types';
import RecentTransactionsPanel from '@/pages/dashboard/components/RecentTransactionsPanel';
import BudgetSummary from '@/pages/dashboard/components/BudgetSummary';
import UpcomingRecurringPreview from '@/pages/dashboard/components/UpcomingRecurringPreview';
import { TransactionFilterDescriptor } from '@/shared/filters/utils/transactionFilters';

interface DashboardOverviewProps {
	onOpenHistory: () => void;
	onOpenBudgets: () => void;
	onOpenSettings: () => void;
	onCreateTransaction: () => void;
	onOpenTransactions: (filters: TransactionFilterDescriptor) => void;
	onSelectTransaction: (transaction: Transaction) => void;
	onEditRecurringDraft: (draft: DueRecurringDraft) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
	onOpenHistory,
	onOpenBudgets,
	onOpenSettings,
	onCreateTransaction,
	onOpenTransactions,
	onSelectTransaction,
	onEditRecurringDraft,
}) => {
	const { transactions, recurringTransactions, addTransaction } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { getCategoryPathLabel } = useCategoriesContext();
	const { toast } = useToast();
	const { mainAccountId } = useMainAccountPreference();
	const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);
	const netWorth = useMemo(() => calculateNetWorth(accounts).netWorth, [accounts]);
	const upcomingRecurringDrafts = useMemo(
		() => getUpcomingRecurringDrafts(recurringTransactions, transactions, new Date(), 7),
		[recurringTransactions, transactions]
	);
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

		if (!recurringTransaction.id || !accountId) {
			toast({
				title: 'Account needed',
				description: 'Add an account to this recurring expense before confirming it.',
				variant: 'destructive',
			});
			return;
		}

		setConfirmingDraftId(confirmKey);
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
				description: `${recurringTransaction.title} was added for ${draft.occurrenceDate.toLocaleDateString('en-ZA')}.`,
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
						<span>
							Net worth <Currency amount={netWorth} className="text-sm" />
						</span>
					}
					actions={headerActions}
				/>
			</MotionReveal>

			<div className="space-y-8">
				<MotionReveal delay={0.06}>
					<UpcomingRecurringPreview
						drafts={upcomingRecurringDrafts}
						accounts={accounts}
						confirmingDraftId={confirmingDraftId}
						onConfirm={handleConfirmRecurringDraft}
						onEdit={onEditRecurringDraft}
					/>
				</MotionReveal>

				<MotionReveal delay={0.12}>
					<RecentTransactionsPanel
						transactions={transactions}
						accounts={accounts}
						getCategoryPathLabel={getCategoryPathLabel}
						onSelect={onSelectTransaction}
						onOpenHistory={onOpenHistory}
						limit={10}
					/>
				</MotionReveal>

				<MotionReveal delay={0.18}>
					<BudgetSummary
						onOpenBudgets={onOpenBudgets}
						onOpenTransactions={onOpenTransactions}
					/>
				</MotionReveal>
			</div>
		</PageShell>
	);
};

export default DashboardOverview;
