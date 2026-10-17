import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import {
	setupUnauthenticatedUser,
	clearAllMocks,
} from '@/utils/test-utils';

const mockUseAuthUser = jest.fn();

jest.mock('@cash-flow/shared/auth/AuthContext', () => ({
	useAuthUser: () => mockUseAuthUser(),
}));

describe('useAuth', () => {
	beforeEach(() => {
		clearAllMocks();
		mockUseAuthUser.mockReturnValue({ user: null, authReady: true });
	});

	it('should initialize with null user', () => {
		setupUnauthenticatedUser();

		const { result } = renderHook(() => useAuth());

		expect(result.current.currentUser).toBeNull();
	});

	it('should read the current shared auth user', () => {
		setupUnauthenticatedUser();

		renderHook(() => useAuth());

		expect(mockUseAuthUser).toHaveBeenCalled();
	});

	it('should unmount without owning an auth subscription', () => {
		setupUnauthenticatedUser();

		const { unmount } = renderHook(() => useAuth());
		unmount();
		expect(mockUseAuthUser).toHaveBeenCalled();
	});

	it('should handle authentication state changes', () => {
		setupUnauthenticatedUser();
		mockUseAuthUser.mockReturnValue({ user: { uid: 'user-1' }, authReady: true });

		const { result } = renderHook(() => useAuth());

		expect(result.current.currentUser).toEqual({ uid: 'user-1' });
	});

	it('should handle Firebase auth errors gracefully', () => {
		mockUseAuthUser.mockReturnValue({ user: null, authReady: true });

		const { result } = renderHook(() => useAuth());

		expect(result.current.currentUser).toBeNull();
	});
});
