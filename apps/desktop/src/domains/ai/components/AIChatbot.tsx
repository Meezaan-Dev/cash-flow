import React, { useEffect, useRef, useState } from 'react';
import { FiSend, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '@/domains/auth/hooks/useAuth';
import { useAIChatController } from '@/domains/ai/controllers/AIChatController';
import { AIChatMessage } from '@/types';
import { Button } from '@/components/app/ui/button';
import { Textarea } from '@/components/app/ui/textarea';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

const MAX_HISTORY_MESSAGES = 12;
const SUGGESTED_PROMPTS = [
	'How much did I spend on food this month?',
	'What is my biggest expense this month?',
	'Which account am I spending the most from?',
];

const createMessage = (
	role: AIChatMessage['role'],
	content: string,
	options?: { isError?: boolean }
): AIChatMessage => ({
	id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
	role,
	content,
	isError: options?.isError,
	createdAt: Date.now(),
});

const AIChatbot: React.FC = () => {
	const { currentUser } = useAuth();
	const { askQuestion } = useAIChatController();
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [messages, setMessages] = useState<AIChatMessage[]>([]);
	const messagesRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	const isAuthenticated = Boolean(currentUser?.uid);
	const canSend = !isLoading && isAuthenticated && inputValue.trim().length > 0;

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		const container = messagesRef.current;
		if (container) container.scrollTop = container.scrollHeight;
	}, [messages, isLoading]);

	const appendMessage = (message: AIChatMessage) => {
		setMessages((current) => [...current, message]);
	};

	const handleSend = async (questionOverride?: string) => {
		const question = (questionOverride ?? inputValue).trim();
		if (!question || isLoading) return;

		if (!currentUser?.uid) {
			appendMessage(
				createMessage('assistant', 'Please log in to use the AI assistant.', {
					isError: true,
				})
			);
			return;
		}

		const history = messages
			.filter((message) => !message.isError)
			.slice(-MAX_HISTORY_MESSAGES)
			.map(({ role, content }) => ({ role, content }));
		appendMessage(createMessage('user', question));
		setInputValue('');
		setIsLoading(true);

		try {
			const answer = await askQuestion({
				question,
				userId: currentUser.uid,
				history,
			});
			appendMessage(
				createMessage(
					'assistant',
					answer || 'I could not generate an answer. Please try again.'
				)
			);
		} catch (error) {
			appendMessage(
				createMessage(
					'assistant',
					error instanceof Error
						? error.message
						: 'Unable to get an AI response right now. Please try again.',
					{ isError: true }
				)
			);
		} finally {
			setIsLoading(false);
			inputRef.current?.focus();
		}
	};

	const clearChat = () => {
		setMessages([]);
		setInputValue('');
		inputRef.current?.focus();
	};

	return (
		<div className="flex min-h-0 flex-1 p-4 md:p-6">
			<section
				aria-label="AI assistant"
				className={cn('mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden', cardSurface)}
			>
				<header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
					<div>
						<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">AI Assistant</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Ask Gemini about your spending, accounts, and transactions
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={clearChat}
						aria-label="Clear chat"
						disabled={messages.length === 0 && !inputValue}
					>
						<FiTrash2 className="h-4 w-4" />
					</Button>
				</header>

				<div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto p-5">
					{messages.length === 0 ? (
						<div className="mx-auto max-w-2xl space-y-3 py-10 text-center">
							<p className={sectionLabel}>Try asking</p>
							<div className="flex flex-wrap justify-center gap-2">
								{SUGGESTED_PROMPTS.map((prompt) => (
									<Button
										key={prompt}
										type="button"
										variant="outline"
										size="sm"
										className="h-auto whitespace-normal py-2 text-left text-xs"
										onClick={() => void handleSend(prompt)}
										disabled={!isAuthenticated || isLoading}
									>
										{prompt}
									</Button>
								))}
							</div>
							{!isAuthenticated && (
								<p className="text-sm text-destructive">Please log in to use the AI assistant.</p>
							)}
						</div>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								data-testid={`chat-message-${message.role}`}
								className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
							>
								<div
									className={cn(
										'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm',
										message.role === 'user'
											? 'bg-blue-600 text-white'
											: message.isError
												? 'border border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400'
												: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
									)}
								>
									{message.content}
								</div>
							</div>
						))
					)}
					{isLoading && (
						<div className="flex justify-start">
							<div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
								Gemini is thinking...
							</div>
						</div>
					)}
				</div>

				<div className="border-t border-gray-100 p-4 dark:border-gray-800">
					<div className="flex items-end gap-2">
						<Textarea
							ref={inputRef}
							value={inputValue}
							onChange={(event) => setInputValue(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && !event.shiftKey) {
									event.preventDefault();
									void handleSend();
								}
							}}
							placeholder="Ask a question about your finances..."
							className="max-h-32 min-h-[48px] resize-none"
							rows={2}
							disabled={!isAuthenticated || isLoading}
							maxLength={2000}
						/>
						<Button
							type="button"
							size="icon"
							onClick={() => void handleSend()}
							disabled={!canSend}
							aria-label="Send message"
						>
							<FiSend className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
};

export default AIChatbot;
