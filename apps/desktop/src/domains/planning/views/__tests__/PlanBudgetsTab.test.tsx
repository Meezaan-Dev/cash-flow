import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMonthDateRange } from '@/domains/budgets/models/BudgetModel';
import PlanBudgetsTab from '../PlanBudgetsTab';

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const monthRange = getMonthDateRange(currentMonth);

const mockPublishBudget = jest.fn();
const mockDeleteBudget = jest.fn();
const mockBudgets = [
	{
		id: 'budget-1',
		userId: 'user-1',
		categoryId: 'personal',
		amount: 2000,
		period: 'monthly' as 'monthly' | 'custom',
		month: currentMonth,
		startDate: monthRange.startDate,
		endDate: monthRange.endDate,
		lifecycleStatus: 'draft' as 'draft' | 'published',
	},
];
const mockTransactions: Array<Record<string, unknown>> = [];
let mockReferenceDate = new Date(`${currentMonth}-15T12:00:00`);

const mockBudgetForm = jest.fn(({ budget }: { budget?: { id?: string } }) => (
	<div>Budget form {budget?.id ?? 'new'}</div>
));

jest.mock('@/domains/budgets/views/BudgetForm', () => ({
	__esModule: true,
	default: (props: { budget?: { id?: string } }) => mockBudgetForm(props),
}));

jest.mock('@/domains/budgets/context/BudgetsContext', () => ({
	useBudgetsContext: () => ({
		budgets: mockBudgets,
		publishBudget: mockPublishBudget,
		deleteBudget: mockDeleteBudget,
	}),
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: mockTransactions,
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		getCategoryLabel: (value: string) => (value === 'personal' ? 'Personal' : value),
		getSubcategoryLabel: (_category: string, sub: string) => sub,
	}),
}));

jest.mock('@/hooks/useCurrentDate', () => ({
	useCurrentDate: () => mockReferenceDate,
}));

describe('PlanBudgetsTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockReferenceDate = new Date(`${currentMonth}-15T12:00:00`);
		mockBudgets.splice(0, mockBudgets.length, {
			id: 'budget-1',
			userId: 'user-1',
			categoryId: 'personal',
			amount: 2000,
			period: 'monthly',
			month: currentMonth,
			startDate: monthRange.startDate,
			endDate: monthRange.endDate,
			lifecycleStatus: 'draft',
		});
		mockTransactions.splice(0);
	});

	it('activates a draft budget from the list', async () => {
		const user = userEvent.setup();
		render(<PlanBudgetsTab defaultMonth={currentMonth} />);

		await user.click(screen.getByRole('button', { name: /^Activate$/i }));

		expect(mockPublishBudget).toHaveBeenCalledWith('budget-1');
	});

	it('opens the inline form when editing a draft budget', async () => {
		const user = userEvent.setup();
		render(<PlanBudgetsTab defaultMonth={currentMonth} />);

		mockBudgetForm.mockClear();
		await user.click(screen.getByRole('button', { name: /^Edit$/i }));

		expect(mockBudgetForm).toHaveBeenCalledWith(
			expect.objectContaining({
				layout: 'page',
				budget: expect.objectContaining({ id: 'budget-1' }),
			})
		);
		expect(screen.getByText('Budget form budget-1')).toBeInTheDocument();
	});

	it('opens a blank inline form from Add budget', async () => {
		const user = userEvent.setup();
		render(<PlanBudgetsTab defaultMonth={currentMonth} />);

		mockBudgetForm.mockClear();
		await user.click(screen.getByRole('button', { name: /add budget/i }));

		expect(mockBudgetForm).toHaveBeenCalledWith(
			expect.objectContaining({ layout: 'page', budget: undefined })
		);
		expect(screen.getByText('Budget form new')).toBeInTheDocument();
	});

	it('calculates custom-cycle spending for the selected month', () => {
		mockBudgets.splice(0, mockBudgets.length, {
			id: 'custom-budget',
			userId: 'user-1',
			categoryId: 'personal',
			amount: 1000,
			period: 'custom',
			cycleDay: 25,
			startDate: '2026-01-25',
			endDate: '2026-02-25',
			lifecycleStatus: 'published',
		});
		mockTransactions.push({
			id: 'expense-in-selected-cycle',
			userId: 'user-1',
			accountId: 'account-1',
			title: 'Selected cycle expense',
			amount: 125,
			type: 'expense',
			category: 'personal',
			date: new Date('2026-02-01T12:00:00Z'),
		});

		render(<PlanBudgetsTab defaultMonth="2026-02" />);

		expect(screen.getAllByText(/125,00/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/875,00/).length).toBeGreaterThan(0);
	});

	it('resets current-month spending on the renewal day', () => {
		mockReferenceDate = new Date('2026-06-26T12:00:00');
		mockBudgets.splice(0, mockBudgets.length, {
			id: 'custom-budget',
			userId: 'user-1',
			categoryId: 'personal',
			amount: 1000,
			period: 'custom',
			cycleDay: 26,
			startDate: '2026-05-26',
			endDate: '2026-06-26',
			lifecycleStatus: 'published',
		});
		mockTransactions.push(
			{
				id: 'previous-cycle',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Previous cycle',
				amount: 700,
				type: 'expense',
				category: 'personal',
				date: new Date('2026-06-25T12:00:00'),
			},
			{
				id: 'new-cycle',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'New cycle',
				amount: 200,
				type: 'expense',
				category: 'personal',
				date: new Date('2026-06-26T12:00:00'),
			}
		);

		render(<PlanBudgetsTab defaultMonth="2026-06" />);

		expect(screen.getAllByText(/200,00/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/800,00/).length).toBeGreaterThan(0);
		expect(screen.queryByText(/700,00/)).not.toBeInTheDocument();
		expect(screen.getByText(/26 Jun – 26 Jul 2026/)).toBeInTheDocument();
	});
});
