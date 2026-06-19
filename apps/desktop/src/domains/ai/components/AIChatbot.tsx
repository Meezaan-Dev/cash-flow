import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiMessageCircle, FiSend, FiTrash2, FiX } from 'react-icons/fi';
import { useAuth } from '@/domains/auth/hooks/useAuth';
import { useAIChatController } from '@/domains/ai/controllers/AIChatController';
import { AIChatMessage } from '@/types';
import { Button } from '@/components/app/ui/button';
import { Textarea } from '@/components/app/ui/textarea';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

const SUGGESTED_PROMPTS = [
	'How much did I spend on food this month?',
	'What is debit order total for this month?',
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

interface AIChatbotProps {
	variant?: 'floating' | 'docked';
	alwaysDocked?: boolean;
}

const AIChatbot: React.FC<AIChatbotProps> = ({
	variant = 'floating',
	alwaysDocked = false,
}) => {
	const { currentUser } = useAuth();
	const { askQuestion } = useAIChatController();

	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [messages, setMessages] = useState<AIChatMessage[]>([]);
	const [isDockedMobile, setIsDockedMobile] = useState(
		() => window.innerWidth < 1280
	);

	const messagesRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	const isAuthenticated = Boolean(currentUser?.uid);
	const canSend = useMemo(
		() => !isLoading && isAuthenticated && inputValue.trim().length > 0,
		[inputValue, isAuthenticated, isLoading]
	);

	useEffect(() => {
		if (!isOpen && variant === 'floating') return;
		inputRef.current?.focus();
	}, [isOpen, variant]);

	useEffect(() => {
		const container = messagesRef.current;
		if (!container) return;
		container.scrollTop = container.scrollHeight;
	}, [messages, isLoading]);

	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		};

		window.addEventListener('keydown', handleEscape);
		return () => window.removeEventListener('keydown', handleEscape);
	}, [isOpen]);

	useEffect(() => {
		if (variant !== 'docked') return;

		const handleResize = () => setIsDockedMobile(window.innerWidth < 1280);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [variant]);

	const appendMessage = (message: AIChatMessage) => {
		setMessages((prev) => [...prev, message]);
	};

	const handleSend = async (questionOverride?: string) => {
		const question = (questionOverride ?? inputValue).trim();

		if (!question || isLoading) {
			return;
		}

		if (!currentUser?.uid) {
			appendMessage(
				createMessage('assistant', 'Please log in to use the AI assistant.', {
					isError: true,
				})
			);
			return;
		}

		appendMessage(createMessage('user', question));
		setInputValue('');
		setIsLoading(true);

		try {
			const answer = await askQuestion({
				question,
			});

			appendMessage(
				createMessage(
					'assistant',
					answer || 'I could not generate an answer. Please try again.'
				)
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Unable to get an AI response right now. Please try again.';

			appendMessage(createMessage('assistant', errorMessage, { isError: true }));
		} finally {
			setIsLoading(false);
			inputRef.current?.focus();
		}
	};

	const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	};

	const clearChat = () => {
		setMessages([]);
		setInputValue('');
		inputRef.current?.focus();
	};

	const renderMessages = () => (
		<div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto p-4">
			{messages.length === 0 ? (
				<div className="space-y-2">
					<p className={sectionLabel}>Try asking</p>
					<div className="flex flex-wrap gap-2">
						{SUGGESTED_PROMPTS.map((prompt) => (
							<Button
								key={prompt}
								type="button"
								variant="outline"
								size="sm"
								className="h-auto whitespace-normal py-1.5 text-left text-xs"
								onClick={() => void handleSend(prompt)}
								disabled={!isAuthenticated || isLoading}
							>
								{prompt}
							</Button>
						))}
					</div>
					{!isAuthenticated && (
						<p className="pt-1 text-xs text-destructive">
							Please log in to use the AI assistant.
						</p>
					)}
				</div>
			) : (
				messages.map((message) => (
					<div
						key={message.id}
						data-testid={`chat-message-${message.role}`}
						className={`flex ${
							message.role === 'user' ? 'justify-end' : 'justify-start'
						}`}
					>
						<div
							className={cn(
								'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
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
					<div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
						AI is thinking...
					</div>
				</div>
			)}
		</div>
	);

	const renderComposer = () => (
		<div className="border-t border-gray-100 p-3 dark:border-gray-800">
			<div className="flex items-end gap-2">
				<Textarea
					ref={inputRef}
					value={inputValue}
					onChange={(event) => setInputValue(event.target.value)}
					onKeyDown={handleInputKeyDown}
					placeholder="Ask a question about your finances..."
					className="min-h-[44px] max-h-32 resize-none"
					rows={2}
					disabled={!isAuthenticated || isLoading}
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
			{!isAuthenticated && (
				<p className="mt-2 text-xs text-destructive">
					Please log in to use the AI assistant.
				</p>
			)}
		</div>
	);

	const renderPanel = (options?: { onClose?: () => void; docked?: boolean }) => (
		<section
			aria-label="AI assistant"
			className={cn(
				'flex flex-col overflow-hidden shadow-2xl',
				cardSurface,
				options?.docked
					? 'h-full min-h-0'
					: 'h-[min(32rem,calc(var(--vh-screen)-6rem))] w-[calc(100vw-2rem)] max-w-md'
			)}
		>
			<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
				<div>
					<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">AI Assistant</h2>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Ask about your spending, accounts, and budgets
					</p>
				</div>
				<div className="flex items-center gap-1">
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
					{options?.onClose && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={options.onClose}
							aria-label="Close AI assistant"
						>
							<FiX className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
			{renderMessages()}
			{renderComposer()}
		</section>
	);

	if (variant === 'docked') {
		if (alwaysDocked || !isDockedMobile) {
			return renderPanel({ docked: true });
		}

		return (
			<div className="fixed bottom-4 right-4 z-[70]">
				{isOpen && (
					<div className="mb-3">
						{renderPanel({ onClose: () => setIsOpen(false) })}
					</div>
				)}
				<Button
					type="button"
					variant="marketing"
					size="icon"
					className="h-12 w-12 shadow-xl"
					onClick={() => setIsOpen((prev) => !prev)}
					aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
				>
					{isOpen ? (
						<FiX className="h-5 w-5" />
					) : (
						<FiMessageCircle className="h-5 w-5" />
					)}
				</Button>
			</div>
		);
	}

	return (
		<div className="fixed bottom-4 right-4 z-[70] md:bottom-6 md:right-6">
			{isOpen && (
				<div className="mb-3">
					{renderPanel({ onClose: () => setIsOpen(false) })}
				</div>
			)}

			<Button
				type="button"
				size="icon"
				className="h-12 w-12 rounded-full shadow-xl"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
			>
				{isOpen ? <FiX className="h-5 w-5" /> : <FiMessageCircle className="h-5 w-5" />}
			</Button>
		</div>
	);
};

export default AIChatbot;
