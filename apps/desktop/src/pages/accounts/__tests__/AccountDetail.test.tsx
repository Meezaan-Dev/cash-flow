import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AccountDetailPage from '../AccountDetail';

const renderAccountDetail = () =>
	render(
		<MemoryRouter initialEntries={['/dashboard/accounts/checking']}>
			<Routes>
				<Route path="/dashboard/accounts/:accountId" element={<AccountDetailPage />} />
			</Routes>
		</MemoryRouter>
	);

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [
			{
				id: 'checking',
				name: 'Checking',
				type: 'checking',
				bank: 'Acme Bank',
				balance: 2500,
			},
		],
	}),
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [
			{
				id: 'salary',
				accountId: 'checking',
				title: 'Salary',
				amount: 5000,
				type: 'income',
				category: 'income',
				date: '2026-07-01',
				createdAt: '2026-07-01',
			},
			{
				id: 'groceries',
				accountId: 'checking',
				title: 'Groceries',
				amount: 350,
				type: 'expense',
				category: 'food',
				subcategory: 'groceries',
				date: '2026-07-02',
				createdAt: '2026-07-02',
			},
		],
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		getCategoryPathLabel: (category: string, subcategory?: string) =>
			subcategory ? `${category} / ${subcategory}` : category,
	}),
}));

jest.mock('@/domains/accounts/views/AccountForm', () => ({
	__esModule: true,
	default: () => <div>Edit account form</div>,
}));

jest.mock('@/domains/accounts/views/TransferForm', () => ({
	__esModule: true,
	default: () => <div>Transfer form</div>,
}));

jest.mock('@/domains/accounts/views/ReconcileForm', () => ({
	__esModule: true,
	default: () => <div>Reconcile form</div>,
}));

describe('AccountDetailPage', () => {
	it('renders account actions and transactions in the shared table structure', () => {
		renderAccountDetail();

		expect(screen.getByRole('heading', { name: 'Checking' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Reconcile/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Transfer/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
		expect(screen.getByText('Current Balance')).toBeInTheDocument();
		expect(screen.getByText('Transaction')).toBeInTheDocument();
		expect(screen.getByText('Date')).toBeInTheDocument();
		expect(screen.getByText('Category')).toBeInTheDocument();
		expect(screen.getByText('Amount')).toBeInTheDocument();
		expect(screen.getByText('Salary')).toBeInTheDocument();
		expect(screen.getByText('Groceries')).toBeInTheDocument();
	});
});
