import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIChatbot from '../AIChatbot';

const mockUseAuth = jest.fn();
const mockAskQuestion = jest.fn();

jest.mock('@/domains/auth/hooks/useAuth', () => ({
	useAuth: () => mockUseAuth(),
}));

jest.mock('@/domains/ai/controllers/AIChatController', () => ({
	useAIChatController: () => ({
		askQuestion: mockAskQuestion,
	}),
}));

describe('AIChatbot', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAuth.mockReturnValue({
			currentUser: { uid: 'user-123' },
		});
	});

	it('opens and closes the chat panel', async () => {
		const user = userEvent.setup();
		render(<AIChatbot />);

		const openButton = screen.getByRole('button', { name: /open ai assistant/i });
		await user.click(openButton);

		expect(screen.getByText('AI Assistant')).toBeInTheDocument();

		const closeButton = screen.getAllByRole('button', { name: /close ai assistant/i })[0];
		await user.click(closeButton);

		expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
	});

	it('sends a suggestion and renders user + assistant messages', async () => {
		const user = userEvent.setup();
		mockAskQuestion.mockResolvedValue('You spent R1,200 on food this month.');

		render(<AIChatbot />);
		await user.click(screen.getByRole('button', { name: /open ai assistant/i }));

		const suggestion = screen.getByRole('button', {
			name: /how much did i spend on food this month/i,
		});
		await user.click(suggestion);

		await waitFor(() => {
			expect(mockAskQuestion).toHaveBeenCalledWith({
				question: 'How much did I spend on food this month?',
			});
		});

		expect(screen.getByText('How much did I spend on food this month?')).toBeInTheDocument();
		expect(screen.getByText('You spent R1,200 on food this month.')).toBeInTheDocument();
		expect(screen.getAllByTestId('chat-message-user')).toHaveLength(1);
		expect(screen.getAllByTestId('chat-message-assistant')).toHaveLength(1);
	});

	it('shows loading indicator while waiting for AI response', async () => {
		const user = userEvent.setup();
		let resolveRequest: ((value: string) => void) | undefined;
		mockAskQuestion.mockImplementation(
			() =>
				new Promise<string>((resolve) => {
					resolveRequest = resolve;
				})
		);

		render(<AIChatbot />);
		await user.click(screen.getByRole('button', { name: /open ai assistant/i }));

		const input = screen.getByPlaceholderText(/ask a question about your finances/i);
		await user.type(input, 'Which account has most spending?');
		await user.click(screen.getByRole('button', { name: /send message/i }));

		expect(screen.getByText('AI is thinking...')).toBeInTheDocument();

		resolveRequest?.('Your credit account has the highest spending.');

		await waitFor(() => {
			expect(
				screen.getByText('Your credit account has the highest spending.')
			).toBeInTheDocument();
		});
	});

	it('renders API error message in assistant bubble', async () => {
		const user = userEvent.setup();
		mockAskQuestion.mockRejectedValue(new Error('Network error. Please try again.'));

		render(<AIChatbot />);
		await user.click(screen.getByRole('button', { name: /open ai assistant/i }));

		const input = screen.getByPlaceholderText(/ask a question about your finances/i);
		await user.type(input, 'How many times did I eat KFC?');
		await user.click(screen.getByRole('button', { name: /send message/i }));

		await waitFor(() => {
			expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
		});
	});

	it('clears chat messages when clear button is clicked', async () => {
		const user = userEvent.setup();
		mockAskQuestion.mockResolvedValue('You visited KFC 3 times.');

		render(<AIChatbot />);
		await user.click(screen.getByRole('button', { name: /open ai assistant/i }));

		const input = screen.getByPlaceholderText(/ask a question about your finances/i);
		await user.type(input, 'How many times did I eat KFC?');
		await user.click(screen.getByRole('button', { name: /send message/i }));

		await waitFor(() => {
			expect(screen.getByText('You visited KFC 3 times.')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: /clear chat/i }));
		expect(screen.queryByText('You visited KFC 3 times.')).not.toBeInTheDocument();
		expect(screen.getByText('Try asking')).toBeInTheDocument();
	});

	it('disables sending and shows auth-required hint when user is missing', async () => {
		const user = userEvent.setup();
		mockUseAuth.mockReturnValue({ currentUser: null });

		render(<AIChatbot />);
		await user.click(screen.getByRole('button', { name: /open ai assistant/i }));

		expect(screen.getAllByText('Please log in to use the AI assistant.').length).toBeGreaterThan(0);
		expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
	});

	it('renders docked mode inline on desktop without the floating launcher', () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			writable: true,
			value: 1440,
		});

		render(<AIChatbot variant="docked" />);

		expect(screen.getByRole('region', { name: /ai assistant/i })).toBeInTheDocument();
		expect(screen.getByText('AI Assistant')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /open ai assistant/i })
		).not.toBeInTheDocument();
	});
});
