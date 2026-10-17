import { render, screen } from '@testing-library/react';
import type React from 'react';
import { createSelectMock } from '@/utils/test-utils/selectMock';
import BudgetForm from '../BudgetForm';

const mockOnClose = jest.fn();

jest.mock('@/domains/budgets/context/BudgetsContext', () => ({
	useBudgetsContext: () => ({
		budgets: [],
		addBudget: jest.fn(),
		updateBudget: jest.fn(),
	}),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	useCategoriesContext: () => ({
		categories: [
			{
				id: 'cat-personal',
				value: 'personal',
				label: 'Personal',
				subcategories: [],
			},
		],
		getCategoryLabel: (value: string) => (value === 'personal' ? 'Personal' : value),
		getSubcategoryLabel: (_category: string, sub: string) => sub,
	}),
}));

jest.mock('@/components/app/ui/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/components/app/ui/side-panel', () => ({
	SidePanelContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SidePanelTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SidePanelDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SidePanelClose: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

jest.mock('@/components/app/ui/select', () => createSelectMock(jest.requireActual('react')));

describe('BudgetForm', () => {
	it('keeps defaultCategoryId after mount when creating a new budget', () => {
		render(
			<BudgetForm
				onClose={mockOnClose}
				defaultMonth="2026-10"
				defaultCategoryId="personal"
			/>
		);

		expect(screen.getByText('Personal')).toBeInTheDocument();
	});

	it('renders page layout without the side panel wrapper', () => {
		render(
			<BudgetForm
				onClose={mockOnClose}
				defaultMonth="2026-10"
				layout="page"
			/>
		);

		expect(screen.getByRole('heading', { name: 'Create a budget' })).toBeInTheDocument();
		expect(
			screen.getByText(/New budgets stay in draft until published/i)
		).toBeInTheDocument();
	});
});
