import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export {
	createAccount,
	updateAccount,
	deleteAccount,
	createTransaction,
	updateTransaction,
	deleteTransaction,
	createTransfer,
	reconcileAccount,
	bulkUpdateTransactionCategories,
	deleteAllTransactions,
} from './financial';

const db = admin.firestore();

// Interface for transaction data
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

interface Account {
	id: string;
	name: string;
	type: string;
	balance: number;
	creditLimit?: number;
	currency: string;
}

// Interface for API response
interface ApiResponse {
	success: boolean;
	data?: Transaction[];
	error?: string;
	message?: string;
}

interface AskAIRequestBody {
	question?: string;
}

interface AskAIResponse {
	success: boolean;
	answer?: string;
	error?: string;
}

// Helper function to verify JWT token
async function verifyToken(authHeader: string): Promise<admin.auth.DecodedIdToken> {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header');
	}

	const token = authHeader.split('Bearer ')[1];

	try {
		const decodedToken = await admin.auth().verifyIdToken(token);
		if (decodedToken.email_verified !== true) {
			throw new Error('Email verification required');
		}
		return decodedToken;
	} catch {
		throw new Error('Invalid or expired token');
	}
}

const allowedOrigins = new Set(
	(process.env.ALLOWED_ORIGINS || 'https://cashflow.meezaan.dev,http://localhost:5173')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean)
);

function setCorsHeaders(req: functions.https.Request, res: functions.Response<unknown>): boolean {
	const origin = req.headers.origin;
	if (origin && !allowedOrigins.has(origin)) return false;
	if (origin) res.set('Access-Control-Allow-Origin', origin);
	res.set('Vary', 'Origin');
	res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck');
	res.set('Access-Control-Max-Age', '3600');
	return true;
}

async function verifyAppCheck(req: functions.https.Request): Promise<void> {
	if (process.env.FUNCTIONS_EMULATOR === 'true') return;
	const token = req.header('X-Firebase-AppCheck');
	if (!token) throw new Error('Missing App Check token');
	await admin.appCheck().verifyToken(token);
}

async function enforceRequestLimit(uid: string, bucket: string, limit: number): Promise<void> {
	const minute = Math.floor(Date.now() / 60_000);
	const ref = db.collection('_security').doc(`${bucket}-${uid}-${minute}`);
	await db.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(ref);
		const count = snapshot.exists ? Number(snapshot.get('count') || 0) : 0;
		if (count >= limit) throw new Error('Rate limit exceeded');
		transaction.set(ref, {
			count: count + 1,
			expiresAt: admin.firestore.Timestamp.fromMillis((minute + 2) * 60_000),
		});
	});
}

function parseDate(value: unknown): Date | null {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	if (value instanceof admin.firestore.Timestamp) {
		return value.toDate();
	}

	if (typeof value === 'object' && value !== null && 'toDate' in value) {
		const candidate = (value as { toDate: () => Date }).toDate();
		return Number.isNaN(candidate.getTime()) ? null : candidate;
	}

	if (typeof value !== 'string') {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
}

function formatCurrency(value: number, currency = 'ZAR'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
	}).format(value);
}

function normalizeText(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
	return count === 1 ? singular : plural;
}

function getTransactionSearchText(transaction: Transaction): string {
	return normalizeText(
		`${transaction.title} ${transaction.description || ''} ${transaction.category} ${
			transaction.subcategory || ''
		}`
	);
}

function extractMerchantQuery(question: string): string | null {
	const patterns = [
		/how many times did i (?:eat|buy|spend|shop) (?:at )?(.+?)(?:\?|$)/i,
		/how often did i (?:eat|buy|spend|shop) (?:at )?(.+?)(?:\?|$)/i,
		/how many transactions (?:were )?(?:for|at|with) (.+?)(?:\?|$)/i,
	];

	for (const pattern of patterns) {
		const match = question.match(pattern);
		if (match?.[1]) {
			return match[1].trim();
		}
	}

	return null;
}

function findMostRelevantCategory(question: string, transactions: Transaction[]): string | null {
	const questionText = normalizeText(question);
	const categories = Array.from(
		new Set(
			transactions
				.map((transaction) => transaction.category.trim())
				.filter(Boolean)
		)
	);

	for (const category of categories) {
		const normalizedCategory = normalizeText(category);
		if (normalizedCategory && questionText.includes(normalizedCategory)) {
			return category;
		}
	}

	const keywordMap: Record<string, string[]> = {
		food: ['food', 'grocer', 'grocery', 'restaurant', 'dining', 'eat', 'meal'],
		transport: ['transport', 'uber', 'bolt', 'taxi', 'fuel', 'petrol', 'gas'],
		entertainment: ['entertainment', 'movie', 'cinema', 'netflix'],
		shopping: ['shopping', 'shop', 'retail', 'mall'],
	};

	for (const [category, keywords] of Object.entries(keywordMap)) {
		if (keywords.some((keyword) => questionText.includes(keyword))) {
			return category;
		}
	}

	return null;
}

function formatTransactionDate(transaction: Transaction): string | null {
	const parsedDate = parseDate(transaction.date) ?? parseDate(transaction.createdAt);
	if (!parsedDate) {
		return null;
	}

	return parsedDate.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function sortTransactionsByNewest(transactions: Transaction[]): Transaction[] {
	return transactions.slice().sort((left, right) => {
		const leftDate =
			parseDate(left.date)?.getTime() ?? parseDate(left.createdAt)?.getTime() ?? 0;
		const rightDate =
			parseDate(right.date)?.getTime() ?? parseDate(right.createdAt)?.getTime() ?? 0;
		return rightDate - leftDate;
	});
}

function formatTransactionLabel(transaction: Transaction): string {
	const dateLabel = formatTransactionDate(transaction);
	const categoryLabel = transaction.subcategory
		? `${transaction.category} / ${transaction.subcategory}`
		: transaction.category;
	const parts = [transaction.title || categoryLabel || 'Transaction'];
	if (dateLabel) {
		parts.push(dateLabel);
	}
	return parts.join(' on ');
}

function formatTransactionList(
	transactions: Transaction[],
	currency: string,
	limit = 3
): string {
	return sortTransactionsByNewest(transactions)
		.slice(0, limit)
		.map(
			(transaction) =>
				`${formatTransactionLabel(transaction)} (${formatCurrency(Math.abs(transaction.amount), currency)})`
		)
		.join(', ');
}

function getMonthlyAverage(total: number, count: number): number {
	if (count === 0) {
		return 0;
	}
	return total / count;
}

function formatTopBreakdown(
	items: Array<{ label: string; amount: number }>,
	currency: string,
	limit = 3
): string {
	return items
		.slice()
		.sort((left, right) => right.amount - left.amount)
		.slice(0, limit)
		.map((item) => `${item.label} (${formatCurrency(item.amount, currency)})`)
		.join(', ');
}

// Helper function to create API response
function createResponse(
	statusCode: number,
	body: ApiResponse
): { statusCode: number; body: string } {
	return {
		statusCode,
		body: JSON.stringify(body),
	};
}

// Main API function to get user transactions
export const getUserTransactions = functions.https.onRequest(async (req, res) => {
	if (!setCorsHeaders(req, res)) {
		res.status(403).json({ success: false, error: 'Origin not allowed' });
		return;
	}
	// Handle CORS preflight requests
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	// Only allow GET requests
	if (req.method !== 'GET') {
		const response = createResponse(405, {
			success: false,
			error: 'Method not allowed. Only GET requests are supported.',
		});
		res.status(response.statusCode).send(response.body);
		return;
	}

	try {
		await verifyAppCheck(req);
		// Verify JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			const response = createResponse(401, {
				success: false,
				error: 'Authorization header is required',
			});
			res.status(response.statusCode).send(response.body);
			return;
		}

		const decodedToken = await verifyToken(authHeader);
		const userId = decodedToken.uid;
		await enforceRequestLimit(userId, 'transactions', 60);

		// Query Firestore for user's transactions
		const transactionsRef = db.collection('users').doc(userId).collection('transactions');
		const snapshot = await transactionsRef
			.orderBy('date', 'desc')
			.limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 200))
			.get();

		const transactions: Transaction[] = [];
		snapshot.forEach((doc) => {
			const data = doc.data();
			transactions.push({
				id: doc.id,
				userId: data.userId,
				accountId: data.accountId,
				transferAccountId: data.transferAccountId,
				amount: data.amount,
				title: data.title,
				category: data.category,
				subcategory: data.subcategory,
				type: data.type,
				description: data.description,
				date:
					parseDate(data.date)?.toISOString() ??
					parseDate(data.createdAt)?.toISOString() ??
					'',
				createdAt: parseDate(data.createdAt)?.toISOString(),
				updatedAt: parseDate(data.updatedAt)?.toISOString(),
			});
		});

		// Return successful response
		const response = createResponse(200, {
			success: true,
			data: transactions,
			message: `Successfully retrieved ${transactions.length} transactions`,
		});
		res.status(response.statusCode).send(response.body);
	} catch (error) {
		console.error('Error in getUserTransactions:', error);

		let statusCode = 500;
		let errorMessage = 'Internal server error';

		if (error instanceof Error) {
			if (
				error.message.includes('Authorization header') ||
				error.message.includes('Bearer')
			) {
				statusCode = 401;
				errorMessage = 'Invalid Authorization header format';
			} else if (error.message.includes('Invalid or expired token')) {
				statusCode = 401;
				errorMessage = 'Invalid or expired token';
			} else if (error.message.includes('Missing or invalid')) {
				statusCode = 401;
				errorMessage = 'Missing or invalid Authorization header';
			}
		}

		const response = createResponse(statusCode, {
			success: false,
			error: errorMessage,
		});
		res.status(response.statusCode).send(response.body);
	}
});

// Health check endpoint
export const healthCheck = functions.https.onRequest((req, res) => {
	if (!setCorsHeaders(req, res)) {
		res.status(403).json({ success: false, error: 'Origin not allowed' });
		return;
	}
	res.json({
		success: true,
		message: 'API is running',
		timestamp: new Date().toISOString(),
	});
});

export const askAI = functions.https.onRequest(async (req, res) => {
	if (!setCorsHeaders(req, res)) {
		res.status(403).json({ success: false, error: 'Origin not allowed' });
		return;
	}
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if (req.method !== 'POST') {
		const response: AskAIResponse = {
			success: false,
			error: 'Method not allowed. Only POST requests are supported.',
		};
		res.status(405).json(response);
		return;
	}

	try {
		await verifyAppCheck(req);
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			res.status(401).json({ success: false, error: 'Authorization header is required' });
			return;
		}

		const decodedToken = await verifyToken(authHeader);
		const body = (req.body || {}) as AskAIRequestBody;
		const question = (body.question || '').trim();

		if (!question) {
			res.status(400).json({ success: false, error: 'Question is required' });
			return;
		}
		if (question.length > 500) {
			res.status(400).json({ success: false, error: 'Question must be 500 characters or fewer' });
			return;
		}

		await enforceRequestLimit(decodedToken.uid, 'ai', 10);

		const userRef = db.collection('users').doc(decodedToken.uid);
		const [transactionsSnapshot, accountsSnapshot] = await Promise.all([
			userRef.collection('transactions').limit(2000).get(),
			userRef.collection('accounts').get(),
		]);

		const transactions: Transaction[] = [];
		transactionsSnapshot.forEach((doc) => {
			const data = doc.data();
			transactions.push({
				id: doc.id,
				userId: String(data.userId || decodedToken.uid),
				accountId: data.accountId ? String(data.accountId) : undefined,
				transferAccountId: data.transferAccountId
					? String(data.transferAccountId)
					: undefined,
				amount: Number(data.amount || 0),
				title: String(data.title || data.description || 'Untitled transaction'),
				description: data.description ? String(data.description) : '',
				category: String(data.category || 'Uncategorized'),
				subcategory: data.subcategory ? String(data.subcategory) : undefined,
				type:
					data.type === 'income' || data.type === 'transfer'
						? data.type
						: 'expense',
				date: parseDate(data.date)?.toISOString(),
				createdAt: parseDate(data.createdAt)?.toISOString(),
				updatedAt: parseDate(data.updatedAt)?.toISOString(),
			});
		});

		const accounts: Account[] = [];
		accountsSnapshot.forEach((doc) => {
			const data = doc.data();
			accounts.push({
				id: doc.id,
				name: String(data.name || 'Unnamed account'),
				type: String(data.type || 'account'),
				balance: Number(data.balance || 0),
				creditLimit: Number(data.creditLimit || 0),
				currency: String(data.currency || 'ZAR'),
			});
		});

		const accountNameById = new Map<string, Account>(
			accounts.map((account) => [account.id, account])
		);
		const preferredCurrency = accounts[0]?.currency || 'ZAR';

		if (transactions.length === 0) {
			res.status(200).json({
				success: true,
				answer:
					'I could not find any transactions yet. Add a few transactions first, then ask me about spending, merchants, categories, or accounts.',
			});
			return;
		}

		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

		const inThisMonth = (transaction: Transaction): boolean => {
			const parsedDate = parseDate(transaction.date) ?? parseDate(transaction.createdAt);
			if (!parsedDate) {
				return false;
			}
			return parsedDate >= monthStart && parsedDate < nextMonthStart;
		};

		const expensesThisMonth = transactions.filter(
			(transaction) => transaction.type === 'expense' && inThisMonth(transaction)
		);
		const allExpenses = transactions.filter((transaction) => transaction.type === 'expense');
		const incomeThisMonth = transactions.filter(
			(transaction) => transaction.type === 'income' && inThisMonth(transaction)
		);

		const totalSpentThisMonth = expensesThisMonth.reduce(
			(sum, transaction) => sum + Math.abs(transaction.amount),
			0
		);
		const totalIncomeThisMonth = incomeThisMonth.reduce(
			(sum, transaction) => sum + Math.abs(transaction.amount),
			0
		);

		const normalizedQuestion = normalizeText(question);
		const merchantQuery = extractMerchantQuery(question);

		if (merchantQuery) {
			const merchantSearch = normalizeText(merchantQuery);
			const merchantTransactions = allExpenses.filter((transaction) =>
				getTransactionSearchText(transaction).includes(merchantSearch)
			);

			const merchantSpend = merchantTransactions.reduce(
				(sum, transaction) => sum + Math.abs(transaction.amount),
				0
			);
			const sortedMerchantTransactions = sortTransactionsByNewest(merchantTransactions);
			const latestMatch = sortedMerchantTransactions[0];
			const averageMerchantSpend = getMonthlyAverage(
				merchantSpend,
				merchantTransactions.length
			);

			if (merchantTransactions.length === 0) {
				res.status(200).json({
					success: true,
					answer: `I could not find any transactions that match "${merchantQuery}".`,
				});
				return;
			}

			const lastSeen = formatTransactionDate(latestMatch);
			res.status(200).json({
				success: true,
				answer:
					`I found ${merchantTransactions.length} ${pluralize(merchantTransactions.length, 'transaction')} for ${merchantQuery}, totaling ${formatCurrency(merchantSpend, preferredCurrency)}.\n` +
					`Average spend per visit: ${formatCurrency(averageMerchantSpend, preferredCurrency)}.` +
					(lastSeen ? ` Latest visit: ${lastSeen}.` : '') +
					(sortedMerchantTransactions.length > 0
						? ` Recent matches: ${formatTransactionList(sortedMerchantTransactions, preferredCurrency)}.`
						: ''),
			});
			return;
		}

		if (
			normalizedQuestion.includes('which account') &&
			(normalizedQuestion.includes('spending the most') ||
				normalizedQuestion.includes('spent the most') ||
				normalizedQuestion.includes('most from'))
		) {
			const spendByAccount = new Map<string, number>();
			for (const transaction of allExpenses) {
				const accountId = transaction.accountId || 'unknown';
				spendByAccount.set(
					accountId,
					(spendByAccount.get(accountId) || 0) + Math.abs(transaction.amount)
				);
			}

			const highestSpendAccount = Array.from(spendByAccount.entries()).sort(
				(left, right) => right[1] - left[1]
			)[0];

			if (!highestSpendAccount) {
				res.status(200).json({
					success: true,
					answer: 'I could not find any expense transactions tied to an account yet.',
				});
				return;
			}

			const [accountId, totalSpend] = highestSpendAccount;
			const account = accountNameById.get(accountId);
			const accountName = account?.name || 'your account';
			const accountExpenseTransactions = allExpenses.filter(
				(transaction) => transaction.accountId === accountId
			);
			const transactionCount = accountExpenseTransactions.length;
			const averageExpense = getMonthlyAverage(totalSpend, transactionCount);
			const spendByAccountItems = Array.from(spendByAccount.entries()).map(
				([entryAccountId, amount]) => ({
					label: accountNameById.get(entryAccountId)?.name || 'Unknown account',
					amount,
				})
			);
			const leadingShare = allExpenses.length
				? (totalSpend / allExpenses.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)) * 100
				: 0;

			res.status(200).json({
				success: true,
				answer:
					`${accountName} has the highest spend so far at ${formatCurrency(totalSpend, account?.currency || preferredCurrency)} across ` +
					`${transactionCount} ${pluralize(transactionCount, 'expense')}.\n` +
					`Average expense from this account: ${formatCurrency(averageExpense, account?.currency || preferredCurrency)}. ` +
					`It represents ${leadingShare.toFixed(1)}% of all recorded expense spend.\n` +
					`Top accounts by spend: ${formatTopBreakdown(spendByAccountItems, preferredCurrency)}.\n` +
					`Recent expenses from ${accountName}: ${formatTransactionList(accountExpenseTransactions, account?.currency || preferredCurrency)}.`,
			});
			return;
		}

		const matchedCategory = findMostRelevantCategory(question, allExpenses);
		if (matchedCategory) {
			const normalizedCategory = normalizeText(matchedCategory);
			const categoryTransactions = expensesThisMonth.filter((transaction) => {
				const searchText = getTransactionSearchText(transaction);
				return (
					normalizeText(transaction.category) === normalizedCategory ||
					searchText.includes(normalizedCategory)
				);
			});

			const categorySpend = categoryTransactions.reduce(
				(sum, transaction) => sum + Math.abs(transaction.amount),
				0
			);
			const averageCategorySpend = getMonthlyAverage(
				categorySpend,
				categoryTransactions.length
			);
			const biggestCategoryTransaction = categoryTransactions
				.slice()
				.sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))[0];

			const answer =
				categoryTransactions.length > 0
					? `You spent ${formatCurrency(categorySpend, preferredCurrency)} on ${matchedCategory} this month across ${categoryTransactions.length} ${pluralize(categoryTransactions.length, 'transaction')}.\n` +
						`Average ${matchedCategory} transaction: ${formatCurrency(averageCategorySpend, preferredCurrency)}.` +
						(biggestCategoryTransaction
							? ` Largest one was ${formatTransactionLabel(biggestCategoryTransaction)} for ${formatCurrency(Math.abs(biggestCategoryTransaction.amount), preferredCurrency)}.`
							: '') +
						` Recent ${matchedCategory} transactions: ${formatTransactionList(categoryTransactions, preferredCurrency)}.`
					: `I could not find any ${matchedCategory} expense transactions for this month.`;

			res.status(200).json({ success: true, answer });
			return;
		}

		if (
			normalizedQuestion.includes('this month') &&
			(normalizedQuestion.includes('spend') || normalizedQuestion.includes('spent'))
		) {
			const spendByCategory = new Map<string, number>();
			for (const transaction of expensesThisMonth) {
				const category = transaction.category || 'Uncategorized';
				spendByCategory.set(
					category,
					(spendByCategory.get(category) || 0) + Math.abs(transaction.amount)
				);
			}

			const topCategoryBreakdown = Array.from(spendByCategory.entries()).map(
				([label, amount]) => ({
					label,
					amount,
				})
			);
			const averageExpenseThisMonth = getMonthlyAverage(
				totalSpentThisMonth,
				expensesThisMonth.length
			);

			res.status(200).json({
				success: true,
				answer:
					`You spent ${formatCurrency(totalSpentThisMonth, preferredCurrency)} this month across ${expensesThisMonth.length} ${pluralize(expensesThisMonth.length, 'expense')}.\n` +
					`Average expense: ${formatCurrency(averageExpenseThisMonth, preferredCurrency)}. Income this month: ${formatCurrency(totalIncomeThisMonth, preferredCurrency)}.\n` +
					(topCategoryBreakdown.length > 0
						? `Top categories: ${formatTopBreakdown(topCategoryBreakdown, preferredCurrency)}.\n`
						: '') +
					`Most recent expenses: ${formatTransactionList(expensesThisMonth, preferredCurrency)}.`,
			});
			return;
		}

		const spendByCategory = new Map<string, number>();
		for (const transaction of expensesThisMonth) {
			const category = transaction.category || 'Uncategorized';
			spendByCategory.set(
				category,
				(spendByCategory.get(category) || 0) + Math.abs(transaction.amount)
			);
		}

		const spendByAccountSummary = new Map<string, number>();
		for (const transaction of expensesThisMonth) {
			const label =
				accountNameById.get(transaction.accountId || '')?.name || 'Unknown account';
			spendByAccountSummary.set(
				label,
				(spendByAccountSummary.get(label) || 0) + Math.abs(transaction.amount)
			);
		}

		res.status(200).json({
			success: true,
			answer:
				`I analyzed ${expensesThisMonth.length} expense transactions for this month.\n` +
				`Total spend: ${formatCurrency(totalSpentThisMonth, preferredCurrency)}. Total income: ${formatCurrency(totalIncomeThisMonth, preferredCurrency)}.\n` +
				`Top categories: ${formatTopBreakdown(
					Array.from(spendByCategory.entries()).map(([label, amount]) => ({
						label,
						amount,
					})),
					preferredCurrency
				)}.\n` +
				`Top accounts: ${formatTopBreakdown(
					Array.from(spendByAccountSummary.entries()).map(([label, amount]) => ({
						label,
						amount,
					})),
					preferredCurrency
				)}.\n` +
				`Recent expenses: ${formatTransactionList(expensesThisMonth, preferredCurrency)}.\n` +
				'Ask about a category, merchant, or an account for a more focused breakdown.',
		});
	} catch (error) {
		console.error('Error in askAI:', error);
		const rateLimited = error instanceof Error && error.message === 'Rate limit exceeded';
		res.status(rateLimited ? 429 : 500).json({
			success: false,
			error: rateLimited ? 'Too many requests. Try again shortly.' : 'Internal server error',
		});
	}
});
