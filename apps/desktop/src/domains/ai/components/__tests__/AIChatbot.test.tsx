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

	it('renders the assistant workspace immediately', () => {
		render(<AIChatbot />);
		expect(screen.getByRole('region', { name: /ai assistant/i })).toBeInTheDocument();
		expect(screen.getByText('AI Assistant')).toBeInTheDocument();
	});

	it('sends a suggestion and renders user + assistant messages', async () => {
		const user = userEvent.setup();
		mockAskQuestion.mockResolvedValue('You spent R1,200 on food this month.');

		render(<AIChatbot />);

		const suggestion = screen.getByRole('button', {
			name: /how much did i spend on food this month/i,
		});
		await user.click(suggestion);

		await waitFor(() => {
			expect(mockAskQuestion).toHaveBeenCalledWith({
				question: 'How much did I spend on food this month?',
				userId: 'user-123',
				history: [],
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

		const input = screen.getByPlaceholderText(/ask a question about your finances/i);
		await user.type(input, 'Which account has most spending?');
		await user.click(screen.getByRole('button', { name: /send message/i }));

		expect(screen.getByText('Gemini is thinking...')).toBeInTheDocument();

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

	it('disables sending and shows auth-required hint when user is missing', () => {
		mockUseAuth.mockReturnValue({ currentUser: null });

		render(<AIChatbot />);

		expect(screen.getAllByText('Please log in to use the AI assistant.').length).toBeGreaterThan(0);
		expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
	});

	it('sends recent session messages as follow-up history', async () => {
		const user = userEvent.setup();
		mockAskQuestion.mockResolvedValueOnce('First answer').mockResolvedValueOnce('Follow-up answer');
		render(<AIChatbot />);
		const input = screen.getByPlaceholderText(/ask a question about your finances/i);
		await user.type(input, 'First question');
		await user.click(screen.getByRole('button', { name: /send message/i }));
		await screen.findByText('First answer');
		await user.type(input, 'And after that?');
		await user.click(screen.getByRole('button', { name: /send message/i }));
		await waitFor(() => expect(mockAskQuestion).toHaveBeenLastCalledWith({
			question: 'And after that?',
			userId: 'user-123',
			history: [
				{ role: 'user', content: 'First question' },
				{ role: 'assistant', content: 'First answer' },
			],
		}));
	});
});
