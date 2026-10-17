import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMonthDateRange } from '@/domains/budgets/models/BudgetModel';
import PlanBudgetsTab from '../PlanBudgetsTab';

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const monthRange = getMonthDateRange(currentMonth);

const mockPublishBudget = jest.fn();
const mockDeleteBudget = jest.fn();

const mockBudgetForm = jest.fn(({ budget }: { budget?: { id?: string } }) => (
	<div>Budget form {budget?.id ?? 'new'}</div>
));

jest.mock('@/domains/budgets/views/BudgetForm', () => ({
	__esModule: true,
	default: (props: { budget?: { id?: string } }) => mockBudgetForm(props),
}));

jest.mock('@/domains/budgets/context/BudgetsContext', () => ({
	useBudgetsContext: () => ({
		budgets: [
			{
				id: 'budget-1',
				userId: 'user-1',
				categoryId: 'personal',
				amount: 2000,
				period: 'monthly',
				month: currentMonth,
				startDate: monthRange.startDate,
				endDate: monthRange.endDate,
				lifecycleStatus: 'draft',
			},
		],
		publishBudget: mockPublishBudget,
		deleteBudget: mockDeleteBudget,
	}),
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [],
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		getCategoryLabel: (value: string) => (value === 'personal' ? 'Personal' : value),
		getSubcategoryLabel: (_category: string, sub: string) => sub,
	}),
}));

jest.mock('@/hooks/useCurrentDate', () => ({
	useCurrentDate: () => new Date(`${currentMonth}-15T12:00:00`),
}));

describe('PlanBudgetsTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
});
