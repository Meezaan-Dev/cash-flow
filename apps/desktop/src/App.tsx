import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/context/ThemeContext';
import { TransactionsProvider } from '@/features/transactions/context/TransactionsContext';
import { AccountsProvider } from '@/features/accounts/context/AccountsContext';
import { BudgetsProvider } from '@/features/budgets/context/BudgetsContext';
import { CategoriesProvider } from '@/features/categories/context/CategoriesContext';
import { FilterPreferencesProvider } from '@/features/filters/context/FilterPreferencesContext';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import AccountDetailPage from '@/features/accounts/pages/AccountDetail';
import MobisiteFrame from '@/features/mobisite/pages/MobisiteFrame';

function App() {
	return (
		<ThemeProvider>
			<FilterPreferencesProvider>
				<CategoriesProvider>
					<TransactionsProvider>
						<AccountsProvider>
							<BudgetsProvider>
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
											path="/dashboard"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/transactions"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/accounts"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/accounts/:accountId"
											element={
												<ProtectedRoute>
													<AccountDetailPage />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/budgets"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/recurring"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/reports"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/settings"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
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
							</BudgetsProvider>
						</AccountsProvider>
					</TransactionsProvider>
				</CategoriesProvider>
			</FilterPreferencesProvider>
		</ThemeProvider>
	);
}

export default App;
