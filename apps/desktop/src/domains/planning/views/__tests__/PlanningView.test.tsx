import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { createSelectMock } from '@/utils/test-utils/selectMock';
import PlanningView from '@/domains/planning/views/PlanningView';

const mockAddPlannedExpense = jest.fn();
const mockUpdatePlannedExpense = jest.fn();
const mockDeletePlannedExpense = jest.fn();
const mockReorderPlannedExpenses = jest.fn();
const mockAddPaymentPlan = jest.fn();
const mockUpdatePaymentPlan = jest.fn();
const mockDeletePaymentPlan = jest.fn();
const mockConvertPlannedExpense = jest.fn();
const mockLinkPaymentTransaction = jest.fn();
const mockUnlinkPaymentTransaction = jest.fn();
const mockAddTransaction = jest.fn();

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

jest.mock('@/domains/planning/context/PlanningContext', () => ({
	usePlanningContext: () => ({
		plannedExpenses: [
			{
				id: 'planned-1',
				userId: 'user-1',
				title: 'Running shoes',
				amount: 900,
				targetMonth: currentMonth,
				category: 'personal',
				status: 'planned',
				priority: 'high',
				displayOrder: 0,
			},
			{
				id: 'wishlist-1',
				userId: 'user-1',
				title: 'Desk lamp',
				amount: 450,
				category: 'home',
				status: 'wishlist',
				displayOrder: 1,
			},
		],
		paymentPlans: [],
		addPlannedExpense: mockAddPlannedExpense,
		updatePlannedExpense: mockUpdatePlannedExpense,
		deletePlannedExpense: mockDeletePlannedExpense,
		reorderPlannedExpenses: mockReorderPlannedExpenses,
		addPaymentPlan: mockAddPaymentPlan,
		updatePaymentPlan: mockUpdatePaymentPlan,
		deletePaymentPlan: mockDeletePaymentPlan,
		convertPlannedExpense: mockConvertPlannedExpense,
		linkPaymentTransaction: mockLinkPaymentTransaction,
		unlinkPaymentTransaction: mockUnlinkPaymentTransaction,
		calculatePlannedExpenseTotal: () => 900,
		calculatePaymentPlansProgress: () => [],
		getRemainingPlannedExpenses: () => [
			{
				id: 'planned-1',
				userId: 'user-1',
				title: 'Running shoes',
				amount: 900,
				targetMonth: currentMonth,
				category: 'personal',
				status: 'planned',
			},
		],
		getCurrentMonthKey: () => currentMonth,
	}),
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [],
		addTransaction: mockAddTransaction,
	}),
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
	useAccountsContext: () => ({
		accounts: [{ id: 'acc-1', name: 'Main Account', type: 'debit', balance: 1000 }],
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		categories: [
			{
				value: 'personal',
				label: 'Personal',
				subcategories: [{ value: 'clothing', label: 'Clothing' }],
			},
			{ value: 'home', label: 'Home', subcategories: [] },
		],
		categoryOptions: [
			{ value: 'personal', label: 'Personal' },
			{ value: 'home', label: 'Home' },
		],
		getCategoryPathLabel: (category: string, subcategory?: string) =>
			subcategory ? `${category} / ${subcategory}` : category,
		getCategoryLabel: (category: string) => category,
	}),
}));

jest.mock('@/components/app/ui/use-toast', () => ({
	useToast: () => ({
		toast: jest.fn(),
	}),
}));

jest.mock('@/components/app/ui/select', () => createSelectMock(jest.requireActual('react')));

describe('PlanningView', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAddPlannedExpense.mockResolvedValue('planned-new');
		mockUpdatePlannedExpense.mockResolvedValue(undefined);
		mockReorderPlannedExpenses.mockResolvedValue(undefined);
	});

	it('filters plans and wishlist with active-tab totals', async () => {
		const user = userEvent.setup();
		render(<PlanningView />);

		expect(screen.getByText('Running shoes')).toBeInTheDocument();
		expect(screen.getByText('Desk lamp')).toBeInTheDocument();
		expect(screen.getByText('Total amount')).toBeInTheDocument();
		expect(screen.getByText('High priority')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /^planned$/i }));

		expect(screen.getByText('Running shoes')).toBeInTheDocument();
		expect(screen.queryByText('Desk lamp')).not.toBeInTheDocument();
		expect(screen.getByText('Items')).toBeInTheDocument();

		await user.click(screen.getAllByRole('button', { name: /^wishlist$/i })[1]);

		expect(screen.queryByText('Running shoes')).not.toBeInTheDocument();
		expect(screen.getByText('Desk lamp')).toBeInTheDocument();
		expect(screen.getByText('Total amount')).toBeInTheDocument();
	});

	it('persists row order from the move controls', async () => {
		const user = userEvent.setup();
		render(<PlanningView />);

		await user.click(screen.getByRole('button', { name: /move desk lamp up/i }));

		await waitFor(() =>
			expect(mockReorderPlannedExpenses).toHaveBeenCalledWith(['wishlist-1', 'planned-1'])
		);
	});

	it('starts new planning from intent choices', async () => {
		const user = userEvent.setup();
		render(<PlanningView />);

		await user.click(screen.getByRole('button', { name: /add plan/i }));

		expect(screen.getByText('What are you planning?')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /a planned expense/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /a wishlist item/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /a payment plan/i })).toBeInTheDocument();
	});

	it('saves a planned expense from the guided wizard', async () => {
		const user = userEvent.setup();
		render(<PlanningView />);

		await user.click(screen.getByRole('button', { name: /add plan/i }));
		await user.click(screen.getByRole('button', { name: /a planned expense/i }));

		await user.type(screen.getByRole('textbox'), 'Winter jacket');
		await user.type(screen.getByRole('spinbutton'), '1200');
		await user.click(screen.getByRole('button', { name: /continue/i }));

		fireEvent.click(screen.getAllByRole('combobox')[0]);
		fireEvent.click(screen.getByRole('option', { name: 'Personal' }));
		await user.click(screen.getByRole('button', { name: /continue/i }));
		await user.click(screen.getByRole('button', { name: /save/i }));

		await waitFor(() =>
			expect(mockAddPlannedExpense).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Winter jacket',
					amount: 1200,
					category: 'personal',
					status: 'planned',
				})
			)
		);
	});

	it('saves a wishlist item in one step with title, link, and estimated price', async () => {
		const user = userEvent.setup();
		render(<PlanningView />);

		await user.click(screen.getAllByRole('button', { name: /^wishlist$/i })[0]);

		expect(screen.getByText('Title, optional link, and estimated price.')).toBeInTheDocument();

		const textboxes = screen.getAllByRole('textbox');
		await user.type(textboxes[0], 'Standing desk');
		await user.type(screen.getByRole('spinbutton'), '3500');
		await user.type(textboxes[1], 'https://example.com/desk');
		await user.click(screen.getByRole('button', { name: /save/i }));

		await waitFor(() =>
			expect(mockAddPlannedExpense).toHaveBeenCalledWith({
				title: 'Standing desk',
				amount: 3500,
				category: 'Wishlist',
				url: 'https://example.com/desk',
				status: 'wishlist',
			})
		);
	});

	it('plans a wishlist item through the planned-expense wizard', async () => {
		const user = userEvent.setup();
		render(<PlanningView />);

		await user.click(screen.getByRole('button', { name: /plan it/i }));
		expect(screen.getByDisplayValue('Desk lamp')).toBeInTheDocument();
		expect(screen.getByDisplayValue('450')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /continue/i }));
		fireEvent.click(screen.getAllByRole('combobox')[0]);
		fireEvent.click(screen.getByRole('option', { name: 'Home' }));
		await user.click(screen.getByRole('button', { name: /continue/i }));
		await user.click(screen.getByRole('button', { name: /save/i }));

		await waitFor(() =>
			expect(mockUpdatePlannedExpense).toHaveBeenCalledWith(
				'wishlist-1',
				expect.objectContaining({
					title: 'Desk lamp',
					amount: 450,
					category: 'home',
					status: 'planned',
					displayOrder: 1,
				})
			)
		);
	});
});
