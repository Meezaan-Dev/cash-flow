"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = void 0;
const functions = require("firebase-functions");
const firebase_1 = require("./firebase");
const http_1 = require("./http");
const usersRef = (uid) => firebase_1.db.collection('users').doc(uid);
const accountsRef = (uid) => usersRef(uid).collection('accounts');
const transactionsRef = (uid) => usersRef(uid).collection('transactions');
const resetJobRef = (uid) => usersRef(uid).collection('ledgerMaintenance').doc('transactionReset');
const requiredId = (value) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 1500) {
        throw new Error('Account ID is required.');
    }
    return value.trim();
};
exports.deleteAccount = functions.https.onRequest(async (req, res) => {
    const requestId = (0, http_1.getRequestId)(req);
    const decoded = await (0, http_1.requirePostUser)(req, res, requestId);
    if (!decoded)
        return;
    try {
        const body = (req.body || {});
        const accountId = requiredId(body.id);
        const accountRef = accountsRef(decoded.uid).doc(accountId);
        await firebase_1.db.runTransaction(async (transaction) => {
            const accountSnapshot = await transaction.get(accountRef);
            const resetSnapshot = await transaction.get(resetJobRef(decoded.uid));
            const transactionSnapshot = await transaction.get(transactionsRef(decoded.uid).where('accountId', '==', accountId).limit(1));
            if (!accountSnapshot.exists)
                throw new Error('Account not found.');
            const resetJob = resetSnapshot.data();
            if ((resetJob === null || resetJob === void 0 ? void 0 : resetJob.status) === 'running') {
                throw new Error('Accounts are temporarily locked while the ledger is being reset.');
            }
            if (!transactionSnapshot.empty) {
                throw new Error('This account has transaction history and cannot be deleted.');
            }
            transaction.delete(accountRef);
        });
        (0, http_1.setCorsHeaders)(res);
        res.status(200).json({ success: true, data: null });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Account deletion failed.';
        console.error('Account deletion failed:', { requestId, error });
        (0, http_1.setCorsHeaders)(res);
        res.status(400).json({
            success: false,
            error: message,
            code: 'ACCOUNT_DELETE_FAILED',
            details: message,
            retryable: false,
            requestId,
        });
    }
});
//# sourceMappingURL=accounts.js.map