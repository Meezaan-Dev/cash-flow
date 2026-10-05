"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.setCorsHeaders = setCorsHeaders;
exports.sendError = sendError;
exports.getRequestId = getRequestId;
exports.requirePostUser = requirePostUser;
const admin = require("firebase-admin");
const crypto_1 = require("crypto");
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
function getRequestId(req) {
    return req.get('function-execution-id') || (0, crypto_1.randomUUID)();
}
async function requirePostUser(req, res, requestId) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return null;
    }
    setCorsHeaders(res);
    if (req.method !== 'POST') {
        sendError(res, 405, {
            error: 'This endpoint only accepts POST requests.',
            code: 'METHOD_NOT_ALLOWED',
            details: `Received ${req.method}. Send a JSON POST request.`,
            retryable: false,
            requestId,
        });
        return null;
    }
    if (!req.headers.authorization) {
        sendError(res, 401, {
            error: 'You must be signed in to perform this action.',
            code: 'AUTH_HEADER_MISSING',
            details: 'The request did not include a Firebase ID token. Sign in again and retry.',
            retryable: false,
            requestId,
        });
        return null;
    }
    try {
        return await verifyToken(req.headers.authorization);
    }
    catch (_a) {
        sendError(res, 401, {
            error: 'Your session token is invalid or expired.',
            code: 'AUTH_TOKEN_INVALID',
            details: 'Sign out and sign back in to obtain a fresh Firebase session, then retry.',
            retryable: false,
            requestId,
        });
        return null;
    }
}
//# sourceMappingURL=http.js.map