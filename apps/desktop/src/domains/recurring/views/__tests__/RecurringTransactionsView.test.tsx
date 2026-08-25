import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecurringTransactionsView from '../RecurringTransactionsView';
import RecurringTransactionsCalendar from '../RecurringTransactionsCalendar';
import RecurringTransactionForm from '../RecurringTransactionForm';
import { Dialog, DialogContent } from '@/components/app/ui/dialog';

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
		accounts: [
			{ id: 'checking', name: 'Checking', color: '#0ea5e9', balance: 0 },
			{ id: 'savings', name: 'Savings', color: '#22c55e', balance: 0 },
		],
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
	useMainAccountPreference: () => ({ mainAccountId: 'savings' }),
}));

jest.mock('@/components/marketing/SectionHeader', () => ({
	__esModule: true,
	default: ({ title, subtitle, actions, className, compact }: any) => (
		<header className={className} data-compact={compact ? 'true' : 'false'} data-testid="section-header">
			<h1>{title}</h1>
			{subtitle && <div>{subtitle}</div>}
			{actions}
		</header>
	),
}));

describe('RecurringTransactionsView', () => {
	beforeAll(() => {
		HTMLElement.prototype.hasPointerCapture = jest.fn();
		HTMLElement.prototype.scrollIntoView = jest.fn();
	});

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
		expect(screen.getByTestId('section-header')).toHaveAttribute('data-compact', 'false');
	});

	it('shows one close button in the edit recurring modal', async () => {
		const user = userEvent.setup();
		render(<RecurringTransactionsView />);

		await user.click(screen.getByRole('button', { name: 'Edit recurring transaction' }));

		expect(screen.getByRole('heading', { name: 'Edit Recurring Transaction' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
	});

});

describe('RecurringTransactionForm', () => {
	const recurringTransaction = {
		id: 'rent',
		accountId: 'checking',
		title: 'Rent',
		amount: 12000,
		type: 'expense' as const,
		category: 'home',
		subcategory: 'rent',
		description: 'Apartment',
		frequency: 'monthly' as const,
		expectedDate: 1,
	};
	const renderForm = () =>
		render(
			<Dialog open>
				<DialogContent>
					<RecurringTransactionForm transaction={recurringTransaction} onClose={jest.fn()} />
				</DialogContent>
			</Dialog>
		);

	beforeAll(() => {
		HTMLElement.prototype.hasPointerCapture = jest.fn();
		HTMLElement.prototype.scrollIntoView = jest.fn();
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('keeps the saved account selected when editing a recurring transaction', async () => {
		const user = userEvent.setup();
		renderForm();

		expect(screen.getByRole('combobox', { name: 'Account' })).toHaveTextContent('Checking');
		expect(screen.getByRole('combobox', { name: 'Account' })).not.toHaveTextContent('Savings');
		await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Rent'));

		await user.click(screen.getByRole('button', { name: 'Update Transaction' }));

		await waitFor(() =>
			expect(mockUpdateRecurringTransaction).toHaveBeenCalledWith(
				'rent',
				expect.objectContaining({ accountId: 'checking' })
			)
		);
	});

	it('saves a changed account when editing a recurring transaction', async () => {
		const user = userEvent.setup();
		renderForm();

		await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Rent'));
		await user.click(screen.getByRole('combobox', { name: 'Account' }));
		await user.click(screen.getByRole('option', { name: /Savings/ }));
		await user.click(screen.getByRole('button', { name: 'Update Transaction' }));

		await waitFor(() =>
			expect(mockUpdateRecurringTransaction).toHaveBeenCalledWith(
				'rent',
				expect.objectContaining({ accountId: 'savings' })
			)
		);
	});
});


describe('RecurringTransactionsCalendar', () => {
	it('marks the current day with a Today label', () => {
		const now = new Date();

		render(
			<RecurringTransactionsCalendar
				transactions={[
					{
						id: 'rent',
						accountId: 'checking',
						title: 'Rent',
						amount: 12000,
						type: 'expense',
						category: 'home',
						frequency: 'monthly',
						expectedDate: now.getDate(),
					},
				]}
				onEdit={jest.fn()}
				onDelete={jest.fn()}
				getCategoryPathLabel={() => 'Home / Rent'}
			/>
		);

		expect(screen.getByText('Today')).toBeInTheDocument();
	});
});
