import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModals from '../AuthModals';
import { clearAllMocks } from '@/utils/test-utils';

// Mock Firebase auth before importing the component
jest.mock('firebase/auth', () => ({
	createUserWithEmailAndPassword: jest.fn(),
	signInWithEmailAndPassword: jest.fn(),
	signInWithPopup: jest.fn(),
	GoogleAuthProvider: jest.fn(),
}));

// Import the mocked functions after the mock is set up
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
} from 'firebase/auth';

// Mock React Router
const mockNavigate = jest.fn();
let mockLocation = { pathname: '/dashboard', search: '', hash: '' };
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: () => mockLocation,
	useNavigate: () => mockNavigate,
}));

describe('AuthModals - Authentication', () => {
	const defaultProps = {
		open: true,
		onClose: jest.fn(),
		mode: 'login' as const,
		onModeChange: jest.fn(),
	};

	beforeEach(() => {
		clearAllMocks();
		mockLocation = { pathname: '/dashboard', search: '', hash: '' };
		(GoogleAuthProvider as unknown as jest.Mock).mockImplementation(() => ({}));
	});

	it('should render login modal by default', () => {
		render(<AuthModals {...defaultProps} />);

		expect(screen.getByText('Welcome Back')).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
	});

	it('should render register modal when mode is register', () => {
		render(<AuthModals {...defaultProps} mode="register" />);

		expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
	});

	it('should handle email input changes', async () => {
		const user = userEvent.setup();
		render(<AuthModals {...defaultProps} />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		await user.type(emailInput, 'test@example.com');

		expect(emailInput).toHaveValue('test@example.com');
	});

	it('should handle password input changes', async () => {
		const user = userEvent.setup();
		render(<AuthModals {...defaultProps} />);

		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		await user.type(passwordInput, 'password123');

		expect(passwordInput).toHaveValue('password123');
	});

	it('should toggle password visibility', async () => {
		const user = userEvent.setup();
		render(<AuthModals {...defaultProps} />);

		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		const toggleButton = screen.getByLabelText('Toggle password visibility');

		// Password should be hidden by default
		expect(passwordInput).toHaveAttribute('type', 'password');

		// Click to show password
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute('type', 'text');

		// Click to hide password
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute('type', 'password');
	});

	it('should handle successful login', async () => {
		const user = userEvent.setup();
		(signInWithEmailAndPassword as jest.Mock).mockResolvedValue({});

		render(<AuthModals {...defaultProps} />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		const submitButton = screen.getByRole('button', { name: 'Sign In' });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
				expect.anything(),
				'test@example.com',
				'password123'
			);
		});

		expect(defaultProps.onClose).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
	});

	it('should return to the requested mobisite route after login', async () => {
		const user = userEvent.setup();
		mockLocation = { pathname: '/mobisite', search: '', hash: '' };
		(signInWithEmailAndPassword as jest.Mock).mockResolvedValue({});

		render(<AuthModals {...defaultProps} />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		const submitButton = screen.getByRole('button', { name: 'Sign In' });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(signInWithEmailAndPassword).toHaveBeenCalled();
		});

		expect(defaultProps.onClose).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith('/mobisite');
	});

	it('should handle successful registration', async () => {
		const user = userEvent.setup();
		(createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({});

		render(<AuthModals {...defaultProps} mode="register" />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		const submitButton = screen.getByRole('button', { name: 'Create Account' });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
				expect.anything(),
				'test@example.com',
				'password123'
			);
		});

		expect(defaultProps.onClose).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
	});

	it('should handle login errors', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Invalid email or password';
		(signInWithEmailAndPassword as jest.Mock).mockRejectedValue(new Error(errorMessage));

		render(<AuthModals {...defaultProps} />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		const submitButton = screen.getByRole('button', { name: 'Sign In' });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'wrongpassword');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		expect(defaultProps.onClose).not.toHaveBeenCalled();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('should handle Google sign-in', async () => {
		const user = userEvent.setup();
		(signInWithPopup as jest.Mock).mockResolvedValue({});

		render(<AuthModals {...defaultProps} />);

		const googleButton = screen.getByRole('button', {
			name: 'Continue with Google',
		});
		await user.click(googleButton);

		await waitFor(() => {
			expect(signInWithPopup).toHaveBeenCalled();
		});

		expect(defaultProps.onClose).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
	});

	it('should handle Google sign-in errors', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Google sign-in failed';
		(signInWithPopup as jest.Mock).mockRejectedValue(new Error(errorMessage));

		render(<AuthModals {...defaultProps} />);

		const googleButton = screen.getByRole('button', {
			name: 'Continue with Google',
		});
		await user.click(googleButton);

		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		expect(defaultProps.onClose).not.toHaveBeenCalled();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('should toggle between login and register modes', async () => {
		const user = userEvent.setup();
		render(<AuthModals {...defaultProps} />);

		// Initially in login mode
		expect(screen.getByText('Welcome Back')).toBeInTheDocument();

		// Click to switch to register mode
		const switchButton = screen.getByRole('button', { name: 'Sign up' });
		await user.click(switchButton);

		expect(defaultProps.onModeChange).toHaveBeenCalledWith('register');
	});

	it('should close modal and reset form', async () => {
		const user = userEvent.setup();
		render(<AuthModals {...defaultProps} />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;

		// Fill form
		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');

		// Close modal
		const closeButton = screen.getByRole('button', { name: /close/i });
		await user.click(closeButton);

		expect(defaultProps.onClose).toHaveBeenCalled();
	});

	it('should disable form inputs during loading', async () => {
		const user = userEvent.setup();
		(signInWithEmailAndPassword as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

		render(<AuthModals {...defaultProps} />);

		const emailInput = screen.getByRole('textbox', { name: /email/i });
		const passwordInput = screen.getByLabelText(/^Password$/) as HTMLInputElement;
		const submitButton = screen.getByRole('button', { name: 'Sign In' });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(submitButton).toBeDisabled();
			expect(emailInput).toBeDisabled();
			expect(passwordInput).toBeDisabled();
		});
	});

	it('should show loading state for Google sign-in', async () => {
		const user = userEvent.setup();
		(signInWithPopup as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

		render(<AuthModals {...defaultProps} />);

		const googleButton = screen.getByRole('button', {
			name: 'Continue with Google',
		});
		await user.click(googleButton);

		await waitFor(() => {
			expect(screen.getByText('Signing in...')).toBeInTheDocument();
			expect(googleButton).toBeDisabled();
		});
	});

	it('should validate required fields', async () => {
		const user = userEvent.setup();
		render(<AuthModals {...defaultProps} />);

		const submitButton = screen.getByRole('button', { name: 'Sign In' });
		await user.click(submitButton);

		// Form should not submit without required fields
		expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
	});
});
