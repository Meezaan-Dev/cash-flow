"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllTransactionsStatus = exports.deleteAllTransactions = exports.deleteTransaction = exports.updateTransaction = exports.addTransfer = exports.addTransaction = void 0;
exports.addLedgerTransaction = addLedgerTransaction;
exports.addLedgerTransfer = addLedgerTransfer;
exports.updateLedgerTransaction = updateLedgerTransaction;
exports.deleteLedgerTransaction = deleteLedgerTransaction;
exports.deleteAllLedgerTransactions = deleteAllLedgerTransactions;
exports.getDeleteAllTransactionsStatus = getDeleteAllTransactionsStatus;
const functions = require("firebase-functions");
const crypto_1 = require("crypto");
const firebase_1 = require("./firebase");
const http_1 = require("./http");
const MAX_MONEY = 1000000000000;
const TEXT_LIMITS = {
    documentId: 1500,
    title: 200,
    category: 80,
    subcategory: 80,
    description: 2000,
};
const usersRef = (uid) => firebase_1.db.collection('users').doc(uid);
const accountsRef = (uid) => usersRef(uid).collection('accounts');
const transactionsRef = (uid) => usersRef(uid).collection('transactions');
const resetJobRef = (uid) => usersRef(uid).collection('ledgerMaintenance').doc('transactionReset');
const RESET_BATCH_SIZE = 400;
const RESET_WORKER_TIMEOUT_MS = 5 * 60 * 1000;
const readResetJob = async (uid) => {
    const snapshot = await resetJobRef(uid).get();
    return snapshot.exists ? snapshot.data() : null;
};
async function assertLedgerWritable(transaction, userId) {
    const resetSnapshot = await transaction.get(resetJobRef(userId));
    const resetJob = resetSnapshot.data();
    if ((resetJob === null || resetJob === void 0 ? void 0 : resetJob.status) === 'running') {
        throw new Error('Transactions are temporarily locked while the ledger is being reset.');
    }
}
function requiredText(value, field, maxLength) {
    if (typeof value !== 'string')
        throw new Error(`${field} is required.`);
    const normalized = value.trim();
    if (!normalized)
        throw new Error(`${field} is required.`);
    if (normalized.length > maxLength)
        throw new Error(`${field} is too long.`);
    return normalized;
}
function optionalText(value, field, maxLength) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string')
        throw new Error(`${field} is invalid.`);
    const normalized = value.trim();
    if (!normalized)
        return undefined;
    if (normalized.length > maxLength)
        throw new Error(`${field} is too long.`);
    return normalized;
}
function positiveMoney(value, field = 'Amount') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_MONEY) {
        throw new Error(`${field} must be greater than zero.`);
    }
    return value;
}
function optionalDate(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    if (typeof value !== 'string')
        throw new Error('Date is invalid.');
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new Error('Date is invalid.');
    return firebase_1.Timestamp.fromDate(date);
}
function ordinaryDelta(type, amount) {
    return type === 'income' ? amount : -amount;
}
function normalizeAddTransaction(body) {
    if (body.type !== 'income' && body.type !== 'expense') {
        throw new Error('Transaction type must be income or expense.');
    }
    const recurringOccurrenceDate = optionalText(body.recurringOccurrenceDate, 'Recurring occurrence date', 10);
    if (recurringOccurrenceDate && !/^\d{4}-\d{2}-\d{2}$/.test(recurringOccurrenceDate)) {
        throw new Error('Recurring occurrence date is invalid.');
    }
    return {
        type: body.type,
        accountId: requiredText(body.accountId, 'Account', TEXT_LIMITS.documentId),
        title: requiredText(body.title, 'Title', TEXT_LIMITS.title),
        category: requiredText(body.category, 'Category', TEXT_LIMITS.category),
        subcategory: optionalText(body.subcategory, 'Subcategory', TEXT_LIMITS.subcategory),
        description: optionalText(body.description, 'Description', TEXT_LIMITS.description),
        amount: positiveMoney(body.amount),
        date: optionalDate(body.date),
        recurringTransactionId: optionalText(body.recurringTransactionId, 'Recurring transaction ID', TEXT_LIMITS.documentId),
        recurringOccurrenceDate,
    };
}
function normalizeTransfer(body) {
    const fromAccountId = requiredText(body.fromAccountId, 'Source account', TEXT_LIMITS.documentId);
    const toAccountId = requiredText(body.toAccountId, 'Destination account', TEXT_LIMITS.documentId);
    if (fromAccountId === toAccountId) {
        throw new Error('Source and destination accounts must be different.');
    }
    return {
        fromAccountId,
        toAccountId,
        title: requiredText(body.title, 'Title', TEXT_LIMITS.title),
        description: optionalText(body.description, 'Description', TEXT_LIMITS.description),
        amount: positiveMoney(body.amount),
        date: optionalDate(body.date),
    };
}
function sendLedgerError(res, status, error, requestId) {
    const message = error instanceof Error ? error.message : 'Ledger operation failed.';
    (0, http_1.sendError)(res, status, {
        error: message,
        code: status === 400 ? 'LEDGER_INPUT_INVALID' : 'LEDGER_OPERATION_FAILED',
        details: message,
        retryable: false,
        requestId,
    });
}
async function assertAccountExists(transaction, userId, accountId) {
    const accountRef = accountsRef(userId).doc(accountId);
    const accountSnap = await transaction.get(accountRef);
    if (!accountSnap.exists) {
        throw new Error('Selected account could not be found.');
    }
    return accountRef;
}
function dataFromTransactionSnap(snapshot) {
    const data = snapshot.data();
    if (!snapshot.exists || !data)
        throw new Error('Transaction not found.');
    if (!data.accountId || !data.type || typeof data.amount !== 'number') {
        throw new Error('Existing transaction is invalid.');
    }
    return data;
}
async function addLedgerTransaction(uid, body) {
    const input = normalizeAddTransaction(body);
    const transactionId = transactionsRef(uid).doc().id;
    await firebase_1.db.runTransaction(async (transaction) => {
        await assertLedgerWritable(transaction, uid);
        const accountRef = await assertAccountExists(transaction, uid, input.accountId);
        const txRef = transactionsRef(uid).doc(transactionId);
        const now = firebase_1.Timestamp.now();
        transaction.set(txRef, Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ userId: uid, accountId: input.accountId, title: input.title, amount: input.amount, type: input.type, category: input.category }, (input.subcategory ? { subcategory: input.subcategory } : {})), (input.description ? { description: input.description } : {})), (input.date ? { date: input.date } : {})), (input.recurringTransactionId ? { recurringTransactionId: input.recurringTransactionId } : {})), (input.recurringOccurrenceDate ? { recurringOccurrenceDate: input.recurringOccurrenceDate } : {})), { createdAt: now }));
        transaction.update(accountRef, { balance: firebase_1.FieldValue.increment(ordinaryDelta(input.type, input.amount)) });
    });
    return transactionId;
}
async function addLedgerTransfer(uid, body) {
    const input = normalizeTransfer(body);
    const outgoingId = transactionsRef(uid).doc().id;
    const incomingId = transactionsRef(uid).doc().id;
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a;
        await assertLedgerWritable(transaction, uid);
        const fromRef = await assertAccountExists(transaction, uid, input.fromAccountId);
        const toRef = await assertAccountExists(transaction, uid, input.toAccountId);
        const now = firebase_1.Timestamp.now();
        const txDate = (_a = input.date) !== null && _a !== void 0 ? _a : now;
        const shared = Object.assign(Object.assign({ userId: uid, transferId: outgoingId, title: input.title, amount: input.amount, type: 'transfer', category: 'transfer' }, (input.description ? { description: input.description } : {})), { date: txDate, createdAt: now });
        transaction.set(transactionsRef(uid).doc(outgoingId), Object.assign(Object.assign({}, shared), { accountId: input.fromAccountId, transferAccountId: input.toAccountId, transferDirection: 'out' }));
        transaction.set(transactionsRef(uid).doc(incomingId), Object.assign(Object.assign({}, shared), { accountId: input.toAccountId, transferAccountId: input.fromAccountId, transferDirection: 'in' }));
        transaction.update(fromRef, { balance: firebase_1.FieldValue.increment(-input.amount) });
        transaction.update(toRef, { balance: firebase_1.FieldValue.increment(input.amount) });
    });
    return outgoingId;
}
async function updateLedgerTransaction(uid, body) {
    const transactionId = requiredText(body.id, 'Transaction ID', TEXT_LIMITS.documentId);
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d;
        await assertLedgerWritable(transaction, uid);
        const txRef = transactionsRef(uid).doc(transactionId);
        const old = dataFromTransactionSnap(await transaction.get(txRef));
        if (old.type === 'transfer' || body.type === 'transfer') {
            throw new Error('Transfers cannot be edited. Delete and recreate the transfer instead.');
        }
        const nextType = (_a = body.type) !== null && _a !== void 0 ? _a : old.type;
        if (nextType !== 'income' && nextType !== 'expense') {
            throw new Error('Transaction type must be income or expense.');
        }
        const updates = {
            updatedAt: firebase_1.Timestamp.now(),
        };
        if (body.title !== undefined)
            updates.title = requiredText(body.title, 'Title', TEXT_LIMITS.title);
        if (body.amount !== undefined)
            updates.amount = positiveMoney(body.amount);
        if (body.type !== undefined)
            updates.type = body.type;
        if (body.accountId !== undefined)
            updates.accountId = requiredText(body.accountId, 'Account', TEXT_LIMITS.documentId);
        if (body.category !== undefined)
            updates.category = requiredText(body.category, 'Category', TEXT_LIMITS.category);
        if (Object.prototype.hasOwnProperty.call(body, 'subcategory')) {
            updates.subcategory = (_b = optionalText(body.subcategory, 'Subcategory', TEXT_LIMITS.subcategory)) !== null && _b !== void 0 ? _b : firebase_1.FieldValue.delete();
        }
        if (Object.prototype.hasOwnProperty.call(body, 'description')) {
            updates.description = (_c = optionalText(body.description, 'Description', TEXT_LIMITS.description)) !== null && _c !== void 0 ? _c : firebase_1.FieldValue.delete();
        }
        if (body.date !== undefined) {
            updates.date = (_d = optionalDate(body.date)) !== null && _d !== void 0 ? _d : firebase_1.FieldValue.delete();
        }
        const oldAccountId = old.accountId;
        const newAccountId = typeof updates.accountId === 'string' ? updates.accountId : oldAccountId;
        const oldAmount = positiveMoney(old.amount, 'Existing amount');
        const newAmount = typeof updates.amount === 'number' ? updates.amount : oldAmount;
        const oldType = old.type;
        const newType = (typeof updates.type === 'string' ? updates.type : oldType);
        const oldDelta = ordinaryDelta(oldType, oldAmount);
        const newDelta = ordinaryDelta(newType, newAmount);
        if (oldAccountId !== newAccountId) {
            const oldAccountRef = await assertAccountExists(transaction, uid, oldAccountId);
            const newAccountRef = await assertAccountExists(transaction, uid, newAccountId);
            transaction.update(oldAccountRef, { balance: firebase_1.FieldValue.increment(-oldDelta) });
            transaction.update(newAccountRef, { balance: firebase_1.FieldValue.increment(newDelta) });
        }
        else {
            const balanceChange = newDelta - oldDelta;
            if (balanceChange !== 0) {
                const accountRef = await assertAccountExists(transaction, uid, oldAccountId);
                transaction.update(accountRef, { balance: firebase_1.FieldValue.increment(balanceChange) });
            }
        }
        transaction.update(txRef, updates);
    });
}
async function deleteLedgerTransaction(uid, body) {
    const transactionId = requiredText(body.id, 'Transaction ID', TEXT_LIMITS.documentId);
    await firebase_1.db.runTransaction(async (transaction) => {
        await assertLedgerWritable(transaction, uid);
        const txRef = transactionsRef(uid).doc(transactionId);
        const tx = dataFromTransactionSnap(await transaction.get(txRef));
        if (tx.type === 'transfer') {
            if (!tx.transferId || !tx.transferDirection || !tx.transferAccountId) {
                throw new Error('This legacy transfer cannot be deleted safely. Reconcile the accounts instead.');
            }
            const partnerQuery = await transaction.get(transactionsRef(uid).where('transferId', '==', tx.transferId));
            const transferDocs = partnerQuery.docs;
            if (transferDocs.length !== 2) {
                throw new Error('Paired transfer transaction could not be found.');
            }
            const outgoingDoc = transferDocs.find((doc) => doc.data().transferDirection === 'out');
            const incomingDoc = transferDocs.find((doc) => doc.data().transferDirection === 'in');
            if (!outgoingDoc || !incomingDoc) {
                throw new Error('Paired transfer transaction could not be found.');
            }
            const outgoing = outgoingDoc.data();
            const incoming = incomingDoc.data();
            const outgoingAccountRef = await assertAccountExists(transaction, uid, outgoing.accountId);
            const incomingAccountRef = await assertAccountExists(transaction, uid, incoming.accountId);
            transaction.update(outgoingAccountRef, { balance: firebase_1.FieldValue.increment(outgoing.amount) });
            transaction.update(incomingAccountRef, { balance: firebase_1.FieldValue.increment(-incoming.amount) });
            transaction.delete(outgoingDoc.ref);
            transaction.delete(incomingDoc.ref);
            return;
        }
        const accountRef = await assertAccountExists(transaction, uid, tx.accountId);
        const delta = tx.type === 'income' ? -tx.amount : tx.amount;
        transaction.update(accountRef, { balance: firebase_1.FieldValue.increment(delta) });
        transaction.delete(txRef);
    });
}
async function claimResetWorker(uid) {
    const now = Date.now();
    let job;
    let claimed = false;
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d, _e;
        const ref = resetJobRef(uid);
        const snapshot = await transaction.get(ref);
        const current = snapshot.data();
        const workerUntil = (_b = (_a = current === null || current === void 0 ? void 0 : current.workerUntil) === null || _a === void 0 ? void 0 : _a.toMillis()) !== null && _b !== void 0 ? _b : 0;
        if ((current === null || current === void 0 ? void 0 : current.status) === 'completed') {
            job = current;
            return;
        }
        if ((current === null || current === void 0 ? void 0 : current.status) === 'running' && workerUntil > now) {
            job = current;
            return;
        }
        job = Object.assign(Object.assign(Object.assign({ status: 'running', phase: (_c = current === null || current === void 0 ? void 0 : current.phase) !== null && _c !== void 0 ? _c : 'transactions', deletedTransactions: (_d = current === null || current === void 0 ? void 0 : current.deletedTransactions) !== null && _d !== void 0 ? _d : 0, resetAccounts: (_e = current === null || current === void 0 ? void 0 : current.resetAccounts) !== null && _e !== void 0 ? _e : 0 }, ((current === null || current === void 0 ? void 0 : current.lastTransactionId) ? { lastTransactionId: current.lastTransactionId } : {})), ((current === null || current === void 0 ? void 0 : current.lastAccountId) ? { lastAccountId: current.lastAccountId } : {})), { updatedAt: firebase_1.Timestamp.now() });
        transaction.set(ref, Object.assign(Object.assign({}, job), { workerId: (0, crypto_1.randomUUID)(), workerUntil: firebase_1.Timestamp.fromMillis(now + RESET_WORKER_TIMEOUT_MS), error: firebase_1.FieldValue.delete() }));
        claimed = true;
    });
    return { job, claimed };
}
async function updateResetJob(uid, updates) {
    await resetJobRef(uid).update(Object.assign(Object.assign({}, updates), { updatedAt: firebase_1.Timestamp.now() }));
}
async function deleteAllLedgerTransactions(uid) {
    const { job, claimed } = await claimResetWorker(uid);
    if (!claimed)
        return job;
    try {
        let current = job;
        while (current.phase === 'transactions') {
            let query = transactionsRef(uid).orderBy('__name__').limit(RESET_BATCH_SIZE);
            if (current.lastTransactionId) {
                query = query.startAfter(current.lastTransactionId);
            }
            const snapshot = await query.get();
            if (snapshot.empty) {
                await updateResetJob(uid, {
                    phase: 'accounts',
                    lastTransactionId: firebase_1.FieldValue.delete(),
                });
                current = Object.assign(Object.assign({}, current), { phase: 'accounts' });
                continue;
            }
            const batch = firebase_1.db.batch();
            snapshot.docs.forEach((transactionDoc) => batch.delete(transactionDoc.ref));
            await batch.commit();
            const lastTransactionId = snapshot.docs[snapshot.docs.length - 1].id;
            current = Object.assign(Object.assign({}, current), { lastTransactionId, deletedTransactions: current.deletedTransactions + snapshot.size });
            await updateResetJob(uid, {
                lastTransactionId,
                deletedTransactions: current.deletedTransactions,
                workerUntil: firebase_1.Timestamp.fromMillis(Date.now() + RESET_WORKER_TIMEOUT_MS),
            });
        }
        while (current.phase === 'accounts') {
            let query = accountsRef(uid).orderBy('__name__').limit(RESET_BATCH_SIZE);
            if (current.lastAccountId)
                query = query.startAfter(current.lastAccountId);
            const snapshot = await query.get();
            if (snapshot.empty) {
                current = Object.assign(Object.assign({}, current), { status: 'completed' });
                await updateResetJob(uid, {
                    status: 'completed',
                    workerId: firebase_1.FieldValue.delete(),
                    workerUntil: firebase_1.FieldValue.delete(),
                    lastAccountId: firebase_1.FieldValue.delete(),
                });
                return current;
            }
            const batch = firebase_1.db.batch();
            snapshot.docs.forEach((accountDoc) => batch.update(accountDoc.ref, { balance: 0, updatedAt: firebase_1.Timestamp.now() }));
            await batch.commit();
            const lastAccountId = snapshot.docs[snapshot.docs.length - 1].id;
            current = Object.assign(Object.assign({}, current), { lastAccountId, resetAccounts: current.resetAccounts + snapshot.size });
            await updateResetJob(uid, {
                lastAccountId,
                resetAccounts: current.resetAccounts,
                workerUntil: firebase_1.Timestamp.fromMillis(Date.now() + RESET_WORKER_TIMEOUT_MS),
            });
        }
        return current;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Ledger reset failed.';
        await updateResetJob(uid, {
            status: 'error',
            error: message,
            workerId: firebase_1.FieldValue.delete(),
            workerUntil: firebase_1.FieldValue.delete(),
        });
        throw error;
    }
}
async function getDeleteAllTransactionsStatus(uid) {
    return readResetJob(uid);
}
function ledgerEndpoint(operation) {
    return functions.https.onRequest(async (req, res) => {
        const requestId = (0, http_1.getRequestId)(req);
        const decoded = await (0, http_1.requirePostUser)(req, res, requestId);
        if (!decoded)
            return;
        try {
            const data = await operation(decoded.uid, (req.body || {}));
            (0, http_1.setCorsHeaders)(res);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            console.error('Ledger endpoint failed:', { requestId, error });
            sendLedgerError(res, error instanceof Error ? 400 : 500, error, requestId);
        }
    });
}
exports.addTransaction = ledgerEndpoint(async (uid, body) => ({
    id: await addLedgerTransaction(uid, body),
}));
exports.addTransfer = ledgerEndpoint(async (uid, body) => ({
    id: await addLedgerTransfer(uid, body),
}));
exports.updateTransaction = ledgerEndpoint(async (uid, body) => {
    await updateLedgerTransaction(uid, body);
    return null;
});
exports.deleteTransaction = ledgerEndpoint(async (uid, body) => {
    await deleteLedgerTransaction(uid, body);
    return null;
});
exports.deleteAllTransactions = ledgerEndpoint(async (uid) => {
    return deleteAllLedgerTransactions(uid);
});
exports.deleteAllTransactionsStatus = functions.https.onRequest(async (req, res) => {
    const requestId = (0, http_1.getRequestId)(req);
    const decoded = await (0, http_1.requirePostUser)(req, res, requestId);
    if (!decoded)
        return;
    try {
        const job = await getDeleteAllTransactionsStatus(decoded.uid);
        (0, http_1.setCorsHeaders)(res);
        res.status(200).json({ success: true, data: job });
    }
    catch (error) {
        console.error('Ledger reset status failed:', { requestId, error });
        sendLedgerError(res, 500, error, requestId);
    }
});
//# sourceMappingURL=ledger.js.map