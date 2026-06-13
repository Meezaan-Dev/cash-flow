import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardOverview from '@/pages/dashboard/components/DashboardOverview';

const mockAddTransaction = jest.fn();
const mockAddTransfer = jest.fn();
const mockOnOpenAccounts = jest.fn();
const mockOnOpenHistory = jest.fn();
const mockOnOpenSettings = jest.fn();
const mockOnOpenBudgets = jest.fn();
const mockOnCreateTransaction = jest.fn();
const mockOnOpenTransactions = jest.fn();
const mockOnSelectTransaction = jest.fn();
const today = new Date();
let mockTransactions = [
	{
		id: 'salary',
		accountId: 'acc-1',
		title: 'Salary',
		amount: 8500,
		type: 'income',
		category: 'personal',
		date: today,
	},
	{
		id: 'groceries',
		accountId: 'acc-1',
		title: 'Checkers',
		amount: 480,
		type: 'expense',
		category: 'food',
		subcategory: 'groceries',
		date: today,
	},
];
let mockRecurringTransactions = [
	{
		id: 'rent',
		accountId: 'acc-1',
		title: 'Rent',
		amount: 9000,
		type: 'expense',
		category: 'home',
		expectedDate: today.getDate(),
	},
];

jest.mock('@/domains/ai/components/AIChatbot', () => ({
	__esModule: true,
	default: ({
		alwaysDocked,
		variant,
	}: {
		alwaysDocked?: boolean;
		variant?: string;
	}) => (
		<div data-testid="assistant-variant">
			{variant}
			{alwaysDocked ? ':always-docked' : ''}
		</div>
	),
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: mockTransactions,
		recurringTransactions: mockRecurringTransactions,
		addTransaction: mockAddTransaction,
		addTransfer: mockAddTransfer,
	}),
}));

jest.mock('@/domains/budgets/context/BudgetsContext', () => ({
	useBudgetsContext: () => ({
		budgets: [],
	}),
}));

jest.mock('@/components/app/ui/use-toast', () => ({
	useToast: () => ({
		toast: jest.fn(),
	}),
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
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

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
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
			{
				id: 'home',
				value: 'home',
				label: 'Home',
				subcategories: [],
			},
		],
		categoryOptions: [
			{ value: 'food', label: 'Food' },
			{ value: 'personal', label: 'Personal' },
			{ value: 'home', label: 'Home' },
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
		mockTransactions = [
			{
				id: 'salary',
				accountId: 'acc-1',
				title: 'Salary',
				amount: 8500,
				type: 'income',
				category: 'personal',
				date: today,
			},
			{
				id: 'groceries',
				accountId: 'acc-1',
				title: 'Checkers',
				amount: 480,
				type: 'expense',
				category: 'food',
				subcategory: 'groceries',
				date: today,
			},
		];
		mockRecurringTransactions = [
			{
				id: 'rent',
				accountId: 'acc-1',
				title: 'Rent',
				amount: 9000,
				type: 'expense',
				category: 'home',
				expectedDate: today.getDate(),
			},
		];
	});

	it('renders the cockpit dashboard with digest, accounts, transactions, and docked AI', () => {
		render(
			<DashboardOverview
				onOpenAccounts={mockOnOpenAccounts}
				onOpenHistory={mockOnOpenHistory}
				onOpenBudgets={mockOnOpenBudgets}
				onOpenSettings={mockOnOpenSettings}
				onCreateTransaction={mockOnCreateTransaction}
				onOpenTransactions={mockOnOpenTransactions}
				onSelectTransaction={mockOnSelectTransaction}
			/>
		);

		expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
		expect(screen.getByText(/Net worth/i)).toBeInTheDocument();
		expect(screen.getByText('Available balance')).toBeInTheDocument();
		expect(screen.getByText('Income')).toBeInTheDocument();
		expect(screen.getByText('Expenses')).toBeInTheDocument();
		expect(screen.getByText('Net change')).toBeInTheDocument();
		expect(screen.getByText('Accounts')).toBeInTheDocument();
		expect(screen.getByText('Recent')).toBeInTheDocument();
		expect(screen.getByText('Latest transactions')).toBeInTheDocument();
		expect(screen.getByTestId('assistant-variant')).toHaveTextContent(
			'docked:always-docked'
		);

		fireEvent.click(screen.getByRole('button', { name: /income/i }));
		expect(mockOnOpenTransactions).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'income',
				startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
				endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			})
		);
	});

	it('shows due recurring drafts and confirms them with occurrence metadata', async () => {
		render(
			<DashboardOverview
				onOpenAccounts={mockOnOpenAccounts}
				onOpenHistory={mockOnOpenHistory}
				onOpenBudgets={mockOnOpenBudgets}
				onOpenSettings={mockOnOpenSettings}
				onCreateTransaction={mockOnCreateTransaction}
				onOpenTransactions={mockOnOpenTransactions}
				onSelectTransaction={mockOnSelectTransaction}
			/>
		);

		expect(screen.getByText('Due today')).toBeInTheDocument();
		expect(screen.getByText('Rent')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

		await waitFor(() =>
			expect(mockAddTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'expense',
					accountId: 'acc-1',
					title: 'Rent',
					recurringTransactionId: 'rent',
					recurringOccurrenceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
				})
			)
		);
	});
});
