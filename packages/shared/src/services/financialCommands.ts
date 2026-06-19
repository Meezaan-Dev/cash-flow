import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type FinancialCommandName =
	| 'createAccount'
	| 'updateAccount'
	| 'deleteAccount'
	| 'createTransaction'
	| 'updateTransaction'
	| 'deleteTransaction'
	| 'createTransfer'
	| 'reconcileAccount'
	| 'bulkUpdateTransactionCategories'
	| 'deleteAllTransactions';

export interface CommandResponse {
	success: true;
	ids?: string[];
	balances?: Record<string, number>;
}

interface AccountFields {
	name: string;
	bank?: string;
	type: 'debit' | 'credit' | 'savings' | 'cash';
	currency?: string;
	balance: number;
	creditLimit?: number;
	color?: string;
	icon?: string;
}

interface TransactionFields {
	accountId: string;
	title: string;
	amount: number;
	type: 'income' | 'expense';
	category: string;
	subcategory?: string;
	description?: string;
	date?: string;
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}

export interface FinancialCommandPayloads {
	createAccount: AccountFields;
	updateAccount: { accountId: string; updates: Partial<Omit<AccountFields, 'balance'>> };
	deleteAccount: { accountId: string };
	createTransaction: TransactionFields;
	updateTransaction: {
		transactionId: string;
		updates: Partial<Omit<TransactionFields, 'subcategory' | 'description'>> & {
			subcategory?: string | null;
			description?: string | null;
		};
	};
	deleteTransaction: { transactionId: string };
	createTransfer: {
		fromAccountId: string;
		toAccountId: string;
		amount: number;
		title: string;
		description?: string;
		date?: string;
	};
	reconcileAccount: {
		accountId: string;
		balanceDelta?: number;
		targetBalance?: number;
		title?: string;
		category?: string;
		date?: string;
	};
	bulkUpdateTransactionCategories: {
		transactionIds: string[];
		category: string;
		subcategory: string | null;
	};
	deleteAllTransactions: Record<string, never>;
}

const newIdempotencyKey = (): string => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const runFinancialCommand = async <K extends FinancialCommandName>(
	name: K,
	payload: FinancialCommandPayloads[K]
): Promise<CommandResponse> => {
	type Request = FinancialCommandPayloads[K] & { idempotencyKey: string };
	const callable = httpsCallable<Request, CommandResponse>(functions, name);
	const result = await callable({ ...payload, idempotencyKey: newIdempotencyKey() });
	return result.data;
};
