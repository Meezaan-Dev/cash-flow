import * as functions from 'firebase-functions';
import { db, type QueryDocumentSnapshot } from './firebase';
import { setCorsHeaders, verifyToken } from './http';

export {
	addTransaction,
	addTransfer,
	updateTransaction,
	deleteTransaction,
	deleteAllTransactions,
} from './ledger';

interface Transaction {
	id: string;
	userId: string;
	accountId?: string;
	transferAccountId?: string;
	amount: number;
	title: string;
	category: string;
	subcategory?: string;
	description?: string;
	type: 'income' | 'expense' | 'transfer';
	date?: string;
	createdAt?: string;
	updatedAt?: string;
}

interface ApiResponse {
	success: boolean;
	data?: Transaction[];
	error?: string;
	message?: string;
}

function parseDate(value: unknown): Date | null {
	if (!value) return null;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === 'object' && value !== null && 'toDate' in value) {
		const candidate = (value as { toDate: () => Date }).toDate();
		return Number.isNaN(candidate.getTime()) ? null : candidate;
	}
	if (typeof value !== 'string') return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createResponse(statusCode: number, body: ApiResponse) {
	return {
		statusCode,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
		body: JSON.stringify(body),
	};
}

function toTransaction(doc: QueryDocumentSnapshot): Transaction {
	const data = doc.data();
	return {
		id: doc.id,
		userId: String(data.userId || ''),
		accountId: data.accountId ? String(data.accountId) : undefined,
		transferAccountId: data.transferAccountId ? String(data.transferAccountId) : undefined,
		amount: Number(data.amount || 0),
		title: String(data.title || data.description || 'Untitled transaction'),
		category: String(data.category || 'Uncategorized'),
		subcategory: data.subcategory ? String(data.subcategory) : undefined,
		description: data.description ? String(data.description) : undefined,
		type: data.type === 'income' || data.type === 'transfer' ? data.type : 'expense',
		date: parseDate(data.date)?.toISOString(),
		createdAt: parseDate(data.createdAt)?.toISOString(),
		updatedAt: parseDate(data.updatedAt)?.toISOString(),
	};
}

export const getUserTransactions = functions.https.onRequest(async (req, res) => {
	if (req.method === 'OPTIONS') {
		setCorsHeaders(res);
		res.status(204).send('');
		return;
	}
	setCorsHeaders(res);
	if (req.method !== 'GET') {
		const response = createResponse(405, {
			success: false,
			error: 'Method not allowed. Only GET requests are supported.',
		});
		res.status(response.statusCode).send(response.body);
		return;
	}

	try {
		if (!req.headers.authorization) {
			res.status(401).json({ success: false, error: 'Authorization header is required' });
			return;
		}
		const { uid } = await verifyToken(req.headers.authorization);
		const snapshot = await db
			.collection('users')
			.doc(uid)
			.collection('transactions')
			.orderBy('date', 'desc')
			.get();
		const transactions = snapshot.docs.map(toTransaction);
		res.status(200).json({
			success: true,
			data: transactions,
			message: `Successfully retrieved ${transactions.length} transactions`,
		});
	} catch (error) {
		console.error('Error in getUserTransactions:', error);
		const unauthorized =
			error instanceof Error &&
			(error.message.includes('Authorization') || error.message.includes('token'));
		res.status(unauthorized ? 401 : 500).json({
			success: false,
			error: unauthorized ? 'Invalid or expired token' : 'Internal server error',
		});
	}
});

export const healthCheck = functions.https.onRequest((_req, res) => {
	setCorsHeaders(res);
	res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});
