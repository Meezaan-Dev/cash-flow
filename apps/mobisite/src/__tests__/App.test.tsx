import { render, screen } from '@testing-library/react';
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
		transactions: [],
		addTransaction: jest.fn(),
	}),
}));

describe('Mobisite App', () => {
	it('exposes only the mobile add/list navigation', async () => {
		render(<App />);

		expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
		expect(screen.queryByText('Budgets')).not.toBeInTheDocument();
		expect(screen.queryByText('Reports')).not.toBeInTheDocument();
		expect(screen.queryByText('Recurring')).not.toBeInTheDocument();
		expect(screen.queryByText('Settings')).not.toBeInTheDocument();
	});
});
