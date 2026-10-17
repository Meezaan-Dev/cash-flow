import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { createSelectMock } from '@/utils/test-utils/selectMock';
import TransactionForm from '../TransactionForm';

const mockAddTransaction = jest.fn();
const mockAddTransfer = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		addTransaction: mockAddTransaction,
		addTransfer: mockAddTransfer,
		updateTransaction: mockUpdateTransaction,
		recurringTransactions: [
			{
				id: 'rent',
				accountId: 'acc-main',
				title: 'Rent',
				amount: 9000,
				type: 'expense',
				category: 'home',
				subcategory: 'rent',
				description: 'Apartment',
			},
		],
	}),
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [
			{ id: 'acc-main', name: 'Main account', balance: 1200, color: '#2563eb' },
			{ id: 'acc-save', name: 'Savings', balance: 5000, color: '#16a34a' },
		],
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		categories: [
			{
				value: 'food',
				label: 'Food',
				subcategories: [{ value: 'groceries', label: 'Groceries' }],
			},
			{
				value: 'home',
				label: 'Home',
				subcategories: [{ value: 'rent', label: 'Rent' }],
			},
		],
		categoryOptions: [
			{ value: 'food', label: 'Food' },
			{ value: 'home', label: 'Home' },
		],
	}),
}));

jest.mock('@cash-flow/shared/accounts/mainAccountPreference', () => ({
	useMainAccountPreference: () => ({ mainAccountId: 'acc-main' }),
}));

jest.mock('@cash-flow/shared', () => ({
	getRecurringOccurrenceDateKey: () => '2026-07-27',
}));

jest.mock('@/components/app/ui/dialog', () => ({
	DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<p className={className}>{children}</p>
	),
	DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<header className={className}>{children}</header>
	),
	DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h2 className={className}>{children}</h2>
	),
}));

jest.mock('@/components/app/ui/select', () => createSelectMock(jest.requireActual('react')));

const selectOption = async (user: ReturnType<typeof userEvent.setup>, name: string, option: string) => {
	await user.click(screen.getByRole('combobox', { name }));
	const match = screen
		.getAllByRole('option')
		.find((item) => item.textContent?.replace(/\s+/g, ' ').includes(option));
	if (!match) throw new Error(`Option "${option}" was not found.`);
	await user.click(match);
};

const renderForm = (props: Partial<React.ComponentProps<typeof TransactionForm>> = {}) =>
	render(<TransactionForm onClose={mockOnClose} onSuccess={mockOnSuccess} {...props} />);

describe('TransactionForm', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAddTransaction.mockResolvedValue('tx-1');
		mockAddTransfer.mockResolvedValue(undefined);
		mockUpdateTransaction.mockResolvedValue(undefined);
	});

	it('shows the four required controls on one screen and saves with defaults', async () => {
		const user = userEvent.setup();
		renderForm();
		expect(screen.getByRole('button', { name: 'expense' })).toBeInTheDocument();
		expect(screen.getByLabelText('Amount *')).toBeInTheDocument();
		expect(screen.getByLabelText('Title *')).toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Category *' })).toBeInTheDocument();
		await user.type(screen.getByLabelText('Amount *'), '85');
		await user.type(screen.getByLabelText('Title *'), 'Coffee');
		await selectOption(user, 'Category *', 'Food');
		await user.click(screen.getByRole('button', { name: 'Add expense' }));

		await waitFor(() => expect(mockAddTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'expense',
				accountId: 'acc-main',
				title: 'Coffee',
				amount: 85,
				category: 'food',
				date: expect.any(Date),
			})
		));
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it('requires category before saving', async () => {
		const user = userEvent.setup();
		renderForm();
		await user.type(screen.getByLabelText('Amount *'), '85');
		await user.type(screen.getByLabelText('Title *'), 'Coffee');
		await user.click(screen.getByRole('button', { name: 'Add expense' }));
		expect(await screen.findByText('Please select a category.')).toBeInTheDocument();
		expect(mockAddTransaction).not.toHaveBeenCalled();
	});

	it('submits optional subcategory and notes from the details step', async () => {
		const user = userEvent.setup();

		renderForm();
		await user.type(screen.getByLabelText('Amount *'), '240');
		await user.type(screen.getByLabelText('Title *'), 'Groceries');
		await selectOption(user, 'Category *', 'Food');
		await user.click(screen.getByText('Optional details'));
		await selectOption(user, 'Subcategory', 'Groceries');
		await user.clear(screen.getByLabelText('Date'));
		await user.type(screen.getByLabelText('Date'), '2026-08-12');
		await user.type(screen.getByLabelText('Notes'), 'Weekly shop');
		await user.click(screen.getByRole('button', { name: 'Add expense' }));

		await waitFor(() => expect(mockAddTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Groceries',
				amount: 240,
				category: 'food',
				subcategory: 'groceries',
				description: 'Weekly shop',
				date: new Date('2026-08-12T12:00:00'),
			})
		));
	});

	it('keeps transfers out of the transaction form', () => {
		renderForm();
		expect(screen.queryByText(/Transfer between accounts/i)).not.toBeInTheDocument();
	});

	it('quick-fills from recurring templates and links the saved transaction', async () => {
		const user = userEvent.setup();

		renderForm();
		await user.click(screen.getByText('Optional details'));
		await selectOption(user, 'Quick Fill', 'Rent');
		await user.click(screen.getByRole('button', { name: 'Add expense' }));

		await waitFor(() => expect(mockAddTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				accountId: 'acc-main',
				title: 'Rent',
				amount: 9000,
				category: 'home',
				subcategory: 'rent',
				description: 'Apartment',
				recurringTransactionId: 'rent',
				recurringOccurrenceDate: '2026-07-27',
			})
		));
	});

	it('starts edits on details and closes after saving changes', async () => {
		const user = userEvent.setup();

		renderForm({
			transaction: {
				id: 'tx-1',
				accountId: 'acc-main',
				title: 'Coffee',
				amount: 45,
				type: 'expense',
				category: 'food',
				date: new Date('2026-08-10'),
			},
		});

		expect(screen.getByLabelText('Title *')).toHaveValue('Coffee');
		await user.clear(screen.getByLabelText('Title *'));
		await user.type(screen.getByLabelText('Title *'), 'Morning coffee');
		await user.click(screen.getByRole('button', { name: 'Save changes' }));

		await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalledWith(
			'tx-1',
			expect.objectContaining({
				title: 'Morning coffee',
				amount: 45,
				category: 'food',
			})
		));
		expect(mockOnClose).toHaveBeenCalled();
	});
});
