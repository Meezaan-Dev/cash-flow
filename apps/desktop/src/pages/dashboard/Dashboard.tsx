import React, { useState, useCallback, useEffect } from 'react';
import { FiMenu } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Transaction, ViewType } from '@/types';
import DashboardOverview from '@/pages/dashboard/components/DashboardOverview';
import Sidebar from '@/pages/dashboard/components/Sidebar';
import SettingsModal from '@/pages/dashboard/components/SettingsModal';
import TransactionForm from '@/domains/transactions/views/TransactionForm';
import TransactionsTable from '@/domains/transactions/views/TransactionsTable';
import AccountsList from '@/domains/accounts/views/AccountsList';
import TransferForm from '@/domains/accounts/views/TransferForm';
import ReconcileForm from '@/domains/accounts/views/ReconcileForm';
import BudgetsList from '@/domains/budgets/views/BudgetsList';
import ReportsView from '@/domains/reports/views/ReportsView';
import RecurringTransactionsView from '@/domains/recurring/views/RecurringTransactionsView';
import AIChatbot from '@/domains/ai/components/AIChatbot';
import AuthModals from '@/domains/auth/components/AuthModals';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { Button } from '@/components/app/ui/button';
import { useToast } from '@/components/app/ui/use-toast';
import { Toaster } from '@/components/app/ui/toaster';
import {
	exportTransactionsToCsv,
	exportTransactionsToJson,
	importTransactionsFromFile,
} from '@/domains/transactions/utils/transactionImportExport';
import { frostedPanel, modalShell, pageBg } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import {
	TransactionFilterDescriptor,
	transactionFiltersToSearch,
} from '@/shared/filters/utils/transactionFilters';
import { getAppErrorMessage } from '@cash-flow/shared/errors';

const routeToView = (pathname: string, isMobile: boolean): ViewType => {
	if (pathname.startsWith('/dashboard/transactions')) return isMobile ? 'list' : 'table';
	if (pathname.startsWith('/dashboard/accounts')) return 'accounts';
	if (pathname.startsWith('/dashboard/budgets')) return 'budgets';
	if (pathname.startsWith('/dashboard/recurring')) return 'recurring';
	if (pathname.startsWith('/dashboard/reports')) return 'reports';
	if (pathname.startsWith('/dashboard/assistant')) return 'assistant';
	return 'dashboard';
};

const viewToRoute = (view: ViewType): string => {
	switch (view) {
		case 'table':
		case 'list':
			return '/dashboard/transactions';
		case 'accounts':
			return '/dashboard/accounts';
		case 'budgets':
			return '/dashboard/budgets';
		case 'recurring':
			return '/dashboard/recurring';
		case 'reports':
			return '/dashboard/reports';
		case 'assistant':
			return '/dashboard/assistant';
		default:
			return '/dashboard';
	}
};

const Dashboard: React.FC = () => {
	const { transactions, addTransaction, deleteTransaction } = useTransactionsContext();
	const { accounts, loading: accountsLoading } = useAccountsContext();
	const { toast } = useToast();
	const location = useLocation();
	const navigate = useNavigate();

	const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
	const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
	const [sidebarVisible, setSidebarVisible] = useState(true);
	const [activeView, setActiveView] = useState<ViewType>(() =>
		routeToView(location.pathname, window.innerWidth < 768)
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'data' | 'filters'>('general');
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const handleResize = () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => setIsMobile(window.innerWidth < 768), 150);
		};
		window.addEventListener('resize', handleResize);
		return () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	useEffect(() => {
		if (location.pathname.startsWith('/dashboard/settings')) {
			setActiveView('dashboard');
			setSettingsOpen(true);
			return;
		}

		const nextView = routeToView(location.pathname, isMobile);
		setActiveView(nextView);
		setSelectedTx(null);
		setSelectedTransactionId(null);
	}, [isMobile, location.pathname]);

	const handleCreateAccount = useCallback(() => {
		setSelectedTx(null);
		setSelectedTransactionId(null);
		navigate('/dashboard/accounts');
	}, [navigate]);

	const handleCreate = useCallback(() => {
		if (accountsLoading) {
			toast({
				title: 'Checking accounts',
				description: 'Account data is still loading. Try again in a moment.',
			});
			return;
		}

		if (accounts.length === 0) {
			handleCreateAccount();
			toast({
				title: 'Start with an account',
				description: 'Create one account first so transactions have a place to land.',
			});
			return;
		}
			setSelectedTx(null);
			setSelectedTransactionId(null);
			setActiveView('transaction');
	}, [accounts.length, accountsLoading, handleCreateAccount, toast]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() !== 'k') return;
			if (!e.ctrlKey && !e.metaKey) return;
			const target = e.target as HTMLElement | null;
			if (target?.closest('input, textarea, [contenteditable="true"]')) return;
			e.preventDefault();
			handleCreate();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [handleCreate]);

	const handleSelect = (tx: Transaction | null) => {
		if (tx) {
			setSelectedTx(tx);
			setSelectedTransactionId(tx.id ?? null);
			setActiveView('transaction');
		} else {
			setSelectedTx(null);
			setSelectedTransactionId(null);
			setActiveView('dashboard');
			navigate('/dashboard');
		}
	};

	const handleDeleteClick = (id: string) => {
		setTransactionToDelete(id);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (transactionToDelete) {
			try {
				await deleteTransaction(transactionToDelete);
				if (selectedTransactionId === transactionToDelete) {
					setSelectedTx(null);
					setSelectedTransactionId(null);
				}
				toast({ title: 'Success', description: 'Transaction deleted successfully' });
			} catch (error) {
				toast({
					title: 'Transaction was not deleted',
					description: getAppErrorMessage(error, { operation: 'Delete transaction' }),
					variant: 'destructive',
				});
			}
		}
		setDeleteDialogOpen(false);
		setTransactionToDelete(null);
	};

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setTransactionToDelete(null);
	};

	const handleCloseForm = () => {
		setSelectedTx(null);
		setSelectedTransactionId(null);
		setActiveView('dashboard');
		navigate('/dashboard');
	};

	const toggleSidebar = () => setSidebarVisible((prev) => !prev);

	const handleOpenSettings = (tab: 'general' | 'data' | 'filters' = 'general') => {
		setSettingsInitialTab(tab);
		setSettingsOpen(true);
		navigate('/dashboard/settings');
	};

	const handleOpenHistory = useCallback(() => {
		if (transactions.length === 0) {
			toast({
				title: 'Nothing to review yet',
				description: 'Add your first transaction and history will start filling in.',
			});
			handleCreate();
			return;
		}
		navigate('/dashboard/transactions');
	}, [handleCreate, navigate, toast, transactions.length]);

	const handleOpenTransactions = useCallback(
		(filters: TransactionFilterDescriptor = {}) => {
			navigate(`/dashboard/transactions${transactionFiltersToSearch(filters)}`);
		},
		[navigate]
	);

	const handleViewChange = (view: ViewType) => {
		// If switching away from transaction detail, clear selection
		if (view !== 'transaction') {
			setSelectedTx(null);
			setSelectedTransactionId(null);
		}
		if (view === 'transaction' || view === 'transfer' || view === 'reconcile') {
			setActiveView(view);
			return;
		}
		setActiveView(view);
		navigate(viewToRoute(view));
	};

	const handleCloseSettings = () => {
		setSettingsOpen(false);
		if (location.pathname.startsWith('/dashboard/settings')) {
			navigate('/dashboard');
		}
	};

	const renderMainContent = () => {
		switch (activeView) {
			case 'transaction':
				return (
					<TransactionForm
						transaction={selectedTx || undefined}
						onClose={handleCloseForm}
						onSuccess={(message) =>
							toast({
								title: selectedTx ? 'Transaction updated' : 'Transaction created',
								description: message,
								duration: 3500,
							})
						}
					/>
				);
			case 'table':
			case 'list':
				return (
					<TransactionsTable
						onDelete={handleDeleteClick}
						onSelect={handleSelect}
						onCreate={handleCreate}
						selectedId={selectedTransactionId}
						onOpenSettings={() => handleOpenSettings('filters')}
					/>
				);
			case 'accounts':
				return <AccountsList />;
			case 'transfer':
				return <TransferForm onClose={() => setActiveView('accounts')} />;
			case 'reconcile':
				return <ReconcileForm onClose={() => setActiveView('accounts')} />;
			case 'budgets':
				return <BudgetsList />;
			case 'recurring':
				return <RecurringTransactionsView onOpenSettings={() => handleOpenSettings('filters')} />;
			case 'reports':
				return <ReportsView onOpenSettings={() => handleOpenSettings('filters')} />;
			case 'assistant':
				return <AIChatbot />;
			default:
				return (
					<DashboardOverview
						onOpenAccounts={() => navigate('/dashboard/accounts')}
						onOpenHistory={handleOpenHistory}
						onOpenBudgets={() => navigate('/dashboard/budgets')}
						onOpenSettings={() => handleOpenSettings('general')}
						onCreateTransaction={handleCreate}
						onOpenTransactions={handleOpenTransactions}
						onSelectTransaction={handleSelect}
					/>
				);
		}
	};

	return (
		<div className={cn('flex h-screen-safe flex-col md:flex-row', pageBg)}>
			<Toaster />
			<Sidebar
				collapsed={!sidebarVisible}
				toggleSidebar={toggleSidebar}
				onCreate={handleCreate}
				onSelect={handleSelect}
				onDelete={handleDeleteClick}
				selectedId={selectedTransactionId}
				activeView={activeView}
				onViewChange={handleViewChange}
				onOpenLogin={() => setAuthModalOpen(true)}
				onOpenSettings={() => handleOpenSettings('general')}
				onOpenHistory={handleOpenHistory}
				onOpenMobisite={() => navigate('/mobisite')}
			/>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className={cn('w-[90vw] md:w-full', modalShell)}>
					<DialogHeader>
						<DialogTitle>Confirm Deletion</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this transaction? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={handleCancelDelete}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<SettingsModal
				open={settingsOpen}
				onClose={handleCloseSettings}
				initialTab={settingsInitialTab}
				onImport={async (file) => {
					if (accountsLoading) {
						toast({
							title: 'Checking accounts',
							description: 'Account data is still loading. Try again in a moment.',
						});
						return;
					}

					if (accounts.length === 0) {
						toast({
							title: 'Import unavailable',
							description: 'Create an account before importing transactions.',
							variant: 'destructive',
						});
						return;
					}

					try {
						const result = await importTransactionsFromFile(
							file,
							transactions,
							addTransaction,
							accounts[0].id ?? ''
						);
						if (result.errors.length) {
							toast({
								title: 'Import completed with errors',
								description: `Imported ${result.importedCount}, skipped ${result.skippedDuplicates}. Errors: ${result.errors
									.slice(0, 3)
									.join('; ')}${result.errors.length > 3 ? '...' : ''}`,
								variant: 'destructive',
							});
						} else {
							toast({
								title: 'Import successful',
								description: `Imported ${result.importedCount}, skipped ${result.skippedDuplicates}.`,
							});
						}
					} catch (e: unknown) {
						toast({
							title: 'Import failed',
							description: getAppErrorMessage(e, { operation: 'Import transactions' }),
							variant: 'destructive',
						});
					}
				}}
				onExport={(format, filteredTransactions) => {
					const content = format === 'csv'
						? exportTransactionsToCsv(filteredTransactions)
						: exportTransactionsToJson(filteredTransactions);
					const mimeType = format === 'csv'
						? 'text/csv;charset=utf-8'
						: 'application/json;charset=utf-8';
					const blob = new Blob([content], { type: mimeType });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `transactions-${new Date().toISOString().slice(0, 10)}.${format}`;
					document.body.appendChild(a);
					a.click();
					a.remove();
					URL.revokeObjectURL(url);
					toast({
						title: 'Export successful',
						description: `${filteredTransactions.length} transactions exported to ${format.toUpperCase()}`,
					});
				}}
			/>

			<AuthModals
				open={authModalOpen}
				onClose={() => setAuthModalOpen(false)}
				mode={authMode}
				onModeChange={setAuthMode}
			/>

			<div
				className={`relative flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out h-screen-safe md:h-auto ${sidebarVisible ? 'md:ml-8' : 'md:ml-0'
					} ${!sidebarVisible ? 'pt-[4.5rem]' : ''}`}
			>
				{!sidebarVisible && (
					<Button
						variant="outline"
						className={cn(
							'absolute left-4 top-4 z-50 rounded-full shadow-sm',
							frostedPanel
						)}
						onClick={toggleSidebar}
						aria-label="Open menu"
					>
						<FiMenu className="mr-2 h-4 w-4" />
						Menu
					</Button>
				)}

				{renderMainContent()}
			</div>
		</div>
	);
};

export default Dashboard;
