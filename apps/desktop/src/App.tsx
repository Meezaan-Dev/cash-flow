import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/app/theme/context/ThemeContext';
import { TransactionsProvider } from '@/domains/transactions/context/TransactionsContext';
import { AccountsProvider } from '@/domains/accounts/context/AccountsContext';
import { BudgetsProvider } from '@/domains/budgets/context/BudgetsContext';
import { CategoriesProvider } from '@/domains/categories/context/CategoriesContext';
import { FilterPreferencesProvider } from '@/shared/filters/context/FilterPreferencesContext';
import ProtectedRoute from '@/app/routes/ProtectedRoute';
import Dashboard from '@/pages/dashboard/Dashboard';
import AccountDetailPage from '@/pages/accounts/AccountDetail';
import MobisiteFrame from '@/pages/mobisite/MobisiteFrame';

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
											path="/dashboard/random"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/dashboard/assistant"
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
