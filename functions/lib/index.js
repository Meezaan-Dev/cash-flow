"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAI = exports.healthCheck = exports.getUserTransactions = void 0;
exports.buildGeminiPrompt = buildGeminiPrompt;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const genai_1 = require("@google/genai");
const crypto_1 = require("crypto");
admin.initializeApp();
const db = admin.firestore();
const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CONTENT_LENGTH = 2000;
async function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header');
    }
    try {
        return await admin.auth().verifyIdToken(authHeader.slice('Bearer '.length));
    }
    catch (_a) {
        throw new Error('Invalid or expired token');
    }
}
function setCorsHeaders(res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
}
function sendError(res, status, payload) {
    res.status(status).json(Object.assign({ success: false }, payload));
}
function parseDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    if (value instanceof admin.firestore.Timestamp)
        return value.toDate();
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
        const candidate = value.toDate();
        return Number.isNaN(candidate.getTime()) ? null : candidate;
    }
    if (typeof value !== 'string')
        return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function createResponse(statusCode, body) {
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
function toTransaction(doc) {
    var _a, _b, _c;
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
        date: (_a = parseDate(data.date)) === null || _a === void 0 ? void 0 : _a.toISOString(),
        createdAt: (_b = parseDate(data.createdAt)) === null || _b === void 0 ? void 0 : _b.toISOString(),
        updatedAt: (_c = parseDate(data.updatedAt)) === null || _c === void 0 ? void 0 : _c.toISOString(),
    };
}
function toAccount(doc) {
    const data = doc.data();
    return {
        id: doc.id,
        name: String(data.name || 'Unnamed account'),
        type: String(data.type || 'account'),
        balance: Number(data.balance || 0),
        creditLimit: data.creditLimit == null ? undefined : Number(data.creditLimit),
        currency: String(data.currency || 'ZAR'),
    };
}
function buildGeminiPrompt(question, history, accounts, transactions) {
    return [
        'You are CashFlow, a concise personal-finance data assistant.',
        'Answer only from the supplied account and transaction data. Never invent records or balances.',
        'Use transaction date, falling back to createdAt. Treat amounts as absolute values when totaling income or expenses.',
        'Transfers are not income or expenses unless the user explicitly asks about transfers.',
        'When data is insufficient, say so. Do not provide investment, tax, legal, or credit advice.',
        `Today is ${new Date().toISOString().slice(0, 10)}.`,
        `Accounts JSON: ${JSON.stringify(accounts)}`,
        `Transactions JSON: ${JSON.stringify(transactions)}`,
        `Recent conversation JSON: ${JSON.stringify(history)}`,
        `Current question: ${question}`,
    ].join('\n\n');
}
exports.getUserTransactions = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    setCorsHeaders(res);
    if (req.method !== 'GET') {
        const response = createResponse(405, { success: false, error: 'Method not allowed. Only GET requests are supported.' });
        res.status(response.statusCode).send(response.body);
        return;
    }
    try {
        if (!req.headers.authorization) {
            res.status(401).json({ success: false, error: 'Authorization header is required' });
            return;
        }
        const { uid } = await verifyToken(req.headers.authorization);
        const snapshot = await db.collection('users').doc(uid).collection('transactions').orderBy('date', 'desc').get();
        const transactions = snapshot.docs.map(toTransaction);
        res.status(200).json({ success: true, data: transactions, message: `Successfully retrieved ${transactions.length} transactions` });
    }
    catch (error) {
        console.error('Error in getUserTransactions:', error);
        const unauthorized = error instanceof Error && (error.message.includes('Authorization') || error.message.includes('token'));
        res.status(unauthorized ? 401 : 500).json({ success: false, error: unauthorized ? 'Invalid or expired token' : 'Internal server error' });
    }
});
exports.healthCheck = functions.https.onRequest((_req, res) => {
    setCorsHeaders(res);
    res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});
exports.askAI = functions
    .runWith({ secrets: ['GEMINI_API_KEY'] })
    .https.onRequest(async (req, res) => {
    var _a;
    const requestId = req.get('function-execution-id') || (0, crypto_1.randomUUID)();
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    setCorsHeaders(res);
    if (req.method !== 'POST') {
        sendError(res, 405, {
            error: 'The AI endpoint only accepts POST requests.',
            code: 'METHOD_NOT_ALLOWED',
            details: `Received ${req.method}. Send a JSON POST request to /askAI.`,
            retryable: false,
            requestId,
        });
        return;
    }
    try {
        if (!req.headers.authorization) {
            sendError(res, 401, {
                error: 'You must be signed in to use the AI assistant.',
                code: 'AUTH_HEADER_MISSING',
                details: 'The request did not include a Firebase ID token. Sign in again and retry.',
                retryable: false,
                requestId,
            });
            return;
        }
        const decodedToken = await verifyToken(req.headers.authorization);
        const body = (req.body || {});
        const question = String(body.question || '').trim();
        const requestedUserId = String(body.userId || '').trim();
        if (!question) {
            sendError(res, 400, {
                error: 'Enter a question before sending.',
                code: 'QUESTION_REQUIRED',
                details: 'The question field was empty after whitespace was removed.',
                retryable: false,
                requestId,
            });
            return;
        }
        if (question.length > MAX_QUESTION_LENGTH) {
            sendError(res, 400, {
                error: `Your question is too long (${question.length} characters).`,
                code: 'QUESTION_TOO_LONG',
                details: `Shorten it to ${MAX_QUESTION_LENGTH} characters or fewer and send again.`,
                retryable: false,
                requestId,
            });
            return;
        }
        if (!requestedUserId) {
            sendError(res, 400, {
                error: 'The signed-in user could not be identified.',
                code: 'USER_ID_REQUIRED',
                details: 'Refresh the app and sign in again before retrying.',
                retryable: false,
                requestId,
            });
            return;
        }
        if (decodedToken.uid !== requestedUserId) {
            sendError(res, 403, {
                error: 'The request user does not match the signed-in account.',
                code: 'USER_MISMATCH',
                details: 'Sign out, sign back in, and retry. No financial data was sent to Gemini.',
                retryable: false,
                requestId,
            });
            return;
        }
        const rawHistory = Array.isArray(body.history) ? body.history : [];
        if (rawHistory.length > MAX_HISTORY_MESSAGES) {
            sendError(res, 400, {
                error: 'The conversation history is too large.',
                code: 'HISTORY_TOO_LARGE',
                details: `Only the ${MAX_HISTORY_MESSAGES} most recent messages can be sent. Clear the chat and retry.`,
                retryable: false,
                requestId,
            });
            return;
        }
        const history = [];
        for (const message of rawHistory) {
            if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string' || !message.content.trim() || message.content.length > MAX_HISTORY_CONTENT_LENGTH) {
                sendError(res, 400, {
                    error: 'The conversation history contains an invalid message.',
                    code: 'HISTORY_INVALID',
                    details: `Each message needs a user/assistant role and 1-${MAX_HISTORY_CONTENT_LENGTH} characters. Clear the chat and retry.`,
                    retryable: false,
                    requestId,
                });
                return;
            }
            history.push({ role: message.role, content: message.content.trim() });
        }
        const userRef = db.collection('users').doc(decodedToken.uid);
        const [transactionsSnapshot, accountsSnapshot] = await Promise.all([
            userRef.collection('transactions').limit(2000).get(),
            userRef.collection('accounts').get(),
        ]);
        const transactions = transactionsSnapshot.docs.map(toTransaction);
        const accounts = accountsSnapshot.docs.map(toAccount);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Gemini API key is not configured');
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: buildGeminiPrompt(question, history, accounts, transactions),
            config: { temperature: 0.2, maxOutputTokens: 1200 },
        });
        const answer = (_a = response.text) === null || _a === void 0 ? void 0 : _a.trim();
        if (!answer)
            throw new Error('Gemini returned an empty response');
        res.status(200).json({ success: true, answer });
    }
    catch (error) {
        console.error('Error in askAI:', { requestId, error });
        const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
        const message = error instanceof Error ? error.message : '';
        if (message.includes('Invalid or expired token')) {
            sendError(res, 401, {
                error: 'Your session token is invalid or expired.',
                code: 'AUTH_TOKEN_INVALID',
                details: 'Sign out and sign back in to obtain a fresh Firebase session, then retry.',
                retryable: false,
                requestId,
            });
            return;
        }
        if (message.includes('API key is not configured')) {
            sendError(res, 503, {
                error: 'The AI assistant is not configured on the server.',
                code: 'GEMINI_CONFIG_MISSING',
                details: 'Set GEMINI_API_KEY in functions/.secret.local for emulation or Firebase Secret Manager for production, then restart or redeploy the function.',
                retryable: false,
                requestId,
            });
            return;
        }
        if (status === 429) {
            sendError(res, 429, {
                error: 'Gemini rejected the request because its rate or quota limit was reached.',
                code: 'GEMINI_RATE_LIMITED',
                details: 'Wait 30-60 seconds before retrying. If it continues, review the Gemini API project quota and billing status.',
                retryable: true,
                requestId,
            });
            return;
        }
        if (status === 401 || status === 403) {
            sendError(res, 503, {
                error: 'Gemini rejected the server API key.',
                code: 'GEMINI_AUTH_FAILED',
                details: 'Verify that GEMINI_API_KEY is valid, enabled for the Gemini API, and attached to the deployed function.',
                retryable: false,
                requestId,
            });
            return;
        }
        if (/fetch failed|network|timed? out|econn/i.test(message) || status >= 500) {
            sendError(res, 503, {
                error: 'The server could not complete its request to Gemini.',
                code: 'GEMINI_UNAVAILABLE',
                details: 'The provider or network is temporarily unavailable. Retry in a moment; your chat history remains in this browser session.',
                retryable: true,
                requestId,
            });
            return;
        }
        sendError(res, 502, {
            error: 'Gemini did not return a usable answer.',
            code: 'GEMINI_RESPONSE_INVALID',
            details: 'Retry with a shorter, more specific question. If it repeats, use the request reference when checking Function logs.',
            retryable: true,
            requestId,
        });
    }
});
//# sourceMappingURL=index.js.map