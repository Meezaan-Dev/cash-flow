import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	FiPlus,
	FiSettings,
	FiSearch,
	FiX,
	FiArrowUp,
	FiArrowDown,
	FiGrid,
	FiTarget,
	FiBarChart2,
	FiChevronDown,
	FiList,
	FiRefreshCw,
	FiChevronLeft,
	FiChevronRight,
} from 'react-icons/fi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Transaction, ViewType } from '@/types';
import logoDark from '@/assets/images/logos/cflow-transparent-dark.png';
import logoLight from '@/assets/images/logos/cflow-transparent-light.png';
import { useTheme } from '@/features/theme/context/ThemeContext';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/app/ui/avatar';
import { parseDbDate } from '@/utils/date';
import { formatCurrency } from '@/utils/formatCurrency';

interface SidebarProps {
	onCreate: () => void;
	onSelect: (tx: Transaction | null) => void;
	onDelete: (id: string) => void;
	selectedId: string | null;
	collapsed: boolean;
	toggleSidebar: () => void;
	onOpenSettings?: () => void;
	onOpenLogin?: () => void;
	onOpenHistory?: () => void;
	onViewChange: (view: ViewType) => void;
	activeView: ViewType;
}

interface NavItem {
	id: ViewType | 'history';
	label: string;
	icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', label: 'Dashboard', icon: FiGrid },
	{ id: 'history', label: 'All Transactions', icon: FiList },
	{ id: 'accounts', label: 'Accounts', icon: FiList },
	{ id: 'budgets', label: 'Budgets', icon: FiTarget },
	{ id: 'recurring', label: 'Recurring', icon: FiRefreshCw },
	{ id: 'reports', label: 'Reports', icon: FiBarChart2 },
];

const Sidebar: React.FC<SidebarProps> = ({
	onCreate,
	onSelect,
	onDelete,
	selectedId,
	collapsed,
	toggleSidebar,
	onOpenSettings,
	onOpenLogin,
	onOpenHistory,
	onViewChange,
	activeView,
}) => {
	const { currentUser } = useAuth();
	const { theme } = useTheme();
	const { transactions } = useTransactionsContext();
	const { accounts, calculateAvailableBalance, loading: accountsLoading } = useAccountsContext();
	const [searchTerm, setSearchTerm] = useState('');
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
	const [transactionsExpanded, setTransactionsExpanded] = useState(false);

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const logo = theme === 'dark' ? logoLight : logoDark;

	const availableBalance = calculateAvailableBalance();

	const hasNoAccounts = !accountsLoading && accounts.length === 0;

	const accountColorMap = useMemo(() => {
		const map: Record<string, string> = {};
		accounts.forEach((a) => {
			if (a.id) map[a.id] = a.color ?? '#6366f1';
		});
		return map;
	}, [accounts]);

	const handleCreateTransaction = useCallback(() => {
		onCreate();
		if (window.innerWidth < 768) toggleSidebar();
	}, [onCreate, toggleSidebar]);

	const handleViewClick = useCallback(
		(view: NavItem['id']) => {
			if (view === 'history') {
				onOpenHistory?.();
			} else {
				onViewChange(view);
			}
			if (window.innerWidth < 768) toggleSidebar();
		},
		[onOpenHistory, onViewChange, toggleSidebar]
	);

	const handleTransactionClick = useCallback(
		(tx: Transaction) => {
			onSelect(tx);
			if (window.innerWidth < 768) toggleSidebar();
		},
		[onSelect, toggleSidebar]
	);

	const sortedTransactions = useMemo(
		() =>
			[...transactions].sort((a, b) => {
				const dateA = parseDbDate(a.date ?? a.createdAt);
				const dateB = parseDbDate(b.date ?? b.createdAt);
				return dateB.getTime() - dateA.getTime();
			}),
		[transactions]
	);

	const filteredTransactions = useMemo(
		() =>
			sortedTransactions.filter((tx) =>
				tx.title.toLowerCase().includes(searchTerm.toLowerCase())
			),
		[sortedTransactions, searchTerm]
	);

	const groupedTransactions = useMemo(
		() =>
			filteredTransactions.reduce(
				(groups, tx) => {
					const date = parseDbDate(tx.date ?? tx.createdAt);
					const dateKey = date.toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					});
					if (!groups[dateKey]) groups[dateKey] = [];
					groups[dateKey].push(tx);
					return groups;
				},
				{} as Record<string, typeof filteredTransactions>
			),
		[filteredTransactions]
	);

	return (
		<>
			{/* Mobile backdrop */}
			{!collapsed && isMobile && (
				<div
					role="button"
					tabIndex={0}
					className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
					onClick={toggleSidebar}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleSidebar();
						}
						if (e.key === 'Escape') toggleSidebar();
					}}
					aria-label="Close sidebar"
				/>
			)}

			<aside
				aria-hidden={collapsed}
				className={`fixed left-0 top-0 z-40 h-screen-safe w-72 border-r bg-card transition-transform duration-300 ease-in-out md:relative md:z-auto md:transition-all ${
					collapsed
						? '-translate-x-full md:translate-x-0 md:w-0'
						: 'translate-x-0 md:w-72'
				}`}
			>
				<div
					className={`flex h-full flex-col transition-opacity duration-300 ${
						collapsed ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'
					}`}
				>
					{/* Header */}
					<div className="flex items-center justify-between border-b bg-muted/20 p-4">
						<div className="flex items-center gap-2 flex-1">
							<img
								src={logo}
								alt="CashFlow Logo"
								className="h-8 md:h-10 flex-shrink-0"
							/>
							<div className="flex-1 min-w-0">
								<h3 className="text-lg md:text-xl font-bold tracking-tight leading-tight">
									CashFlow
								</h3>
								{accounts.length > 0 && (
									<p className="mt-0.5 text-xs text-muted-foreground truncate">
										{formatCurrency(availableBalance)}
									</p>
								)}
							</div>
						</div>
						{!collapsed && (
							<>
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleSidebar}
									className="md:hidden flex-shrink-0"
									aria-label="Close sidebar"
								>
									<FiX className="h-5 w-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleSidebar}
									className="hidden md:inline-flex flex-shrink-0"
									aria-label="Collapse sidebar"
								>
									<FiChevronLeft className="h-5 w-5" />
								</Button>
							</>
						)}
					</div>

					{/* Navigation */}
					{!collapsed && (
						<>
							<div className="border-b p-3">
								<p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									App map
								</p>
								<div className="space-y-1">
									{NAV_ITEMS.map(({ id, label, icon: Icon }) => {
										const isActive =
											id === 'history'
												? activeView === 'table' || activeView === 'list'
												: activeView === id;
										return (
											<button
												key={id}
												onClick={() => handleViewClick(id)}
												className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
													isActive
														? 'bg-primary text-primary-foreground shadow-sm'
														: 'text-muted-foreground hover:bg-muted hover:text-foreground'
												}`}
											>
												<Icon className="h-4 w-4 flex-shrink-0" />
												<span>{label}</span>
											</button>
										);
									})}
								</div>
							</div>

							<div className="border-b p-3">
								<button
									type="button"
									onClick={() => setTransactionsExpanded((current) => !current)}
									className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									aria-expanded={transactionsExpanded}
									aria-controls="sidebar-transactions"
								>
									<span className="flex items-center gap-3">
										<FiList className="h-4 w-4 flex-shrink-0" />
										<span>Sidebar transactions</span>
									</span>
									<span className="flex items-center gap-2">
										<span className="text-xs">{transactions.length}</span>
										{transactionsExpanded ? (
											<FiChevronDown className="h-4 w-4" />
										) : (
											<FiChevronRight className="h-4 w-4" />
										)}
									</span>
								</button>
							</div>

							{/* Search */}
							{transactionsExpanded && (
								<div className="border-b p-3">
									<div className="relative">
										<FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											type="text"
											placeholder="Search transactions..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-9 pr-9 text-sm"
										/>
										{searchTerm && (
											<button
												onClick={() => setSearchTerm('')}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
												aria-label="Clear search"
											>
												<FiX className="h-4 w-4" />
											</button>
										)}
									</div>
								</div>
							)}
						</>
					)}

					{/* Transaction list */}
					<div
						id="sidebar-transactions"
						className="min-h-0 flex-1 overflow-hidden"
						hidden={!transactionsExpanded}
					>
						<div className="h-full overflow-y-auto p-2 scroll-smooth">
							{filteredTransactions.length > 0 ? (
								<div className="space-y-4">
									{Object.entries(groupedTransactions).map(([date, txs]) => (
										<div key={date} className="space-y-1">
											<div className="sticky top-0 z-10 bg-card/95 px-2 py-1 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
												{date}
											</div>
											<div className="space-y-1 pt-1">
												{txs.map((tx) => {
													const acctColor =
														accountColorMap[tx.accountId] ?? '#6366f1';
													return (
														<div
															key={tx.id}
															onClick={() =>
																handleTransactionClick(tx)
															}
															onKeyDown={(e) => {
																if (
																	e.key === 'Enter' ||
																	e.key === ' '
																)
																	handleTransactionClick(tx);
															}}
															role="button"
															tabIndex={0}
															className={`group flex cursor-pointer items-center justify-between rounded-lg border p-2 md:p-3 transition-colors ${
																selectedId === tx.id
																	? 'border-primary bg-primary/10'
																	: 'border-transparent bg-background hover:border-border hover:bg-muted'
															}`}
														>
															<div className="flex items-center gap-2 flex-1 min-w-0">
																<span
																	className="h-2 w-2 rounded-full flex-shrink-0"
																	style={{
																		backgroundColor: acctColor,
																	}}
																/>
																<div className="flex-1 min-w-0">
																	<h4 className="truncate font-medium text-sm md:text-base">
																		{tx.title}
																	</h4>
																	<div className="mt-0.5 flex items-center gap-1 text-xs">
																		<span
																			className={`font-medium ${
																				tx.type === 'income'
																					? 'text-green-600 dark:text-green-400'
																					: tx.type ===
																						  'transfer'
																						? 'text-blue-500'
																						: 'text-red-600 dark:text-red-400'
																			}`}
																		>
																			{tx.type === 'income' ? (
																				<FiArrowUp className="inline h-3 w-3" />
																			) : tx.type ===
																			  'transfer' ? (
																				<span>&#8644;</span>
																			) : (
																				<FiArrowDown className="inline h-3 w-3" />
																			)}
																			{' '}
																			{formatCurrency(
																				tx.amount
																			)}
																		</span>
																	</div>
																</div>
															</div>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	if (tx.id) onDelete(tx.id);
																}}
																className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
																aria-label="Delete transaction"
															>
																<FiX className="h-4 w-4 text-muted-foreground hover:text-destructive" />
															</button>
														</div>
													);
												})}
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="py-8 text-center text-xs md:text-sm text-muted-foreground">
									{searchTerm
										? 'No matching transactions'
										: hasNoAccounts
											? 'Create an account to begin tracking transactions'
											: 'No transactions yet'}
								</div>
							)}
						</div>
					</div>
					{!transactionsExpanded && <div className="flex-1" />}

					{/* New Transaction Button */}
					{!collapsed && (
						<div className="border-t p-3">
							<Button
								onClick={handleCreateTransaction}
								className="h-10 w-full text-sm md:text-base"
							>
								<FiPlus className="mr-2 h-4 w-4" />
								{hasNoAccounts ? 'Add First Account' : 'New Transaction'}
							</Button>
						</div>
					)}

					{/* User Section */}
					<div className="border-t bg-muted/20 p-3">
						{currentUser ? (
							<button
								onClick={() => {
									onOpenSettings?.();
									if (window.innerWidth < 768) toggleSidebar();
								}}
								className="flex w-full items-center gap-3 rounded-lg border bg-background p-2 text-left transition-colors hover:bg-muted"
							>
								<Avatar className="h-8 w-8 flex-shrink-0">
									{currentUser.photoURL && (
										<AvatarImage
											src={currentUser.photoURL}
											alt="User"
										/>
									)}
									<AvatarFallback className="bg-primary text-primary-foreground text-xs">
										{currentUser.email?.[0]?.toUpperCase() ?? '?'}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="truncate text-sm font-medium">
										{currentUser.displayName ||
											currentUser.email ||
											'User'}
									</p>
								</div>
								<FiSettings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
							</button>
						) : (
							<Button
								onClick={() => onOpenLogin?.()}
								className="w-full text-sm md:text-base h-9 md:h-10"
							>
								Login
							</Button>
						)}
					</div>
				</div>
			</aside>
		</>
	);
};

export default Sidebar;
