import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetsList from '../BudgetsList';
import { BudgetProgress, Transaction } from '../../../types';

const mockPublishBudget = jest.fn();

const mockDraftProgress: BudgetProgress = {
	budget: {
		id: 'draft-1',
		category: 'groceries',
		amount: 1000,
		period: 'monthly',
		status: 'draft',
		plannedStartDate: '2026-05-01',
		plannedEndDate: '2026-05-31',
	},
	status: 'draft',
	isDraft: true,
	plannedAmount: 1000,
	plannedStartDate: '2026-05-01',
	plannedEndDate: '2026-05-31',
	comparisonStartDate: '2026-05-01',
	comparisonEndDate: '2026-05-31',
	started: false,
	calculating: true,
	actualSpent: 250,
	remaining: 750,
	overBudget: 0,
	percent: 25,
};

const mockPublishedProgress: BudgetProgress = {
	budget: {
		id: 'published-1',
		category: 'transport',
		amount: 500,
		period: 'monthly',
		status: 'published',
		plannedStartDate: '2026-05-01',
		plannedEndDate: '2026-05-31',
		actualStartDate: '2026-05-01',
		actualEndDate: '2026-05-31',
	},
	status: 'published',
	isDraft: false,
	plannedAmount: 500,
	plannedStartDate: '2026-05-01',
	plannedEndDate: '2026-05-31',
	actualStartDate: '2026-05-01',
	actualEndDate: '2026-05-31',
	comparisonStartDate: '2026-05-01',
	comparisonEndDate: '2026-05-31',
	started: true,
	calculating: true,
	actualSpent: 100,
	remaining: 400,
	overBudget: 0,
	percent: 20,
};

const mockTransactions: Transaction[] = [
	{
		id: 'transaction-1',
		accountId: 'account-1',
		title: 'Supermarket',
		amount: 250,
		type: 'expense',
		category: 'groceries',
		date: new Date('2026-05-10T12:00:00Z'),
	},
];

jest.mock('../../../context/BudgetsContext', () => ({
	useBudgetsContext: () => ({
		budgets: [mockDraftProgress.budget, mockPublishedProgress.budget],
		loading: false,
		addBudget: jest.fn(),
		addDraftBudget: jest.fn(),
		updateBudget: jest.fn(),
		startBudget: jest.fn(),
		publishBudget: mockPublishBudget,
		deleteBudget: jest.fn(),
		getBudgetProgress: jest.fn(),
		getAllBudgetProgress: jest.fn(() => [mockDraftProgress, mockPublishedProgress]),
	}),
}));

jest.mock('../../../context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: mockTransactions,
	}),
}));

jest.mock('../../../context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		getCategoryLabel: (category: string) =>
			category === 'groceries' ? 'Groceries' : 'Transport',
		categoryOptions: [
			{ value: 'groceries', label: 'Groceries' },
			{ value: 'transport', label: 'Transport' },
		],
	}),
}));

describe('BudgetsList draft publishing', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('separates draft and published budgets and shows live draft calculations', () => {
		render(<BudgetsList />);

		expect(screen.getByText('Draft Budgets')).toBeInTheDocument();
		expect(screen.getByText('Published Budgets')).toBeInTheDocument();
		expect(screen.getByText('Live draft calculations for the planned period')).toBeInTheDocument();
		expect(screen.getByText(/250,00 actual spend/)).toBeInTheDocument();
		expect(screen.getByText('Supermarket')).toBeInTheDocument();
	});

	it('publishes a draft without replacing existing published budgets', async () => {
		const user = userEvent.setup();
		render(<BudgetsList />);

		await user.click(screen.getByRole('button', { name: /publish/i }));

		await waitFor(() => {
			expect(mockPublishBudget).toHaveBeenCalledWith('draft-1');
		});
		expect(screen.getByText('Published Budgets')).toBeInTheDocument();
	});
});
