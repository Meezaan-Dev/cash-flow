import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const addTransaction = jest.fn();

jest.mock('firebase/auth', () => ({
	createUserWithEmailAndPassword: jest.fn(),
	onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
		callback({ uid: 'user-1', email: 'test@example.com' });
		return jest.fn();
	},
	signInWithEmailAndPassword: jest.fn(),
	signOut: jest.fn(),
}));

jest.mock('@cash-flow/shared', () => ({
	auth: {},
	formatCurrency: (amount: number) => `R${amount}`,
	getTransactionDateOrEpoch: () => new Date(2026, 4, 22),
	mergeCategoryOptions: (items: unknown[]) => items,
	useAccounts: () => ({
		accounts: [{ id: 'acc-1', name: 'Cheque', balance: 1000 }],
		loading: false,
	}),
	useCategoryOptions: () => ({
		categories: [{ value: 'food', label: 'Food', subcategories: [] }],
		categoryOptions: [{ value: 'food', label: 'Food' }],
		getCategoryPathLabel: (category: string) => category,
	}),
	useMainAccountPreference: () => ({
		mainAccountId: 'acc-1',
		setMainAccountId: jest.fn(),
	}),
	useTransactions: () => ({
		transactions: [
			{
				id: 'txn-1',
				title: 'Coffee',
				type: 'expense',
				amount: 35,
				category: 'food',
				subcategory: undefined,
				date: new Date(2026, 4, 22),
				createdAt: new Date(2026, 4, 22),
			},
		],
		addTransaction,
	}),
}));

describe('Mobisite App', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		addTransaction.mockReset();
		addTransaction.mockResolvedValue(undefined);
	});

	it('starts on the home dashboard with add and list options', async () => {
		render(<App />);

		expect(await screen.findByTestId('mobisite-home')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /view transactions/i })).toBeInTheDocument();
		expect(screen.queryByTestId('mobisite-nav')).not.toBeInTheDocument();
		expect(screen.queryByText('Accounts')).not.toBeInTheDocument();
		expect(screen.queryByText('Budgets')).not.toBeInTheDocument();
		expect(screen.queryByText('Reports')).not.toBeInTheDocument();
		expect(screen.queryByText('Recurring')).not.toBeInTheDocument();
		expect(screen.queryByText('Settings')).not.toBeInTheDocument();
	});

	it('shows top nav after selecting a view and keeps it while switching', async () => {
		const user = userEvent.setup();

		render(<App />);

		await user.click(await screen.findByRole('button', { name: /add transaction/i }));

		expect(screen.getByTestId('mobisite-nav')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Add transaction' })).toBeInTheDocument();
		expect(screen.getByLabelText('Title')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'List' }));

		expect(screen.getByTestId('mobisite-nav')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
		expect(screen.getByText('Coffee')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Add' }));

		expect(screen.getByTestId('mobisite-nav')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Add transaction' })).toBeInTheDocument();
		expect(screen.getByLabelText('Title')).toBeInTheDocument();
	});

	it('restores the last selected view on reload', async () => {
		window.sessionStorage.setItem('cashflow-mobisite-view', 'list');

		render(<App />);

		expect(await screen.findByTestId('mobisite-nav')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
		expect(screen.getByText('Coffee')).toBeInTheDocument();
	});

	it('confirms when a transaction is created', async () => {
		const user = userEvent.setup();

		render(<App />);
		await user.click(await screen.findByRole('button', { name: /add transaction/i }));
		await user.type(screen.getByLabelText('Title'), 'Lunch');
		await user.type(screen.getByLabelText('Amount'), '120');
		await user.click(screen.getByRole('button', { name: 'Add transaction' }));

		await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
		expect(screen.getByRole('status')).toHaveTextContent('Transaction created');
		expect(screen.getByRole('status')).toHaveTextContent('Expense "Lunch" added successfully.');
	});
});
