import '@testing-library/jest-dom';
import React from 'react';

// Mock Firebase for authentication tests
jest.mock('@/services/firebase', () => ({
	auth: {
		currentUser: null,
		onAuthStateChanged: jest.fn((callback: (user: unknown) => void) => {
			// Call the callback immediately with null
			callback(null);
			// Return a proper unsubscribe function
			return jest.fn();
		}),
		signOut: jest.fn(),
	},
	db: {},
	googleProvider: {},
}));

// Mock React Router for navigation tests
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	BrowserRouter: ({ children }: { children: React.ReactNode }) =>
		React.createElement('div', {}, children),
	useNavigate: () => jest.fn(),
}));

// Mock localStorage for token storage tests
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn(),
	length: 0,
	key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// Mock IntersectionObserver for component tests
Object.defineProperty(global, 'IntersectionObserver', {
	writable: true,
	value: jest.fn().mockImplementation(() => ({
		observe: jest.fn(),
		unobserve: jest.fn(),
		disconnect: jest.fn(),
	})),
});

// Mock ResizeObserver for component tests
Object.defineProperty(global, 'ResizeObserver', {
	writable: true,
	value: jest.fn().mockImplementation(() => ({
		observe: jest.fn(),
		unobserve: jest.fn(),
		disconnect: jest.fn(),
	})),
});

// Mock TextEncoder and TextDecoder if not available
if (typeof global.TextEncoder === 'undefined') {
	// Mock TextEncoder
	Object.defineProperty(global, 'TextEncoder', {
		value: class TextEncoder {
			encode(text: string): Uint8Array {
				return new Uint8Array(Buffer.from(text, 'utf8'));
			}
		},
	});

	// Mock TextDecoder
	Object.defineProperty(global, 'TextDecoder', {
		value: class TextDecoder {
			decode(bytes: Uint8Array): string {
				return Buffer.from(bytes).toString('utf8');
			}
		},
	});
}
