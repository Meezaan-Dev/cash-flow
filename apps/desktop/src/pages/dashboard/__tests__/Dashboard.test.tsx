import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/dashboard/Dashboard';

const mockDeleteTransaction = jest.fn();
const mockToast = jest.fn();

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [],
		addTransaction: jest.fn(),
		deleteTransaction: mockDeleteTransaction,
	}),
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
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

jest.mock('@/pages/dashboard/components/DashboardOverview', () => ({
	__esModule: true,
	default: () => <div>Dashboard overview</div>,
}));

jest.mock('@/pages/dashboard/components/Sidebar', () => ({
	__esModule: true,
	default: ({
		onCreate,
		onViewChange,
	}: {
		onCreate: () => void;
		onViewChange: (view: string) => void;
	}) => (
		<>
			<button onClick={onCreate}>Create transaction</button>
			<button onClick={() => onViewChange('budgets')}>Open budgets</button>
			<button onClick={() => onViewChange('random')}>Open random</button>
		</>
	),
}));

jest.mock('@/pages/dashboard/components/SettingsModal', () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock('@/domains/transactions/views/TransactionForm', () => ({
	__esModule: true,
	default: ({
		onClose,
		onSuccess,
	}: {
		onClose: () => void;
		onSuccess?: (message: string) => void;
	}) => (
		<div>
			<div>Transaction form</div>
			<button
				onClick={() => {
					onSuccess?.('Expense added successfully.');
					onClose();
				}}
			>
				Finish add
			</button>
		</div>
	),
}));

jest.mock('@/domains/transactions/views/TransactionsTable', () => ({
	__esModule: true,
	default: () => <div>Transactions table</div>,
}));

jest.mock('@/domains/transactions/views/TransactionsList', () => ({
	__esModule: true,
	default: () => <div>Transactions list</div>,
}));

jest.mock('@/domains/accounts/views/AccountsList', () => ({
	__esModule: true,
	default: () => <div>Accounts list</div>,
}));

jest.mock('@/domains/accounts/views/TransferForm', () => ({
	__esModule: true,
	default: () => <div>Transfer form</div>,
}));

jest.mock('@/domains/accounts/views/ReconcileForm', () => ({
	__esModule: true,
	default: () => <div>Reconcile form</div>,
}));

jest.mock('@/domains/budgets/views/BudgetsList', () => ({
	__esModule: true,
	default: () => <div>Budgets list</div>,
}));

jest.mock('@/domains/reports/views/ReportsView', () => ({
	__esModule: true,
	default: () => <div>Reports view</div>,
}));

jest.mock('@/domains/recurring/views/RecurringTransactionsView', () => ({
	__esModule: true,
	default: () => <div>Recurring transactions</div>,
}));

jest.mock('@/domains/ai/components/AIChatbot', () => ({
	__esModule: true,
	default: () => <div>AI assistant</div>,
}));

jest.mock('@/domains/random/views/RandomView', () => ({
	__esModule: true,
	default: () => <div>Random notes</div>,
}));

jest.mock('@/domains/auth/components/AuthModals', () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock('@/components/app/ui/toaster', () => ({
	Toaster: () => null,
}));

const renderDashboard = (initialPath = '/dashboard') =>
	render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/dashboard/transactions" element={<Dashboard />} />
				<Route path="/dashboard/budgets" element={<Dashboard />} />
				<Route path="/dashboard/random" element={<Dashboard />} />
				<Route path="/dashboard/settings" element={<Dashboard />} />
			</Routes>
		</MemoryRouter>
	);

describe('Dashboard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('closes the transaction form after finishing an add from /dashboard', () => {
		renderDashboard();

		expect(screen.getByText('Dashboard overview')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Create transaction' }));

		expect(screen.getByText('Transaction form')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Finish add' }));

		expect(screen.getByText('Dashboard overview')).toBeInTheDocument();
		expect(screen.queryByText('Transaction form')).not.toBeInTheDocument();
		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Transaction created',
				description: 'Expense added successfully.',
			})
		);
	});

	it('navigates from the transaction form to budgets without getting stuck', () => {
		renderDashboard();

		fireEvent.click(screen.getByRole('button', { name: 'Create transaction' }));
		expect(screen.getByText('Transaction form')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Open budgets' }));
		expect(screen.getByText('Budgets list')).toBeInTheDocument();
		expect(screen.queryByText('Transaction form')).not.toBeInTheDocument();
	});

	it('navigates to random notes from the dashboard shell', () => {
		renderDashboard();

		fireEvent.click(screen.getByRole('button', { name: 'Open random' }));
		expect(screen.getByText('Random notes')).toBeInTheDocument();
	});

	it('toggles privacy mode from the panic button', () => {
		renderDashboard();

		const button = screen.getByRole('button', { name: 'Hide data' });
		expect(button).toHaveAttribute('aria-pressed', 'false');

		fireEvent.click(button);

		expect(screen.getByRole('button', { name: 'Reveal data' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('toggles privacy mode with Ctrl+H', () => {
		renderDashboard();

		fireEvent.keyDown(window, { key: 'h', ctrlKey: true });

		expect(screen.getByRole('button', { name: 'Reveal data' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('toggles privacy mode with Meta+Shift+H', () => {
		renderDashboard();

		fireEvent.keyDown(window, { key: 'h', metaKey: true, shiftKey: true });

		expect(screen.getByRole('button', { name: 'Reveal data' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('ignores privacy shortcuts inside editable fields', () => {
		renderDashboard();

		const editable = document.createElement('div');
		editable.setAttribute('contenteditable', 'true');
		document.body.appendChild(editable);
		fireEvent.keyDown(editable, { key: 'h', ctrlKey: true });

		expect(screen.getByRole('button', { name: 'Hide data' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		editable.remove();
	});
});
