import type { ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@cash-flow/shared/auth/AuthContext';
import { ThemeProvider } from '@/app/theme/context/ThemeContext';
import { TransactionsProvider } from '@/domains/transactions/context/TransactionsContext';
import { AccountsProvider } from '@/domains/accounts/context/AccountsContext';
import { BudgetsProvider } from '@/domains/budgets/context/BudgetsContext';
import { PlanningProvider } from '@/domains/planning/context/PlanningContext';
import { CategoriesProvider } from '@/domains/categories/context/CategoriesContext';
import { FilterPreferencesProvider } from '@/shared/filters/context/FilterPreferencesContext';
import ProtectedRoute from '@/app/routes/ProtectedRoute';
import Dashboard from '@/pages/dashboard/Dashboard';
import AccountDetailPage from '@/pages/accounts/AccountDetail';
import MobisiteFrame from '@/pages/mobisite/MobisiteFrame';

const DashboardDataProviders = ({ children }: { children: ReactNode }) => (
	<FilterPreferencesProvider>
		<CategoriesProvider>
			<TransactionsProvider>
				<AccountsProvider>
					<BudgetsProvider>
						<PlanningProvider>{children}</PlanningProvider>
					</BudgetsProvider>
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
			<AuthProvider>
				<Router>
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
				</Router>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default App;
