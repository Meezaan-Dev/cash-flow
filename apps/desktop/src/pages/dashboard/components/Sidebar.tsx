import React, { useCallback, useEffect, useState } from 'react';
import {
	FiBarChart2,
	FiChevronLeft,
	FiEdit3,
	FiGrid,
	FiList,
	FiMessageCircle,
	FiPlus,
	FiRefreshCw,
	FiSettings,
	FiSmartphone,
	FiTarget,
	FiX,
} from 'react-icons/fi';
import { useAuth } from '@/domains/auth/hooks/useAuth';
import { Transaction, ViewType } from '@/types';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { Button } from '@/components/app/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/app/ui/avatar';
import Currency from '@/components/marketing/Currency';
import {
	frostedPanel,
	navItemActive,
	navItemInactive,
	sectionLabel,
} from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

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
	{ id: 'random', label: 'Random', icon: FiEdit3 },
	{ id: 'assistant', label: 'Assistant', icon: FiMessageCircle },
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
	const { accounts, calculateAvailableBalance, loading: accountsLoading } = useAccountsContext();
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

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
				className={cn(
					'fixed left-0 top-0 z-40 h-screen-safe w-72 border-r backdrop-blur transition-transform duration-300 ease-in-out md:relative md:z-auto md:transition-all',
					frostedPanel,
					collapsed
						? '-translate-x-full md:translate-x-0 md:w-0'
						: 'translate-x-0 md:w-72'
				)}
			>
				<div
					className={`flex h-full flex-col transition-opacity duration-300 ${
						collapsed ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'
					}`}
				>
					<div className="flex items-center justify-between border-b border-gray-200/80 bg-gray-50/40 p-4 dark:border-gray-800/80 dark:bg-gray-800/20">
						<div className="flex min-w-0 flex-1 items-center gap-2">
							<div className="min-w-0 flex-1">
								<h3 className="text-lg font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50 md:text-xl">
									CashFlow
								</h3>
								{accounts.length > 0 && (
									<div className="mt-0.5 truncate">
										<p className={cn(sectionLabel, 'normal-case tracking-normal')}>
											Available
										</p>
										<Currency amount={availableBalance} className="text-sm" />
									</div>
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
						<div className="flex flex-1 flex-col border-b border-gray-200/80 p-3 dark:border-gray-800/80">
							<p className={cn(sectionLabel, 'px-3 pb-2 pt-1')}>Admin</p>
							<div className="flex flex-1 flex-col gap-1.5">
								{NAV_ITEMS.map(({ id, label, icon: Icon }) => {
									const isActive =
										id === 'history'
											? activeView === 'table' || activeView === 'list'
											: activeView === id;
									return (
										<button
											key={id}
											onClick={() => handleViewClick(id)}
											className={cn(
												'flex min-h-10 w-full flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
												isActive ? navItemActive : navItemInactive
											)}
										>
											<Icon className="h-4 w-4 flex-shrink-0" />
											<span>{label}</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{!collapsed && (
						<div className="border-t border-gray-200/80 p-3 dark:border-gray-800/80">
							<Button
								variant="marketing"
								onClick={handleCreateTransaction}
								className="h-10 w-full text-sm md:text-base"
							>
								<FiPlus className="mr-2 h-4 w-4" />
								{hasNoAccounts ? 'Add First Account' : 'New Transaction'}
							</Button>
						</div>
					)}

					<div className="border-t border-gray-200/80 bg-gray-50/40 p-3 dark:border-gray-800/80 dark:bg-gray-800/20">
						{currentUser ? (
							<button
								onClick={() => {
									onOpenSettings?.();
									if (window.innerWidth < 768) toggleSidebar();
								}}
								className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
							>
								<Avatar className="h-8 w-8 flex-shrink-0">
									{currentUser.photoURL && (
										<AvatarImage src={currentUser.photoURL} alt="User" />
									)}
									<AvatarFallback className="bg-blue-600 text-xs text-white">
										{currentUser.email?.[0]?.toUpperCase() ?? '?'}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
										{currentUser.displayName || currentUser.email || 'User'}
									</p>
								</div>
								<FiSettings className="h-4 w-4 flex-shrink-0 text-gray-400" />
							</button>
						) : (
							<Button
								variant="marketing"
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
