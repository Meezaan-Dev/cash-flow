import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardOverview from '@/pages/dashboard/components/DashboardOverview';
import { PrivacyModeProvider } from '@/app/privacy/PrivacyModeContext';
import PrivacyModeButton from '@/pages/dashboard/components/PrivacyModeButton';

const mockAddTransaction = jest.fn();
const mockAddTransfer = jest.fn();
const mockOnOpenHistory = jest.fn();
const mockOnOpenSettings = jest.fn();
const mockOnOpenBudgets = jest.fn();
const mockOnOpenPlanning = jest.fn();
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
let mockPlannedExpenses = [
	{
		id: 'planned-shoes',
		userId: 'user-1',
		title: 'New shoes',
		amount: 800,
		targetMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
		category: 'personal',
		status: 'planned',
	},
	{
		id: 'wishlist-laptop',
		userId: 'user-1',
		title: 'Laptop',
		amount: 12000,
		category: 'tech',
		status: 'wishlist',
	},
];
let mockPaymentPlans = [
	{
		id: 'plan-phone',
		userId: 'user-1',
		itemName: 'Phone',
		originalTotal: 12000,
		basePaidAmount: 6000,
		expectedPaymentAmount: 2000,
		status: 'active',
		linkedTransactionIds: [],
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

jest.mock('@/domains/planning/context/PlanningContext', () => ({
	usePlanningContext: () => ({
		plannedExpenses: mockPlannedExpenses,
		paymentPlans: mockPaymentPlans,
		calculatePlannedExpenseTotal: () =>
			mockPlannedExpenses
				.filter((expense) => expense.status === 'planned')
				.reduce((sum, expense) => sum + expense.amount, 0),
		calculatePaymentPlansProgress: () =>
			mockPaymentPlans.map((plan) => {
				const paid = plan.basePaidAmount;
				const remaining = Math.max(plan.originalTotal - paid, 0);
				return {
					plan,
					paid,
					remaining,
					percentComplete: (paid / plan.originalTotal) * 100,
					paymentsRemaining: Math.ceil(remaining / (plan.expectedPaymentAmount ?? 1)),
				};
			}),
		getRemainingPlannedExpenses: () =>
			mockPlannedExpenses.filter((expense) => expense.status === 'planned'),
		getCurrentMonthKey: () =>
			`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
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
	onOpenPlanning: mockOnOpenPlanning,
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
		mockPlannedExpenses = [
			{
				id: 'planned-shoes',
				userId: 'user-1',
				title: 'New shoes',
				amount: 800,
				targetMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
				category: 'personal',
				status: 'planned',
			},
			{
				id: 'wishlist-laptop',
				userId: 'user-1',
				title: 'Laptop',
				amount: 12000,
				category: 'tech',
				status: 'wishlist',
			},
		];
		mockPaymentPlans = [
			{
				id: 'plan-phone',
				userId: 'user-1',
				itemName: 'Phone',
				originalTotal: 12000,
				basePaidAmount: 6000,
				expectedPaymentAmount: 2000,
				status: 'active',
				linkedTransactionIds: [],
			},
		];
	});

	it('renders the simplified dashboard home sections', () => {
		renderOverview();

		expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
		expect(screen.getAllByText(/Net worth/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
		expect(screen.getByText('Spent this month')).toBeInTheDocument();
		expect(screen.getAllByText('Coming up').length).toBeGreaterThan(0);
		expect(screen.getByText('New shoes')).toBeInTheDocument();
		expect(screen.getByText('Recent')).toBeInTheDocument();
		expect(screen.getByText('Latest transactions')).toBeInTheDocument();
		expect(screen.queryByText('Money now')).not.toBeInTheDocument();
		expect(screen.queryByText('Projected')).not.toBeInTheDocument();
		expect(screen.queryByText('Progress')).not.toBeInTheDocument();
		expect(screen.queryByText('Quick actions')).not.toBeInTheDocument();
		expect(screen.queryByText('Budget health')).not.toBeInTheDocument();
		expect(screen.queryByText('Phone')).not.toBeInTheDocument();
		expect(screen.queryByText('Accounts')).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: /ai assistant/i })).not.toBeInTheDocument();
	});

	it('shows the last 5 transactions on the dashboard home', () => {
		mockTransactions = Array.from({ length: 12 }, (_, index) => makeTransaction(index));

		renderOverview();

		expect(screen.getByText('Transaction 0')).toBeInTheDocument();
		expect(screen.getByText('Transaction 4')).toBeInTheDocument();
		expect(screen.queryByText('Transaction 5')).not.toBeInTheDocument();
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
		expect(screen.getAllByText(/Recurring/i).length).toBeGreaterThan(0);

		fireEvent.click(screen.getByRole('button', { name: /rent/i }));
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

		fireEvent.click(screen.getByRole('button', { name: /monthly pay/i }));
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

		fireEvent.click(screen.getByRole('button', { name: /rent/i }));
		fireEvent.click(screen.getByRole('button', { name: /edit this transaction/i }));

		expect(mockOnEditRecurringDraft).toHaveBeenCalledWith(
			expect.objectContaining({
				recurringTransaction: expect.objectContaining({ id: 'rent' }),
				occurrenceDateKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			})
		);
	});

	it('shows an empty state when no coming up items need attention', () => {
		mockRecurringTransactions = [];
		mockPlannedExpenses = [];

		renderOverview();

		expect(
			screen.getByText(/Nothing due soon and no planned expenses remaining this month/i)
		).toBeInTheDocument();
	});
});
