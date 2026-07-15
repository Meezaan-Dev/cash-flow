import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecurringTransactionsView from '../RecurringTransactionsView';

const mockDeleteRecurringTransaction = jest.fn();
const mockAddRecurringTransaction = jest.fn();
const mockUpdateRecurringTransaction = jest.fn();

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		recurringTransactions: [
			{
				id: 'rent',
				accountId: 'checking',
				title: 'Rent',
				amount: 12000,
				type: 'expense',
				category: 'home',
				subcategory: 'rent',
				description: 'Apartment',
				frequency: 'monthly',
				expectedDate: 1,
			},
		],
		deleteRecurringTransaction: mockDeleteRecurringTransaction,
		addRecurringTransaction: mockAddRecurringTransaction,
		updateRecurringTransaction: mockUpdateRecurringTransaction,
		recurringTransactionsLoading: false,
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		categories: [{ value: 'home', label: 'Home', subcategories: [{ value: 'rent', label: 'Rent' }] }],
		categoryOptions: [{ value: 'home', label: 'Home' }],
		getCategoryPathLabel: () => 'Home / Rent',
	}),
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [{ id: 'checking', name: 'Checking', color: '#0ea5e9' }],
	}),
}));

jest.mock('@/shared/filters/context/FilterPreferencesContext', () => ({
	useFilterPreferences: () => ({
		prefs: {
			recurring: {
				frequency: true,
				category: true,
				type: true,
				date: true,
				sortBy: true,
			},
		},
	}),
}));

jest.mock('@cash-flow/shared/accounts/mainAccountPreference', () => ({
	useMainAccountPreference: () => ({ mainAccountId: 'checking' }),
}));

describe('RecurringTransactionsView', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(window.localStorage.getItem as jest.Mock).mockReturnValue('list');
	});

	it('renders recurring transactions as table-style rows without header view controls', () => {
		render(<RecurringTransactionsView />);

		expect(screen.getByRole('heading', { name: 'Recurring Transactions' })).toBeInTheDocument();
		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByText('Schedule')).toBeInTheDocument();
		expect(screen.getByText('Amount')).toBeInTheDocument();
		expect(screen.getByText('Account / Category')).toBeInTheDocument();
		expect(screen.getByText('Rent')).toBeInTheDocument();
		expect(screen.getByText('Monthly')).toBeInTheDocument();
		expect(screen.getByText('Home / Rent')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'List' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Calendar' })).not.toBeInTheDocument();
		expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
			'recurringTransactions.viewMode',
			expect.any(String)
		);
	});

	it('shows one close button in the edit recurring modal', async () => {
		const user = userEvent.setup();
		render(<RecurringTransactionsView />);

		await user.click(screen.getByRole('button', { name: 'Edit recurring transaction' }));

		expect(screen.getByRole('heading', { name: 'Edit Recurring Transaction' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
	});
});
