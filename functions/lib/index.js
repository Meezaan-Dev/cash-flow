"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.getUserTransactions = exports.createBudget = exports.deleteAccount = exports.deleteAllTransactionsStatus = exports.deleteAllTransactions = exports.deleteTransaction = exports.updateTransaction = exports.addTransfer = exports.addTransaction = void 0;
const functions = require("firebase-functions");
const firebase_1 = require("./firebase");
const http_1 = require("./http");
var ledger_1 = require("./ledger");
Object.defineProperty(exports, "addTransaction", { enumerable: true, get: function () { return ledger_1.addTransaction; } });
Object.defineProperty(exports, "addTransfer", { enumerable: true, get: function () { return ledger_1.addTransfer; } });
Object.defineProperty(exports, "updateTransaction", { enumerable: true, get: function () { return ledger_1.updateTransaction; } });
Object.defineProperty(exports, "deleteTransaction", { enumerable: true, get: function () { return ledger_1.deleteTransaction; } });
Object.defineProperty(exports, "deleteAllTransactions", { enumerable: true, get: function () { return ledger_1.deleteAllTransactions; } });
Object.defineProperty(exports, "deleteAllTransactionsStatus", { enumerable: true, get: function () { return ledger_1.deleteAllTransactionsStatus; } });
var accounts_1 = require("./accounts");
Object.defineProperty(exports, "deleteAccount", { enumerable: true, get: function () { return accounts_1.deleteAccount; } });
var budgets_1 = require("./budgets");
Object.defineProperty(exports, "createBudget", { enumerable: true, get: function () { return budgets_1.createBudget; } });
function decodeCursor(value) {
    if (typeof value !== 'string' || !value)
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (typeof parsed.date !== 'string' || typeof parsed.id !== 'string' || !parsed.id)
            return null;
        return { date: parsed.date, id: parsed.id };
    }
    catch (_a) {
        return null;
    }
}
function encodeCursor(cursor) {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}
function parseDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
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
exports.getUserTransactions = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        (0, http_1.setCorsHeaders)(res);
        res.status(204).send('');
        return;
    }
    (0, http_1.setCorsHeaders)(res);
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
        const { uid } = await (0, http_1.verifyToken)(req.headers.authorization);
        const requestedLimit = Number(req.query.limit);
        const isPaged = Boolean(req.query.cursor || req.query.limit);
        const pageSize = isPaged
            ? Number.isInteger(requestedLimit) && requestedLimit > 0
                ? Math.min(requestedLimit, 500)
                : 100
            : undefined;
        const cursor = decodeCursor(req.query.cursor);
        if (req.query.cursor && !cursor) {
            res.status(400).json({ success: false, error: 'Invalid transaction cursor' });
            return;
        }
        let transactionsQuery = firebase_1.db
            .collection('users')
            .doc(uid)
            .collection('transactions')
            .orderBy('date', 'desc')
            .orderBy('__name__', 'desc');
        if (cursor)
            transactionsQuery = transactionsQuery.startAfter(new Date(cursor.date), cursor.id);
        if (pageSize)
            transactionsQuery = transactionsQuery.limit(pageSize);
        const snapshot = await transactionsQuery.get();
        const transactions = snapshot.docs.map(toTransaction);
        const last = snapshot.docs[snapshot.docs.length - 1];
        const lastDate = last ? parseDate(last.get('date')) : null;
        const nextCursor = isPaged && lastDate
            ? encodeCursor({ date: lastDate.toISOString(), id: last.id })
            : undefined;
        res.status(200).json(Object.assign(Object.assign({ success: true, data: transactions }, (nextCursor ? { nextCursor } : {})), { message: `Successfully retrieved ${transactions.length} transactions` }));
    }
    catch (error) {
        console.error('Error in getUserTransactions:', error);
        const unauthorized = error instanceof Error &&
            (error.message.includes('Authorization') || error.message.includes('token'));
        res.status(unauthorized ? 401 : 500).json({
            success: false,
            error: unauthorized ? 'Invalid or expired token' : 'Internal server error',
        });
    }
});
exports.healthCheck = functions.https.onRequest((_req, res) => {
    (0, http_1.setCorsHeaders)(res);
    res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});
//# sourceMappingURL=index.js.map