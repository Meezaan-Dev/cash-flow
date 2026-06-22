import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';
import { AskAIRequest, AskAIResponse } from '@/types';

// API response interface
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

interface ApiErrorResponse {
	error?: string;
	message?: string;
	code?: string;
	details?: string;
	retryable?: boolean;
	requestId?: string;
}

export class ApiRequestError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code = 'API_REQUEST_FAILED',
		public readonly details?: string,
		public readonly retryable = false,
		public readonly requestId?: string
	) {
		super(message);
		this.name = 'ApiRequestError';
	}

	toUserMessage(): string {
		return [
			this.message,
			this.details,
			this.retryable ? 'You can retry this request.' : undefined,
			this.requestId ? `Request reference: ${this.requestId}.` : undefined,
		].filter(Boolean).join(' ');
	}
}

// Transaction interface
export interface Transaction {
	id: string;
	userId: string;
	amount: number;
	description: string;
	category: string;
	subcategory?: string;
	type: 'income' | 'expense';
	date: string;
	createdAt: string;
	updatedAt: string;
}

// API configuration
const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || 'https://us-central1-cash-flow-eb5bd.cloudfunctions.net';

class ApiService {
	private tokenCache: { token: string; expiresAt: number } | null = null;
	private readonly TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (tokens expire in 1 hour)

	private async getAuthToken(): Promise<string> {
		const user = auth.currentUser;
		if (!user) {
			throw new Error('No authenticated user found');
		}

		// Check if we have a cached token that's still valid
		if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
			return this.tokenCache.token;
		}

		try {
			// Get token without forcing refresh first
			let token = await getIdToken(user, false);

			// If token is about to expire (within 10 minutes), refresh it
			const decodedToken = JSON.parse(atob(token.split('.')[1]));
			const tokenExpiry = decodedToken.exp * 1000; // Convert to milliseconds
			const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

			if (tokenExpiry < tenMinutesFromNow) {
				// Token will expire soon, refresh it
				token = await getIdToken(user, true);
			}

			// Cache the token
			this.tokenCache = {
				token,
				expiresAt: Date.now() + this.TOKEN_CACHE_DURATION,
			};

			return token;
		} catch (error) {
			console.error('Error getting auth token:', error);

			// Clear cache on error
			this.tokenCache = null;

			if (error instanceof Error) {
				if (error.message.includes('quota-exceeded')) {
					throw new Error(
						'Authentication quota exceeded. Please try again in a few minutes.'
					);
				} else if (error.message.includes('auth/network-request-failed')) {
					throw new Error('Network error. Please check your internet connection.');
				} else if (error.message.includes('auth/user-token-expired')) {
					throw new Error('Your session has expired. Please log in again.');
				}
			}

			throw new Error('Failed to get authentication token');
		}
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		try {
			const token = await this.getAuthToken();

			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				...options,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
					...options.headers,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({})) as ApiErrorResponse;
				throw new ApiRequestError(
					errorData.error || errorData.message || `The API returned HTTP ${response.status}.`,
					response.status,
					errorData.code,
					errorData.details,
					Boolean(errorData.retryable),
					errorData.requestId || response.headers.get('function-execution-id') || undefined
				);
			}

			const data = await response.json();
			return data as ApiResponse<T>;
		} catch (error) {
			console.error('API request failed:', error);

			throw this.normalizeRequestError(
				error,
				`The ${endpoint} request failed without error details. Retry once, then check the API base URL and Function logs.`
			);
		}
	}

	private normalizeRequestError(error: unknown, fallbackMessage: string): Error {
		if (error instanceof ApiRequestError) {
			return new Error(error.toUserMessage());
		}
		if (error instanceof TypeError) {
			return new Error(
				'The app could not reach the CashFlow API. Check your connection and VITE_API_BASE_URL, then retry.'
			);
		}
		if (error instanceof Error) {
			if (error.message.includes('No authenticated user')) {
				return new Error('Please log in to access this feature');
			}
			if (
				error.message.includes('Failed to get authentication token') ||
				error.message.includes('Authentication quota exceeded')
			) {
				return new Error('Firebase could not issue an authentication token. Sign out, sign back in, and retry.');
			}
			if (error.message.includes('Invalid or expired token')) {
				return new Error('Your session has expired. Please log in again.');
			}
			if (error.message.includes('Network error')) {
				return new Error('The request could not reach the server. Check your connection and try again.');
			}

			return new Error(error.message.trim() || fallbackMessage);
		}

		return new Error(fallbackMessage);
	}

	// Clear token cache (useful for logout or errors)
	public clearTokenCache(): void {
		this.tokenCache = null;
	}

	// Get user transactions
	async getUserTransactions(): Promise<Transaction[]> {
		const response = await this.makeRequest<Transaction[]>('/getUserTransactions');

		if (!response.success) {
			throw new Error(response.error || 'Failed to fetch transactions');
		}

		return response.data || [];
	}

	// Health check
	async healthCheck(): Promise<{
		success: boolean;
		message: string;
		timestamp: string;
	}> {
		const response = await fetch(`${API_BASE_URL}/healthCheck`);
		return response.json();
	}

	async askAI(payload: AskAIRequest): Promise<AskAIResponse> {
		if (!payload.question.trim()) {
			throw new Error('Please enter a question before sending.');
		}

		if (!payload.userId.trim()) {
			throw new Error('Please log in to use the AI assistant.');
		}

		try {
			const token = await this.getAuthToken();
			const response = await fetch(`${API_BASE_URL}/askAI`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					question: payload.question.trim(),
					userId: payload.userId,
					history: payload.history,
				}),
			});

			const executionId = response.headers.get('function-execution-id');
			const traceContext = response.headers.get('x-cloud-trace-context');
			const rawResponse = await response.text();

			let responseBody: Partial<AskAIResponse & ApiErrorResponse & { data?: AskAIResponse }> = {};

			if (rawResponse) {
				try {
					responseBody = JSON.parse(rawResponse) as Partial<
						AskAIResponse & ApiErrorResponse & { data?: AskAIResponse }
					>;
				} catch {
					// Keep fallback empty when backend returns non-JSON content.
				}
			}

			if (!response.ok) {
				const backendMessage = responseBody.error || responseBody.message;
				const requestId = responseBody.requestId || executionId || traceContext || undefined;

				if (response.status >= 500) {
					console.error('askAI server error', {
						status: response.status,
						executionId,
						traceContext,
						body: rawResponse,
					});
				}

				throw new ApiRequestError(
					backendMessage || `The AI request failed with HTTP ${response.status}.`,
					response.status,
					responseBody.code || 'AI_REQUEST_FAILED',
					responseBody.details || (rawResponse.trim() || 'The server did not provide structured error details.'),
					Boolean(responseBody.retryable),
					requestId
				);
			}

			const answer =
				typeof responseBody.answer === 'string'
					? responseBody.answer
					: responseBody.data?.answer;

			if (!answer) {
				throw new ApiRequestError(
					'The AI endpoint returned HTTP 200 without an answer.',
					200,
					'AI_RESPONSE_MISSING',
					'Retry once. If it repeats, check the Function logs using the response execution ID.',
					true,
					executionId || traceContext || undefined
				);
			}

			return { answer };
		} catch (error) {
			throw this.normalizeRequestError(
				error,
				'Unable to get an AI response right now. Please try again.'
			);
		}
	}
}

export const apiService = new ApiService();
