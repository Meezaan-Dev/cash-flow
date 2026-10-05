import { getIdToken } from 'firebase/auth';
import { auth } from './firebase';
import type { AskAIRequest, AskAIResponse } from '../types';

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

export interface TransactionApiRecord {
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

export interface AddTransactionRequest {
	type: 'income' | 'expense';
	accountId: string;
	title: string;
	category: string;
	subcategory?: string;
	description?: string;
	amount: number;
	date?: Date;
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}

export interface AddTransferRequest {
	fromAccountId: string;
	toAccountId: string;
	amount: number;
	title: string;
	description?: string;
	date?: Date;
}

export interface UpdateTransactionRequest extends Partial<AddTransactionRequest> {
	id: string;
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

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || 'https://us-central1-cash-flow-eb5bd.cloudfunctions.net';

const serializeLedgerPayload = (payload: object) =>
	Object.fromEntries(
		Object.entries(payload).map(([key, value]) => [
			key,
			value instanceof Date ? value.toISOString() : value,
		])
	);

class ApiService {
	private tokenCache: { token: string; expiresAt: number } | null = null;
	private readonly TOKEN_CACHE_DURATION = 50 * 60 * 1000;

	private async getAuthToken(): Promise<string> {
		const user = auth.currentUser;
		if (!user) {
			throw new Error('No authenticated user found');
		}

		if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
			return this.tokenCache.token;
		}

		try {
			let token = await getIdToken(user, false);
			const decodedToken = JSON.parse(atob(token.split('.')[1]));
			const tokenExpiry = decodedToken.exp * 1000;
			const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

			if (tokenExpiry < tenMinutesFromNow) {
				token = await getIdToken(user, true);
			}

			this.tokenCache = {
				token,
				expiresAt: Date.now() + this.TOKEN_CACHE_DURATION,
			};

			return token;
		} catch (error) {
			console.error('Error getting auth token:', error);
			this.tokenCache = null;

			if (error instanceof Error) {
				if (error.message.includes('quota-exceeded')) {
					throw new Error('Authentication quota exceeded. Please try again in a few minutes.');
				}
				if (error.message.includes('auth/network-request-failed')) {
					throw new Error('Network error. Please check your internet connection.');
				}
				if (error.message.includes('auth/user-token-expired')) {
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

			return await response.json() as ApiResponse<T>;
		} catch (error) {
			console.error('API request failed:', error);
			throw this.normalizeRequestError(
				error,
				`The ${endpoint} request failed without error details. Retry once, then check the API base URL and Function logs.`
			);
		}
	}

	private async post<T>(endpoint: string, body: object): Promise<ApiResponse<T>> {
		return this.makeRequest<T>(endpoint, {
			method: 'POST',
			body: JSON.stringify(serializeLedgerPayload(body)),
		});
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

	public clearTokenCache(): void {
		this.tokenCache = null;
	}

	async getUserTransactions(): Promise<TransactionApiRecord[]> {
		const response = await this.makeRequest<TransactionApiRecord[]>('/getUserTransactions');

		if (!response.success) {
			throw new Error(response.error || 'Failed to fetch transactions');
		}

		return response.data || [];
	}

	async healthCheck(): Promise<{
		success: boolean;
		message: string;
		timestamp: string;
	}> {
		const response = await fetch(`${API_BASE_URL}/healthCheck`);
		return response.json();
	}

	async addTransaction(payload: AddTransactionRequest): Promise<string> {
		const response = await this.post<{ id: string }>('/addTransaction', payload);
		if (!response.success || !response.data?.id) {
			throw new Error(response.error || 'Failed to add transaction');
		}
		return response.data.id;
	}

	async addTransfer(payload: AddTransferRequest): Promise<string> {
		const response = await this.post<{ id: string }>('/addTransfer', payload);
		if (!response.success || !response.data?.id) {
			throw new Error(response.error || 'Failed to add transfer');
		}
		return response.data.id;
	}

	async updateTransaction(payload: UpdateTransactionRequest): Promise<void> {
		const response = await this.post<null>('/updateTransaction', payload);
		if (!response.success) {
			throw new Error(response.error || 'Failed to update transaction');
		}
	}

	async deleteTransaction(id: string): Promise<void> {
		const response = await this.post<null>('/deleteTransaction', { id });
		if (!response.success) {
			throw new Error(response.error || 'Failed to delete transaction');
		}
	}

	async deleteAllTransactions(): Promise<void> {
		const response = await this.post<null>('/deleteAllTransactions', {});
		if (!response.success) {
			throw new Error(response.error || 'Failed to delete all transactions');
		}
	}

	async askAI(payload: AskAIRequest): Promise<AskAIResponse> {
		if (!payload.question.trim()) {
			throw new Error('Please enter a question before sending.');
		}

		if (!payload.userId.trim()) {
			throw new Error('Please log in to use the AI assistant.');
		}

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

		let responseBody: Partial<AskAIResponse & ApiErrorResponse & { data?: AskAIResponse }> = {};
		try {
			responseBody = await response.json() as Partial<
				AskAIResponse & ApiErrorResponse & { data?: AskAIResponse }
			>;
		} catch {
			responseBody = {};
		}

		if (!response.ok) {
			const apiError = new ApiRequestError(
				responseBody.error || responseBody.message || `The AI assistant returned HTTP ${response.status}.`,
				response.status,
				responseBody.code,
				responseBody.details,
				Boolean(responseBody.retryable),
				responseBody.requestId || response.headers.get('function-execution-id') || undefined
			);
			throw new Error(apiError.toUserMessage());
		}

		const normalized = responseBody.data ?? responseBody;
		const answer = normalized.answer?.trim();
		if (!answer) {
			throw new Error('The AI assistant returned an empty answer. Please try again.');
		}
		return { answer };
	}
}

export const apiService = new ApiService();
