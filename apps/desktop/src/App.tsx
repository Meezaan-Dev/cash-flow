import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/app/theme/context/ThemeContext';
import { TransactionsProvider } from '@/domains/transactions/context/TransactionsContext';
import { AccountsProvider } from '@/domains/accounts/context/AccountsContext';
import { BudgetsProvider } from '@/domains/budgets/context/BudgetsContext';
import { CategoriesProvider } from '@/domains/categories/context/CategoriesContext';
import { FilterPreferencesProvider } from '@/shared/filters/context/FilterPreferencesContext';
import ProtectedRoute from '@/app/routes/ProtectedRoute';

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const AccountDetailPage = lazy(() => import('@/pages/accounts/AccountDetail'));
const MobisiteFrame = lazy(() => import('@/pages/mobisite/MobisiteFrame'));

const RouteLoading = () => (
	<div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
		Loading...
	</div>
);

const DashboardDataProviders = ({ children }: { children: ReactNode }) => (
	<FilterPreferencesProvider>
		<CategoriesProvider>
			<TransactionsProvider>
				<AccountsProvider>
					<BudgetsProvider>{children}</BudgetsProvider>
				</AccountsProvider>
			</TransactionsProvider>
		</CategoriesProvider>
	</FilterPreferencesProvider>
);

const protectedDashboard = (children: ReactNode) => (
	<ProtectedRoute>
		<DashboardDataProviders>{children}</DashboardDataProviders>
	</ProtectedRoute>
);

function App() {
	return (
		<ThemeProvider>
			<Router>
				<Suspense fallback={<RouteLoading />}>
					<Routes>
						<Route
							path="/"
							element={
								<ProtectedRoute>
									<Navigate to="/dashboard" replace />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/dashboard/accounts/:accountId"
							element={protectedDashboard(<AccountDetailPage />)}
						/>
						<Route path="/dashboard/*" element={protectedDashboard(<Dashboard />)} />
						<Route
							path="/mobisite"
							element={
								<ProtectedRoute>
									<MobisiteFrame />
								</ProtectedRoute>
							}
						/>
						<Route path="*" element={<Navigate to="/dashboard" replace />} />
					</Routes>
				</Suspense>
			</Router>
		</ThemeProvider>
	);
}

export default App;
