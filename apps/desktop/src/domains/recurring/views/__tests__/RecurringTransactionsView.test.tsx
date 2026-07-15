import { render, screen } from '@testing-library/react';
import RecurringTransactionsView from '../RecurringTransactionsView';

const mockDeleteRecurringTransaction = jest.fn();

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
		recurringTransactionsLoading: false,
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
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
});
