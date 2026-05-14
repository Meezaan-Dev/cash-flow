import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/context/ThemeContext';
import { TransactionsProvider } from '@/features/transactions/context/TransactionsContext';
import { AccountsProvider } from '@/features/accounts/context/AccountsContext';
import { BudgetsProvider } from '@/features/budgets/context/BudgetsContext';
import { CategoriesProvider } from '@/features/categories/context/CategoriesContext';
import { FilterPreferencesProvider } from '@/features/filters/context/FilterPreferencesContext';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import Home from '@/features/marketing/pages/Home';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import AccountDetailPage from '@/features/accounts/pages/AccountDetail';

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
										<Route path="/" element={<Home />} />
										<Route
											path="/dashboard"
											element={
												<ProtectedRoute>
													<Dashboard />
												</ProtectedRoute>
											}
										/>
										<Route
											path="/accounts/:accountId"
											element={
												<ProtectedRoute>
													<AccountDetailPage />
												</ProtectedRoute>
											}
										/>
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
