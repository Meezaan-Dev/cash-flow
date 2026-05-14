import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardOverview from '@/features/dashboard/components/DashboardOverview';

const mockAddTransaction = jest.fn();
const mockAddTransfer = jest.fn();
const mockOnCreateAccount = jest.fn();
const mockOnOpenAccounts = jest.fn();
const mockOnOpenHistory = jest.fn();
const mockOnOpenSettings = jest.fn();
const mockOnSelectTransaction = jest.fn();

jest.mock('@/features/ai/components/AIChatbot', () => ({
	__esModule: true,
	default: ({ variant }: { variant?: string }) => (
		<div data-testid="assistant-variant">{variant}</div>
	),
}));

jest.mock('@/features/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [
			{
				id: 'salary',
				accountId: 'acc-1',
				title: 'Salary',
				amount: 8500,
				type: 'income',
				category: 'personal',
				date: new Date(),
			},
			{
				id: 'groceries',
				accountId: 'acc-1',
				title: 'Checkers',
				amount: 480,
				type: 'expense',
				category: 'food',
				subcategory: 'groceries',
				date: new Date(),
			},
		],
		addTransaction: mockAddTransaction,
		addTransfer: mockAddTransfer,
	}),
}));

jest.mock('@/features/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [
			{
				id: 'acc-1',
				name: 'FNB Cheque',
				type: 'debit',
				balance: 2410,
				color: '#3b82f6',
			},
			{
				id: 'acc-2',
				name: 'Savings',
				type: 'savings',
				balance: 1872,
				color: '#22c55e',
			},
		],
		loading: false,
	}),
}));

jest.mock('@/features/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		categories: [
			{
				id: 'food',
				value: 'food',
				label: 'Food',
				subcategories: [{ value: 'groceries', label: 'Groceries' }],
			},
			{
				id: 'personal',
				value: 'personal',
				label: 'Personal',
				subcategories: [],
			},
		],
		categoryOptions: [
			{ value: 'food', label: 'Food' },
			{ value: 'personal', label: 'Personal' },
		],
		getCategoryPathLabel: (category: string, subcategory?: string) =>
			subcategory ? `${category} / ${subcategory}` : category,
	}),
}));

describe('DashboardOverview', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAddTransaction.mockResolvedValue(undefined);
		mockAddTransfer.mockResolvedValue(undefined);
	});

	it('renders the reference-style dashboard panels with a docked assistant', () => {
		render(
			<DashboardOverview
				onCreateAccount={mockOnCreateAccount}
				onOpenAccounts={mockOnOpenAccounts}
				onOpenHistory={mockOnOpenHistory}
				onOpenSettings={mockOnOpenSettings}
				onSelectTransaction={mockOnSelectTransaction}
			/>
		);

		expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
		expect(screen.getByText(/digest/i)).toBeInTheDocument();
		expect(screen.getByText('Recent')).toBeInTheDocument();
		expect(screen.getByText('New transaction')).toBeInTheDocument();
		expect(screen.getByTestId('assistant-variant')).toHaveTextContent('docked');
	});

	it('submits a quick expense through the transaction context', async () => {
		const user = userEvent.setup();
		render(
			<DashboardOverview
				onCreateAccount={mockOnCreateAccount}
				onOpenAccounts={mockOnOpenAccounts}
				onOpenHistory={mockOnOpenHistory}
				onOpenSettings={mockOnOpenSettings}
				onSelectTransaction={mockOnSelectTransaction}
			/>
		);

		await user.type(screen.getByLabelText('Amount'), '123.45');
		await user.type(screen.getByLabelText('Description'), 'Lunch');
		await user.click(screen.getByRole('button', { name: 'Add transaction' }));

		await waitFor(() => {
			expect(mockAddTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					accountId: 'acc-1',
					amount: 123.45,
					title: 'Lunch',
					type: 'expense',
					category: 'food',
				})
			);
		});
	});
});
