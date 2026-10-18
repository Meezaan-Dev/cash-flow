"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBudget = void 0;
const functions = require("firebase-functions");
const firebase_1 = require("./firebase");
const http_1 = require("./http");
const MAX_BUDGETS = 8;
const usersRef = (uid) => firebase_1.db.collection('users').doc(uid);
const budgetsRef = (uid) => usersRef(uid).collection('budgets');
const optionalText = (value, field, maxLength) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    if (typeof value !== 'string' || value.length > maxLength)
        throw new Error(`${field} is invalid.`);
    return value;
};
const requiredText = (value, field, maxLength) => {
    var _a;
    const normalized = (_a = optionalText(value, field, maxLength)) === null || _a === void 0 ? void 0 : _a.trim();
    if (!normalized)
        throw new Error(`${field} is required.`);
    return normalized;
};
const day = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (!Number.isInteger(value) || value < 1 || value > 31) {
        throw new Error('Cycle day is invalid.');
    }
    return value;
};
const dateKey = (value, field) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`${field} is invalid.`);
    }
    return value;
};
exports.createBudget = functions.https.onRequest(async (req, res) => {
    const requestId = (0, http_1.getRequestId)(req);
    const decoded = await (0, http_1.requirePostUser)(req, res, requestId);
    if (!decoded)
        return;
    try {
        const body = (req.body || {});
        const categoryId = requiredText(body.categoryId, 'Category', 80);
        const accountId = optionalText(body.accountId, 'Account', 1500);
        const subCategoryId = optionalText(body.subCategoryId, 'Subcategory', 80);
        const amount = body.amount;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000000) {
            throw new Error('Budget amount must be greater than zero.');
        }
        const period = body.period === 'custom' ? 'custom' : body.period === 'monthly' ? 'monthly' : null;
        if (!period)
            throw new Error('Budget period is invalid.');
        const month = period === 'monthly' ? requiredText(body.month, 'Month', 7) : undefined;
        if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
            throw new Error('Month is invalid.');
        const startDate = dateKey(body.startDate, 'Start date');
        const endDate = dateKey(body.endDate, 'End date');
        if (startDate > endDate)
            throw new Error('Budget end date must be on or after its start date.');
        const cycleDay = period === 'custom' ? day(body.cycleDay) : undefined;
        const lifecycleStatus = body.lifecycleStatus === 'published' ? 'published' : 'draft';
        let createdId = '';
        await firebase_1.db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(budgetsRef(decoded.uid));
            const budgets = snapshot.docs.map((budget) => budget.data());
            if (budgets.length >= MAX_BUDGETS) {
                throw new Error(`You can create up to ${MAX_BUDGETS} budgets.`);
            }
            const duplicate = budgets.some((budget) => {
                var _a, _b, _c, _d, _e;
                return ((_a = budget.accountId) !== null && _a !== void 0 ? _a : '') === (accountId !== null && accountId !== void 0 ? accountId : '') &&
                    ((_b = budget.categoryId) !== null && _b !== void 0 ? _b : budget.category) === categoryId &&
                    ((_d = (_c = budget.subCategoryId) !== null && _c !== void 0 ? _c : budget.subcategory) !== null && _d !== void 0 ? _d : '') === (subCategoryId !== null && subCategoryId !== void 0 ? subCategoryId : '') &&
                    budget.period === period &&
                    (period === 'custom'
                        ? ((_e = budget.cycleDay) !== null && _e !== void 0 ? _e : budget.startDay) === cycleDay
                        : budget.startDate === startDate && budget.endDate === endDate);
            });
            if (duplicate)
                throw new Error('A budget already exists for this category and period.');
            createdId = budgetsRef(decoded.uid).doc().id;
            const highestOrder = budgets.reduce((highest, budget) => Math.max(highest, typeof budget.displayOrder === 'number' ? budget.displayOrder : -1), -1);
            transaction.create(budgetsRef(decoded.uid).doc(createdId), Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ userId: decoded.uid }, (accountId ? { accountId } : {})), { categoryId }), (subCategoryId ? { subCategoryId } : {})), { amount,
                period }), (month ? { month } : {})), (cycleDay ? { cycleDay } : {})), { startDate,
                endDate,
                lifecycleStatus, displayOrder: typeof body.displayOrder === 'number' ? body.displayOrder : highestOrder + 1, createdAt: firebase_1.Timestamp.now(), updatedAt: firebase_1.Timestamp.now() }));
        });
        (0, http_1.setCorsHeaders)(res);
        res.status(200).json({ success: true, data: { id: createdId } });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Budget creation failed.';
        console.error('Budget creation failed:', { requestId, error });
        (0, http_1.setCorsHeaders)(res);
        res.status(400).json({
            success: false,
            error: message,
            code: 'BUDGET_CREATE_FAILED',
            details: message,
            retryable: false,
            requestId,
        });
    }
});
//# sourceMappingURL=budgets.js.map