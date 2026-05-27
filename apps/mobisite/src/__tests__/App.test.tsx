import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

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
		addTransaction: jest.fn(),
	}),
}));

describe('Mobisite App', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
	});

	it('exposes only the mobile add/list navigation', async () => {
		render(<App />);

		expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
		expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
		expect(screen.queryByText('Accounts')).not.toBeInTheDocument();
		expect(screen.queryByText('Budgets')).not.toBeInTheDocument();
		expect(screen.queryByText('Reports')).not.toBeInTheDocument();
		expect(screen.queryByText('Recurring')).not.toBeInTheDocument();
		expect(screen.queryByText('Settings')).not.toBeInTheDocument();
	});

	it('keeps the mobile shell navigation visible while switching tabs', async () => {
		const user = userEvent.setup();

		render(<App />);

		expect(await screen.findByTestId('mobisite-shell')).toBeInTheDocument();
		expect(screen.getByTestId('mobisite-content')).toBeInTheDocument();
		expect(screen.getByTestId('mobisite-nav')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Add transaction' })).toBeInTheDocument();

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
		expect(screen.getByRole('button', { name: 'Add transaction' })).toBeInTheDocument();
	});
});
