import React, { useState, useCallback, useEffect } from 'react';
import {
	FiBarChart2,
	FiCreditCard,
	FiList,
	FiMenu,
	FiPlus,
	FiRefreshCw,
	FiTarget,
} from 'react-icons/fi';
import { useTransactionsContext } from '../context/TransactionsContext';
import { useAccountsContext } from '../context/AccountsContext';
import { Transaction, ViewType } from '../types';
import Sidebar from '../components/app/Sidebar';
import SettingsModal from '../components/app/SettingsModal';
import TransactionForm from '../views/Transactions/TransactionForm';
import TransactionsTable from '../views/Transactions/TransactionsTable';
import TransactionsList from '../views/Transactions/TransactionsList';
import AccountsList from '../views/Accounts/AccountsList';
import TransferForm from '../views/Accounts/TransferForm';
import ReconcileForm from '../views/Accounts/ReconcileForm';
import BudgetsList from '../views/Budgets/BudgetsList';
import ReportsView from '../views/Reports/ReportsView';
import RecurringTransactionsView from '../views/RecurringTransactions/RecurringTransactionsView';
import AuthModals from '../components/app/AuthModals';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../components/app/ui/dialog';
import { Button } from '../components/app/ui/button';
import HelpTip from '../components/app/ui/help-tip';
import { useToast } from '../components/app/ui/use-toast';
import { Toaster } from '../components/app/ui/toaster';
import {
	exportTransactionsToCsv,
	exportTransactionsToJson,
	importTransactionsFromFile,
} from '../utils/transactionImportExport';

const Dashboard: React.FC = () => {
	const { transactions, addTransaction, deleteTransaction } = useTransactionsContext();
	const { accounts, loading: accountsLoading } = useAccountsContext();
	const { toast } = useToast();

	const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
	const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
	const [sidebarVisible, setSidebarVisible] = useState(true);
	const [activeView, setActiveView] = useState<ViewType>('dashboard');
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'data' | 'filters'>('general');
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	React.useEffect(() => {
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

	const handleCreateAccount = useCallback(() => {
		setSelectedTx(null);
		setSelectedTransactionId(null);
		setActiveView('accounts');
	}, []);

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
		setActiveView('dashboard');
	};

	const toggleSidebar = () => setSidebarVisible((prev) => !prev);

	const handleOpenSettings = (tab: 'general' | 'data' | 'filters' = 'general') => {
		setSettingsInitialTab(tab);
		setSettingsOpen(true);
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
		setActiveView(isMobile ? 'list' : 'table');
	}, [handleCreate, isMobile, toast, transactions.length]);

	const handleViewChange = (view: ViewType) => {
		// If switching away from transaction detail, clear selection
		if (view !== 'transaction') {
			setSelectedTx(null);
			setSelectedTransactionId(null);
		}
		setActiveView(view);
	};

	const renderMainContent = () => {
		const hasAccounts = accounts.length > 0;
		const hasTransactions = transactions.length > 0;
		const primaryAction = accountsLoading
			? {
					title: 'Checking accounts',
					description: 'Loading your account data',
					onClick: handleCreate,
					icon: FiCreditCard,
					disabled: true,
				}
			: hasAccounts
			? {
					title: 'New transaction',
					description: 'Track income, expense, or a transfer',
					onClick: handleCreate,
					icon: FiPlus,
					disabled: false,
				}
			: {
					title: 'Create your first account',
					description: 'Add a bank, cash, savings, or credit account',
					onClick: handleCreateAccount,
					icon: FiCreditCard,
					disabled: false,
				};
		const PrimaryIcon = primaryAction.icon;

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
				return <ReportsView />;
			default:
				return (
					<div className="flex flex-1 items-center justify-center px-4 py-8 md:px-6">
						<div className="w-full max-w-5xl text-center">
							<div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
								<span className="text-primary text-lg">&#10022;</span>
							</div>
							<h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
								CashFlow
							</h1>
							<div className="mx-auto mb-8 flex max-w-xl items-center justify-center gap-2 text-muted-foreground">
								<p>
									{hasAccounts
										? 'Keep the basics close.'
										: accountsLoading
											? 'Loading your accounts.'
										: 'Start with one account.'}
								</p>
								<HelpTip
									label={
										hasAccounts
											? 'Add activity, review balances, then explore budgets, recurring transactions, and reports when they become useful.'
											: accountsLoading
												? 'CashFlow is checking for existing accounts before showing first-run guidance.'
											: 'After one account exists, transactions, history, and budgets will make sense right away.'
									}
								/>
							</div>
							<div className="mb-6">
								<Button
									size="lg"
									onClick={primaryAction.onClick}
									disabled={primaryAction.disabled}
									className="w-full h-14 rounded-2xl px-6 text-left flex items-center justify-between"
								>
									<div className="flex items-center gap-3">
										<PrimaryIcon className="h-5 w-5 flex-shrink-0" />
										<div>
											<div className="font-medium">{primaryAction.title}</div>
											<div className="text-sm text-primary-foreground/80">
												{primaryAction.description}
											</div>
										</div>
									</div>
									<span className="text-lg">&#8594;</span>
								</Button>
							</div>

							<div className="mb-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
								<div className="rounded-2xl border bg-background p-4">
									<div className="mb-2 flex items-center gap-2">
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
											1
										</span>
										<span className="font-medium">Accounts</span>
										<HelpTip label="Accounts are the foundation. Create one before adding income, expenses, transfers, or imports." />
									</div>
									<p className="text-sm text-muted-foreground">
										Add the places your money lives.
									</p>
								</div>
								<div
									className={`rounded-2xl border bg-background p-4 ${
										hasAccounts || accountsLoading ? '' : 'opacity-70'
									}`}
								>
									<div className="mb-2 flex items-center gap-2">
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
											2
										</span>
										<span className="font-medium">Transactions</span>
										<HelpTip label="Transactions update account balances automatically, so they become useful once an account exists." />
									</div>
									<p className="text-sm text-muted-foreground">
										Log income, spending, and transfers.
									</p>
								</div>
								<div
									className={`rounded-2xl border bg-background p-4 ${
										hasTransactions ? '' : 'opacity-70'
									}`}
								>
									<div className="mb-2 flex items-center gap-2">
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
											3
										</span>
										<span className="font-medium">Review</span>
										<HelpTip label="History, budgets, and reports are most helpful after at least one transaction has been added." />
									</div>
									<p className="text-sm text-muted-foreground">
										Check history, budgets, and reports.
									</p>
								</div>
							</div>

							{hasAccounts && (
								<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
									<button
										onClick={() => setActiveView('accounts')}
										className="rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/50"
									>
										<div className="flex items-center gap-2 mb-1">
											<FiCreditCard className="h-4 w-4" />
											<span className="font-medium">Accounts</span>
										</div>
										<div className="text-sm text-muted-foreground">
											{accounts.length} ready
										</div>
										<p className="text-sm text-muted-foreground">
											Manage balances
										</p>
									</button>
									<button
										onClick={() => setActiveView('budgets')}
										title="Optional: use budgets once you want a spending plan."
										className="rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/50"
									>
										<div className="flex items-center gap-2 mb-1">
											<FiTarget className="h-4 w-4" />
											<span className="font-medium">Budgets</span>
										</div>
										<p className="text-sm text-muted-foreground">
											Optional spending plan
										</p>
									</button>
									<button
										onClick={handleOpenHistory}
										title={
											hasTransactions
												? 'Review all transactions.'
												: 'Add one transaction first so history has something to show.'
										}
										className="rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/50"
									>
										<div className="flex items-center gap-2 mb-1">
											<FiList className="h-4 w-4" />
											<span className="font-medium">History</span>
										</div>
										<p className="text-sm text-muted-foreground">
											{hasTransactions ? 'All transactions' : 'Ready after your first entry'}
										</p>
									</button>
									<button
										onClick={() => setActiveView('recurring')}
										title="Optional: save repeat income or expenses as templates."
										className="rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/50"
									>
										<div className="flex items-center gap-2 mb-1">
											<FiRefreshCw className="h-4 w-4" />
											<span className="font-medium">Recurring</span>
										</div>
										<p className="text-sm text-muted-foreground">
											Optional templates
										</p>
									</button>
								</div>
							)}
							{hasTransactions && (
								<button
									onClick={() => setActiveView('reports')}
									className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									<FiBarChart2 className="h-4 w-4" />
									View reports when you want a bigger picture
								</button>
							)}
						</div>
					</div>
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
				onClose={() => setSettingsOpen(false)}
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
