import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '@/features/dashboard/pages/Dashboard';

const mockDeleteTransaction = jest.fn();
const mockToast = jest.fn();

jest.mock('@/features/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [],
		addTransaction: jest.fn(),
		deleteTransaction: mockDeleteTransaction,
	}),
}));

jest.mock('@/features/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [
			{
				id: 'acc-1',
				name: 'Main Account',
				type: 'debit',
				balance: 1000,
			},
		],
		loading: false,
	}),
}));

jest.mock('@/components/app/ui/use-toast', () => ({
	useToast: () => ({
		toast: mockToast,
	}),
}));

jest.mock('@/features/dashboard/components/DashboardOverview', () => ({
	__esModule: true,
	default: () => <div>Dashboard overview</div>,
}));

jest.mock('@/features/dashboard/components/Sidebar', () => ({
	__esModule: true,
	default: ({ onCreate }: { onCreate: () => void }) => (
		<button onClick={onCreate}>Create transaction</button>
	),
}));

jest.mock('@/features/dashboard/components/SettingsModal', () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock('@/features/transactions/views/TransactionForm', () => ({
	__esModule: true,
	default: ({ onClose }: { onClose: () => void }) => (
		<div>
			<div>Transaction form</div>
			<button onClick={onClose}>Finish add</button>
		</div>
	),
}));

jest.mock('@/features/transactions/views/TransactionsTable', () => ({
	__esModule: true,
	default: () => <div>Transactions table</div>,
}));

jest.mock('@/features/transactions/views/TransactionsList', () => ({
	__esModule: true,
	default: () => <div>Transactions list</div>,
}));

jest.mock('@/features/accounts/views/AccountsList', () => ({
	__esModule: true,
	default: () => <div>Accounts list</div>,
}));

jest.mock('@/features/accounts/views/TransferForm', () => ({
	__esModule: true,
	default: () => <div>Transfer form</div>,
}));

jest.mock('@/features/accounts/views/ReconcileForm', () => ({
	__esModule: true,
	default: () => <div>Reconcile form</div>,
}));

jest.mock('@/features/budgets/views/BudgetsList', () => ({
	__esModule: true,
	default: () => <div>Budgets list</div>,
}));

jest.mock('@/features/reports/views/ReportsView', () => ({
	__esModule: true,
	default: () => <div>Reports view</div>,
}));

jest.mock('@/features/recurring/views/RecurringTransactionsView', () => ({
	__esModule: true,
	default: () => <div>Recurring transactions</div>,
}));

jest.mock('@/features/auth/components/AuthModals', () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock('@/components/app/ui/toaster', () => ({
	Toaster: () => null,
}));

describe('Dashboard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('closes the transaction form after finishing an add from /dashboard', () => {
		render(
			<MemoryRouter initialEntries={['/dashboard']}>
				<Routes>
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/dashboard/transactions" element={<Dashboard />} />
					<Route path="/dashboard/settings" element={<Dashboard />} />
				</Routes>
			</MemoryRouter>
		);

		expect(screen.getByText('Dashboard overview')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Create transaction' }));

		expect(screen.getByText('Transaction form')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Finish add' }));

		expect(screen.getByText('Dashboard overview')).toBeInTheDocument();
		expect(screen.queryByText('Transaction form')).not.toBeInTheDocument();
	});
});
