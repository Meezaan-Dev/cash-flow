import { fireEvent, render, screen } from '@testing-library/react';
import Sidebar from '@/pages/dashboard/components/Sidebar';

const mockOnCreate = jest.fn();
const mockOnSelect = jest.fn();
const mockOnDelete = jest.fn();
const mockToggleSidebar = jest.fn();
const mockOnOpenSettings = jest.fn();
const mockOnOpenLogin = jest.fn();
const mockOnOpenHistory = jest.fn();
const mockOnOpenMobisite = jest.fn();
const mockOnViewChange = jest.fn();

jest.mock('@/domains/auth/hooks/useAuth', () => ({
	useAuth: () => ({
		currentUser: {
			email: 'user@example.com',
			displayName: 'User Example',
			photoURL: null,
		},
	}),
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [
			{
				id: 'acc-1',
				name: 'Main Account',
				type: 'debit',
				balance: 2400,
			},
		],
		loading: false,
		calculateAvailableBalance: () => 2400,
	}),
}));

const renderSidebar = () =>
	render(
		<Sidebar
			onCreate={mockOnCreate}
			onSelect={mockOnSelect}
			onDelete={mockOnDelete}
			selectedId={null}
			collapsed={false}
			toggleSidebar={mockToggleSidebar}
			onOpenSettings={mockOnOpenSettings}
			onOpenLogin={mockOnOpenLogin}
			onOpenHistory={mockOnOpenHistory}
			onOpenMobisite={mockOnOpenMobisite}
			onViewChange={mockOnViewChange}
			activeView="dashboard"
		/>
	);

describe('Sidebar', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows the full navigation list without a More menu', () => {
		renderSidebar();

		expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /planning/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /accounts/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /budgets/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /recurring/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /assistant/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /view mobisite/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /new transaction/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^more$/i })).not.toBeInTheDocument();
	});

	it('routes secondary destinations directly from the sidebar', () => {
		renderSidebar();

		fireEvent.click(screen.getByRole('button', { name: /reports/i }));
		expect(mockOnViewChange).toHaveBeenCalledWith('reports');

		fireEvent.click(screen.getByRole('button', { name: /view mobisite/i }));
		expect(mockOnOpenMobisite).toHaveBeenCalled();
	});
});
