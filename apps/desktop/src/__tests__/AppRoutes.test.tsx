import React from 'react';
import { render, screen } from '@testing-library/react';

let mockInitialPath = '/';

jest.mock('react-router-dom', () => {
	const ReactForRouter = jest.requireActual('react') as typeof React;
	const actual = jest.requireActual('react-router-dom');

	return {
		...actual,
		BrowserRouter: ({ children }: { children: React.ReactNode }) =>
			ReactForRouter.createElement(
				actual.MemoryRouter,
				{ initialEntries: [mockInitialPath] },
				children
			),
	};
});

jest.mock('@/features/theme/context/ThemeContext', () => ({
	ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/filters/context/FilterPreferencesContext', () => ({
	FilterPreferencesProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

jest.mock('@/features/categories/context/CategoriesContext', () => ({
	CategoriesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/transactions/context/TransactionsContext', () => ({
	TransactionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/accounts/context/AccountsContext', () => ({
	AccountsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/budgets/context/BudgetsContext', () => ({
	BudgetsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/auth/components/ProtectedRoute', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/dashboard/pages/Dashboard', () => ({
	__esModule: true,
	default: () => <div>Desktop dashboard</div>,
}));

jest.mock('@/features/accounts/pages/AccountDetail', () => ({
	__esModule: true,
	default: () => <div>Account detail</div>,
}));

jest.mock('@/features/mobisite/pages/MobisiteFrame', () => ({
	__esModule: true,
	default: () => (
		<div data-testid="mobisite-frame">
			<button>Add</button>
			<button>List</button>
		</div>
	),
}));

let App: React.ComponentType;

describe('App routing', () => {
	beforeAll(async () => {
		App = (await import('../App')).default;
	});

	it('redirects root to the desktop dashboard route', async () => {
		mockInitialPath = '/';

		render(<App />);

		expect(await screen.findByText('Desktop dashboard')).toBeInTheDocument();
	});

	it('renders the desktop shell at /dashboard', () => {
		mockInitialPath = '/dashboard';

		render(<App />);

		expect(screen.getByText('Desktop dashboard')).toBeInTheDocument();
	});

	it('renders the mobisite route in its own frame', () => {
		mockInitialPath = '/mobisite';

		render(<App />);

		expect(screen.getByTestId('mobisite-frame')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
		expect(screen.queryByText('Budgets')).not.toBeInTheDocument();
		expect(screen.queryByText('Reports')).not.toBeInTheDocument();
	});
});
