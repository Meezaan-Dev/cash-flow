import React, { useCallback, useEffect, useState } from 'react';
import {
	FiBarChart2,
	FiChevronLeft,
	FiGrid,
	FiList,
	FiPlus,
	FiRefreshCw,
	FiSettings,
	FiSmartphone,
	FiTarget,
	FiX,
} from 'react-icons/fi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Transaction, ViewType } from '@/types';
import logoDark from '@/assets/images/logos/cflow-transparent-dark.png';
import logoLight from '@/assets/images/logos/cflow-transparent-light.png';
import { useTheme } from '@/features/theme/context/ThemeContext';
import { useAccountsContext } from '@/features/accounts/context/AccountsContext';
import { Button } from '@/components/app/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/app/ui/avatar';
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
	onOpenMobisite?: () => void;
	onViewChange: (view: ViewType) => void;
	activeView: ViewType;
}

interface NavItem {
	id: ViewType | 'history' | 'mobisite';
	label: string;
	icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', label: 'Dashboard', icon: FiGrid },
	{ id: 'history', label: 'Transactions', icon: FiList },
	{ id: 'accounts', label: 'Accounts', icon: FiList },
	{ id: 'budgets', label: 'Budgets', icon: FiTarget },
	{ id: 'recurring', label: 'Recurring', icon: FiRefreshCw },
	{ id: 'reports', label: 'Reports', icon: FiBarChart2 },
	{ id: 'mobisite', label: 'View Mobisite', icon: FiSmartphone },
];

const Sidebar: React.FC<SidebarProps> = ({
	onCreate,
	collapsed,
	toggleSidebar,
	onOpenSettings,
	onOpenLogin,
	onOpenHistory,
	onOpenMobisite,
	onViewChange,
	activeView,
}) => {
	const { currentUser } = useAuth();
	const { theme } = useTheme();
	const { accounts, calculateAvailableBalance, loading: accountsLoading } = useAccountsContext();
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const logo = theme === 'dark' ? logoLight : logoDark;
	const availableBalance = calculateAvailableBalance();
	const hasNoAccounts = !accountsLoading && accounts.length === 0;

	const handleCreateTransaction = useCallback(() => {
		onCreate();
		if (window.innerWidth < 768) toggleSidebar();
	}, [onCreate, toggleSidebar]);

	const handleViewClick = useCallback(
		(view: NavItem['id']) => {
			if (view === 'history') {
				onOpenHistory?.();
			} else if (view === 'mobisite') {
				onOpenMobisite?.();
			} else {
				onViewChange(view);
			}
			if (window.innerWidth < 768) toggleSidebar();
		},
		[onOpenHistory, onOpenMobisite, onViewChange, toggleSidebar]
	);

	return (
		<>
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
					<div className="flex items-center justify-between border-b bg-muted/20 p-4">
						<div className="flex min-w-0 flex-1 items-center gap-2">
							<img
								src={logo}
								alt="CashFlow Logo"
								className="h-8 flex-shrink-0 md:h-10"
							/>
							<div className="min-w-0 flex-1">
								<h3 className="text-lg font-bold leading-tight tracking-tight md:text-xl">
									CashFlow
								</h3>
								{accounts.length > 0 && (
									<p className="mt-0.5 truncate text-xs text-muted-foreground">
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
									className="flex-shrink-0 md:hidden"
									aria-label="Close sidebar"
								>
									<FiX className="h-5 w-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleSidebar}
									className="hidden flex-shrink-0 md:inline-flex"
									aria-label="Collapse sidebar"
								>
									<FiChevronLeft className="h-5 w-5" />
								</Button>
							</>
						)}
					</div>

					{!collapsed && (
						<div className="border-b p-3">
							<p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
								Admin
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
											className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
					)}

					<div className="flex-1" />

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
										<AvatarImage src={currentUser.photoURL} alt="User" />
									)}
									<AvatarFallback className="bg-primary text-xs text-primary-foreground">
										{currentUser.email?.[0]?.toUpperCase() ?? '?'}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">
										{currentUser.displayName || currentUser.email || 'User'}
									</p>
								</div>
								<FiSettings className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
							</button>
						) : (
							<Button
								onClick={() => onOpenLogin?.()}
								className="h-9 w-full text-sm md:h-10 md:text-base"
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
