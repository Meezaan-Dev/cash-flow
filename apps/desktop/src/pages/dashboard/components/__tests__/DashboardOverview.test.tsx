import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardOverview from '@/pages/dashboard/components/DashboardOverview';
import { PrivacyModeProvider } from '@/app/privacy/PrivacyModeContext';
import PrivacyModeButton from '@/pages/dashboard/components/PrivacyModeButton';

const mockAddTransaction = jest.fn();
const mockAddTransfer = jest.fn();
const mockOnOpenHistory = jest.fn();
const mockOnOpenSettings = jest.fn();
const mockOnOpenBudgets = jest.fn();
const mockOnCreateTransaction = jest.fn();
const mockOnOpenTransactions = jest.fn();
const mockOnSelectTransaction = jest.fn();
const mockOnEditRecurringDraft = jest.fn();
const today = new Date();

const makeTransaction = (index: number) => ({
	id: `tx-${index}`,
	accountId: 'acc-1',
	title: `Transaction ${index}`,
	amount: 100 + index,
	type: 'expense',
	category: 'food',
	subcategory: 'groceries',
	date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - index),
});

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

jest.mock('@cash-flow/shared/accounts/mainAccountPreference', () => ({
	useMainAccountPreference: () => ({ mainAccountId: 'acc-1' }),
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

const overviewProps = {
	onOpenHistory: mockOnOpenHistory,
	onOpenBudgets: mockOnOpenBudgets,
	onOpenSettings: mockOnOpenSettings,
	onCreateTransaction: mockOnCreateTransaction,
	onOpenTransactions: mockOnOpenTransactions,
	onSelectTransaction: mockOnSelectTransaction,
	onEditRecurringDraft: mockOnEditRecurringDraft,
};

const renderOverview = () =>
	render(
		<DashboardOverview {...overviewProps} />
	);

const renderOverviewWithPrivacyButton = () =>
	render(
		<PrivacyModeProvider>
			<PrivacyModeButton />
			<DashboardOverview {...overviewProps} />
		</PrivacyModeProvider>
	);

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

	it('renders the focused dashboard home sections without digest or account panels', () => {
		renderOverview();

		expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
		expect(screen.getByText(/Net worth/i)).toBeInTheDocument();
		expect(screen.getByText('Next 7 days')).toBeInTheDocument();
		expect(screen.getByText('Planned recurring transactions')).toBeInTheDocument();
		expect(screen.getByText('Recent')).toBeInTheDocument();
		expect(screen.getByText('Latest transactions')).toBeInTheDocument();
		expect(screen.getByText('Budget health')).toBeInTheDocument();
		expect(screen.queryByText('Available balance')).not.toBeInTheDocument();
		expect(screen.queryByText('Income')).not.toBeInTheDocument();
		expect(screen.queryByText('Expenses')).not.toBeInTheDocument();
		expect(screen.queryByText('Net change')).not.toBeInTheDocument();
		expect(screen.queryByText('Accounts')).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: /ai assistant/i })).not.toBeInTheDocument();
	});

	it('shows the last 10 transactions on the dashboard home', () => {
		mockTransactions = Array.from({ length: 12 }, (_, index) => makeTransaction(index));

		renderOverview();

		expect(screen.getByText('Transaction 0')).toBeInTheDocument();
		expect(screen.getByText('Transaction 9')).toBeInTheDocument();
		expect(screen.queryByText('Transaction 10')).not.toBeInTheDocument();
		expect(screen.queryByText('Transaction 11')).not.toBeInTheDocument();
	});

	it('replaces recent transaction text with skeletons in privacy mode', () => {
		renderOverviewWithPrivacyButton();

		expect(screen.getByText('Salary')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Hide data' }));

		expect(screen.queryByText('Salary')).not.toBeInTheDocument();
		expect(screen.getAllByTestId('privacy-skeleton').length).toBeGreaterThan(0);
	});

	it('shows upcoming recurring transactions and confirms expenses with occurrence metadata', async () => {
		renderOverview();

		expect(screen.getByText('Rent')).toBeInTheDocument();
		expect(screen.getByText('Today')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Rent' }));
		fireEvent.click(screen.getByRole('button', { name: /apply as is/i }));

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

	it('shows upcoming recurring income and confirms it with the income type', async () => {
		mockRecurringTransactions = [
			{
				id: 'monthly-pay',
				accountId: 'acc-1',
				title: 'Monthly Pay',
				amount: 12000,
				type: 'income',
				category: 'personal',
				expectedDate: today.getDate(),
			},
		];

		renderOverview();

		expect(screen.getByText('Monthly Pay')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Monthly Pay' }));
		fireEvent.click(screen.getByRole('button', { name: /apply as is/i }));

		await waitFor(() =>
			expect(mockAddTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'income',
					accountId: 'acc-1',
					title: 'Monthly Pay',
					recurringTransactionId: 'monthly-pay',
					recurringOccurrenceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
				})
			)
		);
	});

	it('opens the edit flow for a single recurring occurrence', () => {
		renderOverview();

		fireEvent.click(screen.getByRole('button', { name: 'Rent' }));
		fireEvent.click(screen.getByRole('button', { name: /edit this transaction/i }));

		expect(mockOnEditRecurringDraft).toHaveBeenCalledWith(
			expect.objectContaining({
				recurringTransaction: expect.objectContaining({ id: 'rent' }),
				occurrenceDateKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			})
		);
	});

	it('shows an empty state when no recurring transactions are due soon', () => {
		mockRecurringTransactions = [];

		renderOverview();

		expect(screen.getByText('Nothing due soon')).toBeInTheDocument();
		expect(screen.getByText(/Recurring transactions due in the next 7 days/i)).toBeInTheDocument();
	});
});
