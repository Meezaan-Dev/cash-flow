import React, { useState, useCallback, useEffect } from 'react';
import { FiMenu } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { Transaction, ViewType } from '@/types';
import DashboardOverview from '@/features/dashboard/components/DashboardOverview';
import Sidebar from '@/features/dashboard/components/Sidebar';
import SettingsModal from '@/features/dashboard/components/SettingsModal';
import TransactionForm from '@/features/transactions/views/TransactionForm';
import TransactionsTable from '@/features/transactions/views/TransactionsTable';
import TransactionsList from '@/features/transactions/views/TransactionsList';
import AccountsList from '@/features/accounts/views/AccountsList';
import TransferForm from '@/features/accounts/views/TransferForm';
import ReconcileForm from '@/features/accounts/views/ReconcileForm';
import BudgetsList from '@/features/budgets/views/BudgetsList';
import ReportsView from '@/features/reports/views/ReportsView';
import RecurringTransactionsView from '@/features/recurring/views/RecurringTransactionsView';
import AuthModals from '@/features/auth/components/AuthModals';
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
} from '@/features/transactions/utils/transactionImportExport';

const routeToView = (pathname: string, isMobile: boolean): ViewType => {
	if (pathname.startsWith('/dashboard/transactions')) return isMobile ? 'list' : 'table';
	if (pathname.startsWith('/dashboard/accounts')) return 'accounts';
	if (pathname.startsWith('/dashboard/budgets')) return 'budgets';
	if (pathname.startsWith('/dashboard/recurring')) return 'recurring';
	if (pathname.startsWith('/dashboard/reports')) return 'reports';
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
			} catch {
				toast({
					title: 'Error',
					description: 'Failed to delete transaction. Please try again.',
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
					/>
				);
			case 'table':
				return (
					<TransactionsTable
						onDelete={handleDeleteClick}
						onSelect={handleSelect}
						selectedId={selectedTransactionId}
						onOpenSettings={() => handleOpenSettings('filters')}
					/>
				);
			case 'list':
				return (
					<TransactionsList
						onSelect={handleSelect}
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
			default:
				return (
					<DashboardOverview
						onOpenAccounts={() => setActiveView('accounts')}
						onOpenHistory={handleOpenHistory}
						onOpenSettings={() => handleOpenSettings('general')}
						onSelectTransaction={handleSelect}
					/>
				);
		}
	};

	return (
		<div className="flex h-screen-safe flex-col md:flex-row bg-background">
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
				<DialogContent className="w-[90vw] md:w-full rounded-lg">
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
							description:
								e instanceof Error ? e.message : 'Failed to import file.',
							variant: 'destructive',
						});
					}
				}}
				onExportCSV={() => {
					const csv = exportTransactionsToCsv(transactions);
					const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = 'transactions.csv';
					document.body.appendChild(a);
					a.click();
					a.remove();
					URL.revokeObjectURL(url);
					toast({ title: 'Export successful', description: 'Transactions exported to CSV' });
				}}
				onExportJSON={() => {
					const json = exportTransactionsToJson(transactions);
					const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = 'transactions.json';
					document.body.appendChild(a);
					a.click();
					a.remove();
					URL.revokeObjectURL(url);
					toast({
						title: 'Export successful',
						description: 'Transactions exported to JSON',
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
				className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto transition-all duration-300 ease-in-out h-screen-safe md:h-auto ${sidebarVisible ? 'md:ml-8' : 'md:ml-0'
					} ${!sidebarVisible ? 'pt-[4.5rem]' : ''}`}
			>
				{!sidebarVisible && (
					<Button
						variant="outline"
						className="absolute left-4 top-4 z-50 shadow-sm"
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
