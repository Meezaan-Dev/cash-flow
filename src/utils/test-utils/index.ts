import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/context/ThemeContext';

// Mock user data for authentication tests
export const mockUser = {
	uid: 'test-user-id',
	email: 'test@example.com',
	displayName: 'Test User',
	photoURL: 'https://example.com/photo.jpg',
};

// Import the mocked auth from setupTests
import { auth } from '@/services/firebase';

// Setup authenticated user
export const setupAuthenticatedUser = () => {
	// Mock the auth.currentUser
	Object.defineProperty(auth, 'currentUser', {
		value: mockUser,
		writable: true,
	});

	// Mock onAuthStateChanged to call callback with user
	(auth.onAuthStateChanged as jest.Mock).mockImplementation(
		(callback: (user: unknown) => void) => {
			callback(mockUser);
			return jest.fn(); // Return unsubscribe function
		}
	);
};

// Setup unauthenticated user
export const setupUnauthenticatedUser = () => {
	// Mock the auth.currentUser
	Object.defineProperty(auth, 'currentUser', {
		value: null,
		writable: true,
	});

	// Mock onAuthStateChanged to call callback with null
	(auth.onAuthStateChanged as jest.Mock).mockImplementation(
		(callback: (user: unknown) => void) => {
			callback(null);
			return jest.fn(); // Return unsubscribe function
		}
	);
};

// Clear all mocks
export const clearAllMocks = () => {
	jest.clearAllMocks();

	// Reset auth.currentUser
	Object.defineProperty(auth, 'currentUser', {
		value: null,
		writable: true,
	});

	// Reset onAuthStateChanged mock
	(auth.onAuthStateChanged as jest.Mock).mockClear();

	// Reset signOut mock if it exists
	if (auth.signOut && typeof auth.signOut === 'function') {
		(auth.signOut as jest.Mock).mockClear();
	}
};

// Custom render function with providers for authentication tests
interface AllTheProvidersProps {
	children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
	return React.createElement(
		BrowserRouter,
		{},
		React.createElement(ThemeProvider, { children }, children)
	);
};

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
	render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
