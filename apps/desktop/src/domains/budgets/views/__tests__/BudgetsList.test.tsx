import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetsList from '../BudgetsList';
import {
	getMonthDateRange,
} from '@/domains/budgets/models/BudgetModel';

const mockMonth = '2026-06';
const mockRange = getMonthDateRange(mockMonth);
const mockPublishBudget = jest.fn();
const mockRepeatBudget = jest.fn();
const mockDeleteBudget = jest.fn();
const mockReorderBudgets = jest.fn();
const mockNavigate = jest.fn();
const categoryLabels: Record<string, string> = {
	bills: 'Bills',
	food: 'Food',
	petrol: 'Petrol',
	travel: 'Travel',
};

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

const renderBudgets = () =>
	render(
		<MemoryRouter>
			<BudgetsList />
		</MemoryRouter>
	);

const textContentMatches = (expected: RegExp) => (
	_content: string,
	element: Element | null
) => Boolean(element?.textContent?.replace(/\s/g, ' ').match(expected));

jest.mock('@/domains/budgets/context/BudgetsContext', () => ({
	useBudgetsContext: () => ({
		budgets: [
			{
				id: 'draft-petrol',
				userId: 'user-1',
				categoryId: 'petrol',
				amount: 1000,
				period: 'monthly',
				month: mockMonth,
				startDate: mockRange.startDate,
				endDate: mockRange.endDate,
				lifecycleStatus: 'draft',
				displayOrder: 0,
			},
			{
				id: 'active-takeaways',
				userId: 'user-1',
				categoryId: 'food',
				subCategoryId: 'takeaways',
				amount: 1500,
				period: 'monthly',
				month: mockMonth,
				startDate: mockRange.startDate,
				endDate: mockRange.endDate,
				lifecycleStatus: 'published',
				displayOrder: 1,
			},
			{
				id: 'warning-food',
				userId: 'user-1',
				categoryId: 'food',
				subCategoryId: 'groceries',
				amount: 1000,
				period: 'monthly',
				month: mockMonth,
				startDate: mockRange.startDate,
				endDate: mockRange.endDate,
				lifecycleStatus: 'published',
				displayOrder: 2,
			},
			{
				id: 'over-petrol',
				userId: 'user-1',
				categoryId: 'petrol',
				amount: 100,
				period: 'monthly',
				month: mockMonth,
				startDate: mockRange.startDate,
				endDate: mockRange.endDate,
				lifecycleStatus: 'published',
				displayOrder: 3,
			},
			{
				id: 'next-month-travel',
				userId: 'user-1',
				categoryId: 'travel',
				amount: 2200,
				period: 'monthly',
				month: '2099-01',
				startDate: '2099-01-01',
				endDate: '2099-01-31',
				lifecycleStatus: 'draft',
				displayOrder: 4,
			},
			{
				id: 'cycle-bills',
				userId: 'user-1',
				categoryId: 'bills',
				amount: 1000,
				period: 'custom',
				cycleDay: 26,
				startDate: '2026-05-26',
				endDate: '2026-06-26',
				lifecycleStatus: 'published',
				displayOrder: 5,
			},
		],
		deleteBudget: mockDeleteBudget,
		publishBudget: mockPublishBudget,
		repeatBudget: mockRepeatBudget,
		reorderBudgets: mockReorderBudgets,
	}),
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	useTransactionsContext: () => ({
		transactions: [
			{
				id: 'takeaways',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Dinner',
				amount: 920,
				type: 'expense',
				category: 'food',
				subcategory: 'takeaways',
				date: new Date(`${mockMonth}-10T12:00:00`),
			},
			{
				id: 'groceries',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Groceries',
				amount: 800,
				type: 'expense',
				category: 'food',
				subcategory: 'groceries',
				date: new Date(`${mockMonth}-11T12:00:00`),
			},
			{
				id: 'fuel',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Fuel',
				amount: 120,
				type: 'expense',
				category: 'petrol',
				date: new Date(`${mockMonth}-12T12:00:00`),
			},
			{
				id: 'old-cycle-bill',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Old bill',
				amount: 700,
				type: 'expense',
				category: 'bills',
				date: new Date('2026-06-25T12:00:00'),
			},
			{
				id: 'current-cycle-bill',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Current bill',
				amount: 500,
				type: 'expense',
				category: 'bills',
				date: new Date('2026-06-26T12:00:00'),
			},
			{
				id: 'renewal-boundary-bill',
				userId: 'user-1',
				accountId: 'account-1',
				title: 'Next bill',
				amount: 900,
				type: 'expense',
				category: 'bills',
				date: new Date('2026-07-26T12:00:00'),
			},
		],
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		categories: [
			{
				id: 'food',
				value: 'food',
				label: 'Food',
				subcategories: [
					{ value: 'takeaways', label: 'Takeaways' },
					{ value: 'groceries', label: 'Groceries' },
				],
			},
			{
				id: 'petrol',
				value: 'petrol',
				label: 'Petrol',
				subcategories: [],
			},
			{
				id: 'travel',
				value: 'travel',
				label: 'Travel',
				subcategories: [],
			},
			{
				id: 'bills',
				value: 'bills',
				label: 'Bills',
				subcategories: [],
			},
		],
		getCategoryLabel: (category: string) => categoryLabels[category] ?? 'Petrol',
		getSubcategoryLabel: (_category: string, subcategory?: string) =>
			subcategory === 'groceries' ? 'Groceries' : 'Takeaways',
	}),
}));

describe('BudgetsList', () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.setSystemTime(new Date('2026-06-27T12:00:00'));
	});

	it('separates drafts and active budgets with explicit titles', () => {
		renderBudgets();
		expect(screen.getByText('Draft budgets')).toBeInTheDocument();
		expect(screen.getByText('Active budgets')).toBeInTheDocument();
		expect(screen.getAllByText('Petrol').length).toBeGreaterThan(0);
		expect(screen.getByText('Food · Takeaways')).toBeInTheDocument();
		expect(screen.queryByText('All category spending')).not.toBeInTheDocument();
		expect(screen.getAllByText('Tracks all Petrol expenses').length).toBeGreaterThan(0);
		expect(screen.getByText('Other budget periods')).toBeInTheDocument();
		expect(screen.getByText('Travel')).toBeInTheDocument();
		expect(screen.getByText('6 of 8 budgets created')).toBeInTheDocument();
	});

	it('shows concise dates, sentence metrics, and status states', () => {
		renderBudgets();
		const monthLabel = new Date(`${mockMonth}-01T12:00:00`).toLocaleDateString(
			'en-ZA',
			{ month: 'long', year: 'numeric' }
		);
		expect(screen.getAllByText(monthLabel).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/spent of/).length).toBeGreaterThan(0);
		expect(screen.getAllByText('On track').length).toBeGreaterThan(0);
		expect(screen.getByText('Watch spending')).toBeInTheDocument();
		expect(screen.getByText('Over budget')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '61 percent used' })).toBeInTheDocument();
		expect(screen.getAllByText('Budget name').length).toBeGreaterThan(0);
		expect(screen.getAllByTestId('budget-list')[0]).toHaveClass('rounded-2xl');
	});

	it('publishes a draft and opens the side-panel form', async () => {
		renderBudgets();
		fireEvent.click(screen.getByRole('button', { name: 'Publish Petrol' }));
		await waitFor(() =>
			expect(mockPublishBudget).toHaveBeenCalledWith('draft-petrol')
		);

		fireEvent.click(screen.getByRole('button', { name: 'New budget' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Create a budget')).toBeInTheDocument();
		expect(screen.getByText('What are you budgeting?')).toBeInTheDocument();
		expect(screen.getByText('How much?')).toBeInTheDocument();
		expect(screen.getByText('For when?')).toBeInTheDocument();
	});

	it('reorders budgets from the row controls and persists the order', async () => {
		renderBudgets();

		fireEvent.click(
			screen.getByRole('button', { name: 'Move Food · Groceries down' })
		);

		await waitFor(() =>
			expect(mockReorderBudgets).toHaveBeenCalledWith([
				'draft-petrol',
				'active-takeaways',
				'over-petrol',
				'warning-food',
				'next-month-travel',
				'cycle-bills',
			])
		);
	});

	it('opens transaction history with the selected budget scope', () => {
		renderBudgets();

		fireEvent.click(
			screen.getByRole('button', {
				name: 'View transactions for Food · Groceries',
			})
		);

		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining(
				'/dashboard/transactions?category=food&subcategory=groceries&type=expense'
			)
		);
		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining(`from=${mockRange.startDate}`)
		);
		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining(`to=${mockRange.endDate}`)
		);
	});

	it('uses the active rolling cycle for custom budget display and history links', () => {
		renderBudgets();

		expect(screen.getByText('Bills')).toBeInTheDocument();
		expect(screen.getByText('26 Jun – 26 Jul 2026')).toBeInTheDocument();
		expect(
			screen.getByText(textContentMatches(/^R 500,00 spent of R 1 000,00$/))
		).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '50 percent used' })).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole('button', {
				name: 'View transactions for Bills',
			})
		);

		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining('/dashboard/transactions?category=bills&type=expense')
		);
		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining('from=2026-06-26')
		);
		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining('to=2026-07-26')
		);
		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining('endExclusive=1')
		);
	});
});
