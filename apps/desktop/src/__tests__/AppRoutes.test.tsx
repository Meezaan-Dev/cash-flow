import React from 'react';
import { render, screen } from '@testing-library/react';

let mockInitialPath = '/';
let mockAuthUser: unknown = { uid: 'user-1', email: 'test@example.com' };

const setMobileViewport = (isMobile: boolean) => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: jest.fn().mockImplementation((query: string) => ({
			matches: query === '(max-width: 767px)' ? isMobile : false,
			media: query,
			onchange: null,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		})),
	});
};

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

jest.mock('@/app/theme/context/ThemeContext', () => ({
	ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/shared/filters/context/FilterPreferencesContext', () => ({
	FilterPreferencesProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

jest.mock('@/domains/categories/context/CategoriesContext', () => ({
	CategoriesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/domains/transactions/context/TransactionsContext', () => ({
	TransactionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/domains/accounts/context/AccountsContext', () => ({
	AccountsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/domains/budgets/context/BudgetsContext', () => ({
	BudgetsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/services/firebase', () => ({
	auth: {},
}));

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
		callback(mockAuthUser);
		return jest.fn();
	},
}));

jest.mock('@/pages/marketing/Home', () => ({
	__esModule: true,
	default: () => <div>Marketing home</div>,
}));

jest.mock('@/domains/ai/components/AIChatbot', () => ({
	__esModule: true,
	default: () => <div>AI assistant</div>,
}));

jest.mock('@/pages/dashboard/Dashboard', () => ({
	__esModule: true,
	default: () => <div>Desktop dashboard</div>,
}));

jest.mock('@/pages/accounts/AccountDetail', () => ({
	__esModule: true,
	default: () => <div>Account detail</div>,
}));

jest.mock('@/pages/mobisite/MobisiteFrame', () => ({
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

	beforeEach(() => {
		mockAuthUser = { uid: 'user-1', email: 'test@example.com' };
		setMobileViewport(false);
	});

	it('redirects root to the desktop dashboard route', async () => {
		mockInitialPath = '/';

		render(<App />);

		expect(await screen.findByText('Desktop dashboard')).toBeInTheDocument();
	});

	it('redirects authenticated mobile root to mobisite', async () => {
		mockInitialPath = '/';
		setMobileViewport(true);

		render(<App />);

		expect(await screen.findByTestId('mobisite-frame')).toBeInTheDocument();
		expect(screen.queryByText('Desktop dashboard')).not.toBeInTheDocument();
	});

	it('renders the desktop shell at /dashboard', () => {
		mockInitialPath = '/dashboard';

		render(<App />);

		expect(screen.getByText('Desktop dashboard')).toBeInTheDocument();
	});

	it('renders the desktop shell at /dashboard/assistant', () => {
		mockInitialPath = '/dashboard/assistant';
		render(<App />);
		expect(screen.getByText('Desktop dashboard')).toBeInTheDocument();
	});

	it('renders the desktop shell at /dashboard/random', () => {
		mockInitialPath = '/dashboard/random';
		render(<App />);
		expect(screen.getByText('Desktop dashboard')).toBeInTheDocument();
	});

	it('redirects authenticated mobile dashboard routes to mobisite', async () => {
		mockInitialPath = '/dashboard/reports';
		setMobileViewport(true);

		render(<App />);

		expect(await screen.findByTestId('mobisite-frame')).toBeInTheDocument();
		expect(screen.queryByText('Desktop dashboard')).not.toBeInTheDocument();
	});

	it('shows the homepage for unauthenticated mobile dashboard routes', async () => {
		mockInitialPath = '/dashboard';
		mockAuthUser = null;
		setMobileViewport(true);

		render(<App />);

		expect(await screen.findByText('Marketing home')).toBeInTheDocument();
		expect(screen.queryByText('Desktop dashboard')).not.toBeInTheDocument();
		expect(screen.queryByTestId('mobisite-frame')).not.toBeInTheDocument();
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
