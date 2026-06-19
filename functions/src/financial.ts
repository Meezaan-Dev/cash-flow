import * as admin from 'firebase-admin';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';

const db = admin.firestore();
const MAX_MONEY = 1_000_000_000_000;
const commandOptions = { region: 'us-central1', enforceAppCheck: true } as const;

type Input = Record<string, unknown>;
type CommandResult = { success: true; ids?: string[]; balances?: Record<string, number> };

function requirePrincipal(request: CallableRequest<Input>): string {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in is required.');
	if (request.auth.token.email_verified !== true) {
		throw new HttpsError('permission-denied', 'Verify your email before accessing financial data.');
	}
	return request.auth.uid;
}

function strictObject(value: unknown, allowed: string[], label = 'request'): Input {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new HttpsError('invalid-argument', `${label} must be an object.`);
	}
	const input = value as Input;
	const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
	if (unknown.length) throw new HttpsError('invalid-argument', `${label} contains unsupported fields.`);
	return input;
}

function text(input: Input, key: string, max: number, optional = false): string | undefined {
	const value = input[key];
	if ((value === undefined || value === null || value === '') && optional) return undefined;
	if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
		throw new HttpsError('invalid-argument', `${key} is invalid.`);
	}
	return value.trim();
}

function money(input: Input, key: string, positive = false): number {
	const value = input[key];
	if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_MONEY) {
		throw new HttpsError('invalid-argument', `${key} is invalid.`);
	}
	if (positive && value <= 0) throw new HttpsError('invalid-argument', `${key} must be positive.`);
	return value;
}

function timestamp(input: Input, key: string): admin.firestore.Timestamp | undefined {
	if (input[key] === undefined) return undefined;
	if (typeof input[key] !== 'string' || input[key].length > 40) {
		throw new HttpsError('invalid-argument', `${key} is invalid.`);
	}
	const value = new Date(input[key] as string);
	if (Number.isNaN(value.getTime())) throw new HttpsError('invalid-argument', `${key} is invalid.`);
	return admin.firestore.Timestamp.fromDate(value);
}

function balanceDelta(data: admin.firestore.DocumentData): number {
	const amount = Number(data.amount);
	if (!Number.isFinite(amount) || amount <= 0) throw new HttpsError('failed-precondition', 'Stored transaction is invalid.');
	if (data.type === 'income') return amount;
	if (data.type === 'expense') return -amount;
	throw new HttpsError('failed-precondition', 'Transfer records cannot be edited independently.');
}

async function enforceRateLimit(uid: string, limit = 60): Promise<void> {
	const minute = Math.floor(Date.now() / 60_000);
	const ref = db.collection('_security').doc(`financial-${uid}-${minute}`);
	await db.runTransaction(async (tx) => {
		const snapshot = await tx.get(ref);
		const count = snapshot.exists ? Number(snapshot.get('count') || 0) : 0;
		if (count >= limit) throw new HttpsError('resource-exhausted', 'Too many requests. Try again shortly.');
		tx.set(ref, { count: count + 1, expiresAt: admin.firestore.Timestamp.fromMillis((minute + 2) * 60_000) });
	});
}

async function execute(
	request: CallableRequest<Input>,
	allowed: string[],
	handler: (uid: string, input: Input, tx: admin.firestore.Transaction) => Promise<CommandResult>
): Promise<CommandResult> {
	const uid = requirePrincipal(request);
	const input = strictObject(request.data, [...allowed, 'idempotencyKey']);
	const idempotencyKey = text(input, 'idempotencyKey', 100) as string;
	if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
		throw new HttpsError('invalid-argument', 'idempotencyKey is invalid.');
	}
	await enforceRateLimit(uid);
	const requestRef = db.doc(`users/${uid}/commandRequests/${idempotencyKey}`);
	return db.runTransaction(async (tx) => {
		const prior = await tx.get(requestRef);
		if (prior.exists) return prior.get('result') as CommandResult;
		const result = await handler(uid, input, tx);
		tx.create(requestRef, { result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
		return result;
	});
}

function accountRef(uid: string, id: string): admin.firestore.DocumentReference {
	return db.doc(`users/${uid}/accounts/${id}`);
}

function transactionRef(uid: string, id: string): admin.firestore.DocumentReference {
	return db.doc(`users/${uid}/transactions/${id}`);
}

async function existingAccount(tx: admin.firestore.Transaction, uid: string, id: string) {
	const ref = accountRef(uid, id);
	const snapshot = await tx.get(ref);
	if (!snapshot.exists) throw new HttpsError('not-found', 'Account not found.');
	return { ref, snapshot };
}

export const createAccount = onCall(commandOptions, async (request) => execute(
	request, ['name', 'bank', 'type', 'currency', 'balance', 'creditLimit', 'color', 'icon'],
	async (uid, input, tx) => {
		const type = text(input, 'type', 20) as string;
		if (!['debit', 'credit', 'savings', 'cash'].includes(type)) throw new HttpsError('invalid-argument', 'type is invalid.');
		const currency = text(input, 'currency', 3, true) ?? 'ZAR';
		if (!/^[A-Z]{3}$/.test(currency)) throw new HttpsError('invalid-argument', 'currency is invalid.');
		const color = text(input, 'color', 7, true);
		if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new HttpsError('invalid-argument', 'color is invalid.');
		const ref = db.collection(`users/${uid}/accounts`).doc();
		const data: Input = {
			userId: uid, name: text(input, 'name', 120), type, currency,
			balance: money(input, 'balance'), createdAt: admin.firestore.FieldValue.serverTimestamp(),
		};
		for (const key of ['bank', 'icon'] as const) {
			const value = text(input, key, key === 'bank' ? 120 : 80, true);
			if (value) data[key] = value;
		}
		if (color) data.color = color;
		if (input.creditLimit !== undefined) {
			const creditLimit = money(input, 'creditLimit');
			if (creditLimit < 0) throw new HttpsError('invalid-argument', 'creditLimit is invalid.');
			data.creditLimit = creditLimit;
		}
		tx.create(ref, data);
		return { success: true, ids: [ref.id], balances: { [ref.id]: data.balance as number } };
	}
));

export const updateAccount = onCall(commandOptions, async (request) => execute(
	request, ['accountId', 'updates'], async (uid, input, tx) => {
		const accountId = text(input, 'accountId', 1500) as string;
		const updates = strictObject(input.updates, ['name', 'bank', 'type', 'currency', 'creditLimit', 'color', 'icon'], 'updates');
		const { ref } = await existingAccount(tx, uid, accountId);
		const data: Input = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
		if (updates.name !== undefined) data.name = text(updates, 'name', 120);
		if (updates.type !== undefined) {
			const type = text(updates, 'type', 20) as string;
			if (!['debit', 'credit', 'savings', 'cash'].includes(type)) throw new HttpsError('invalid-argument', 'type is invalid.');
			data.type = type;
		}
		for (const key of ['bank', 'icon'] as const) {
			if (key in updates) data[key] = updates[key] === null ? admin.firestore.FieldValue.delete() : text(updates, key, key === 'bank' ? 120 : 80, true);
		}
		if (updates.currency !== undefined) {
			const currency = text(updates, 'currency', 3) as string;
			if (!/^[A-Z]{3}$/.test(currency)) throw new HttpsError('invalid-argument', 'currency is invalid.');
			data.currency = currency;
		}
		if (updates.color !== undefined) {
			const color = text(updates, 'color', 7) as string;
			if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new HttpsError('invalid-argument', 'color is invalid.');
			data.color = color;
		}
		if (updates.creditLimit !== undefined) {
			const creditLimit = money(updates, 'creditLimit');
			if (creditLimit < 0) throw new HttpsError('invalid-argument', 'creditLimit is invalid.');
			data.creditLimit = creditLimit;
		}
		tx.update(ref, data);
		return { success: true, ids: [accountId] };
	}
));

export const deleteAccount = onCall(commandOptions, async (request) => execute(
	request, ['accountId'], async (uid, input, tx) => {
		const accountId = text(input, 'accountId', 1500) as string;
		const { ref } = await existingAccount(tx, uid, accountId);
		const linked = await tx.get(db.collection(`users/${uid}/transactions`).where('accountId', '==', accountId).limit(1));
		if (!linked.empty) throw new HttpsError('failed-precondition', 'Delete or move this account\'s transactions first.');
		tx.delete(ref);
		return { success: true, ids: [accountId] };
	}
));

function transactionData(uid: string, input: Input): Input {
	const type = text(input, 'type', 10) as string;
	if (!['income', 'expense'].includes(type)) throw new HttpsError('invalid-argument', 'type is invalid.');
	const data: Input = {
		userId: uid, accountId: text(input, 'accountId', 1500), title: text(input, 'title', 200),
		amount: money(input, 'amount', true), type, category: text(input, 'category', 80),
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	};
	for (const [key, max] of [['subcategory', 80], ['description', 2000], ['recurringTransactionId', 1500], ['recurringOccurrenceDate', 10]] as const) {
		const value = text(input, key, max, true);
		if (value) data[key] = value;
	}
	const date = timestamp(input, 'date');
	if (date) data.date = date;
	return data;
}

export const createTransaction = onCall(commandOptions, async (request) => execute(
	request, ['accountId', 'title', 'amount', 'type', 'category', 'subcategory', 'description', 'date', 'recurringTransactionId', 'recurringOccurrenceDate'],
	async (uid, input, tx) => {
		const data = transactionData(uid, input);
		const accountId = data.accountId as string;
		const { ref: account, snapshot } = await existingAccount(tx, uid, accountId);
		const ref = db.collection(`users/${uid}/transactions`).doc();
		const balance = Number(snapshot.get('balance')) + balanceDelta(data);
		tx.create(ref, data);
		tx.update(account, { balance, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		return { success: true, ids: [ref.id], balances: { [accountId]: balance } };
	}
));

export const updateTransaction = onCall(commandOptions, async (request) => execute(
	request, ['transactionId', 'updates'], async (uid, input, tx) => {
		const id = text(input, 'transactionId', 1500) as string;
		const updates = strictObject(input.updates, ['accountId', 'title', 'amount', 'type', 'category', 'subcategory', 'description', 'date'], 'updates');
		const ref = transactionRef(uid, id);
		const snapshot = await tx.get(ref);
		if (!snapshot.exists) throw new HttpsError('not-found', 'Transaction not found.');
		const oldData = snapshot.data() as Input;
		if (oldData.type === 'transfer') throw new HttpsError('failed-precondition', 'Transfers cannot be edited independently.');
		const merged = { ...oldData, ...updates };
		const validated = transactionData(uid, merged);
		const oldAccountId = oldData.accountId as string;
		const newAccountId = validated.accountId as string;
		const oldAccount = await existingAccount(tx, uid, oldAccountId);
		const newAccount = newAccountId === oldAccountId ? oldAccount : await existingAccount(tx, uid, newAccountId);
		const oldBalance = Number(oldAccount.snapshot.get('balance'));
		const oldDelta = balanceDelta(oldData);
		const newDelta = balanceDelta(validated);
		const data: Input = { ...validated, createdAt: oldData.createdAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
		for (const key of ['subcategory', 'description'] as const) if (updates[key] === null) data[key] = admin.firestore.FieldValue.delete();
		tx.update(ref, data);
		const balances: Record<string, number> = {};
		if (oldAccountId === newAccountId) {
			balances[oldAccountId] = oldBalance - oldDelta + newDelta;
			tx.update(oldAccount.ref, { balance: balances[oldAccountId], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		} else {
			balances[oldAccountId] = oldBalance - oldDelta;
			balances[newAccountId] = Number(newAccount.snapshot.get('balance')) + newDelta;
			tx.update(oldAccount.ref, { balance: balances[oldAccountId], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
			tx.update(newAccount.ref, { balance: balances[newAccountId], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		}
		return { success: true, ids: [id], balances };
	}
));

export const createTransfer = onCall(commandOptions, async (request) => execute(
	request, ['fromAccountId', 'toAccountId', 'amount', 'title', 'description', 'date'], async (uid, input, tx) => {
		const fromId = text(input, 'fromAccountId', 1500) as string;
		const toId = text(input, 'toAccountId', 1500) as string;
		if (fromId === toId) throw new HttpsError('invalid-argument', 'Transfer accounts must differ.');
		const [from, to] = await Promise.all([existingAccount(tx, uid, fromId), existingAccount(tx, uid, toId)]);
		const amount = money(input, 'amount', true);
		const outRef = db.collection(`users/${uid}/transactions`).doc();
		const inRef = db.collection(`users/${uid}/transactions`).doc();
		const transferId = outRef.id;
		const common: Input = {
			userId: uid, transferId, title: text(input, 'title', 200), amount, type: 'transfer', category: 'transfer',
			createdAt: admin.firestore.FieldValue.serverTimestamp(), date: timestamp(input, 'date') ?? admin.firestore.FieldValue.serverTimestamp(),
		};
		const description = text(input, 'description', 2000, true);
		if (description) common.description = description;
		tx.create(outRef, { ...common, accountId: fromId, transferAccountId: toId, transferDirection: 'out' });
		tx.create(inRef, { ...common, accountId: toId, transferAccountId: fromId, transferDirection: 'in' });
		const balances = { [fromId]: Number(from.snapshot.get('balance')) - amount, [toId]: Number(to.snapshot.get('balance')) + amount };
		tx.update(from.ref, { balance: balances[fromId], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		tx.update(to.ref, { balance: balances[toId], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		return { success: true, ids: [outRef.id, inRef.id], balances };
	}
));

export const deleteTransaction = onCall(commandOptions, async (request) => execute(
	request, ['transactionId'], async (uid, input, tx) => {
		const id = text(input, 'transactionId', 1500) as string;
		const ref = transactionRef(uid, id);
		const snapshot = await tx.get(ref);
		if (!snapshot.exists) throw new HttpsError('not-found', 'Transaction not found.');
		const data = snapshot.data() as admin.firestore.DocumentData;
		if (data.type === 'transfer') {
			const pair = await tx.get(db.collection(`users/${uid}/transactions`).where('transferId', '==', data.transferId));
			if (pair.size !== 2) throw new HttpsError('failed-precondition', 'Transfer pair is incomplete.');
			const outgoing = pair.docs.find((doc) => doc.get('transferDirection') === 'out');
			const incoming = pair.docs.find((doc) => doc.get('transferDirection') === 'in');
			if (!outgoing || !incoming) throw new HttpsError('failed-precondition', 'Transfer pair is invalid.');
			const from = await existingAccount(tx, uid, outgoing.get('accountId'));
			const to = await existingAccount(tx, uid, incoming.get('accountId'));
			const amount = Number(outgoing.get('amount'));
			const balances = { [from.ref.id]: Number(from.snapshot.get('balance')) + amount, [to.ref.id]: Number(to.snapshot.get('balance')) - amount };
			pair.docs.forEach((doc) => tx.delete(doc.ref));
			tx.update(from.ref, { balance: balances[from.ref.id] });
			tx.update(to.ref, { balance: balances[to.ref.id] });
			return { success: true, ids: pair.docs.map((doc) => doc.id), balances };
		}
		const account = await existingAccount(tx, uid, data.accountId);
		const balance = Number(account.snapshot.get('balance')) - balanceDelta(data);
		tx.delete(ref);
		tx.update(account.ref, { balance, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		return { success: true, ids: [id], balances: { [account.ref.id]: balance } };
	}
));

export const reconcileAccount = onCall(commandOptions, async (request) => execute(
	request, ['accountId', 'balanceDelta', 'targetBalance', 'title', 'category', 'date'], async (uid, input, tx) => {
		const id = text(input, 'accountId', 1500) as string;
		const account = await existingAccount(tx, uid, id);
		const current = Number(account.snapshot.get('balance'));
		const target = input.targetBalance !== undefined ? money(input, 'targetBalance') : current + money(input, 'balanceDelta');
		const delta = target - current;
		if (Math.abs(delta) < 0.001) return { success: true, balances: { [id]: current } };
		const ref = db.collection(`users/${uid}/transactions`).doc();
		const data: Input = {
			userId: uid, accountId: id, title: text(input, 'title', 200, true) ?? 'Reconciliation Adjustment',
			amount: Math.abs(delta), type: delta > 0 ? 'income' : 'expense', category: text(input, 'category', 80, true) ?? 'other',
			createdAt: admin.firestore.FieldValue.serverTimestamp(), date: timestamp(input, 'date') ?? admin.firestore.FieldValue.serverTimestamp(),
		};
		tx.create(ref, data);
		tx.update(account.ref, { balance: target, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		return { success: true, ids: [ref.id], balances: { [id]: target } };
	}
));

export const bulkUpdateTransactionCategories = onCall(commandOptions, async (request) => execute(
	request, ['transactionIds', 'category', 'subcategory'], async (uid, input, tx) => {
		if (!Array.isArray(input.transactionIds) || input.transactionIds.length < 1 || input.transactionIds.length > 400) {
			throw new HttpsError('invalid-argument', 'transactionIds must contain 1 to 400 IDs.');
		}
		const ids = Array.from(new Set(input.transactionIds.map((id) => {
			if (typeof id !== 'string' || !id || id.length > 1500) throw new HttpsError('invalid-argument', 'transactionIds is invalid.');
			return id;
		})));
		const refs = ids.map((id) => transactionRef(uid, id));
		const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
		if (snapshots.some((snapshot) => !snapshot.exists)) throw new HttpsError('not-found', 'Transaction not found.');
		const category = text(input, 'category', 80) as string;
		const subcategory = input.subcategory === null ? admin.firestore.FieldValue.delete() : text(input, 'subcategory', 80, true) ?? admin.firestore.FieldValue.delete();
		refs.forEach((ref) => tx.update(ref, { category, subcategory, updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
		return { success: true, ids };
	}
));

export const deleteAllTransactions = onCall(commandOptions, async (request) => execute(
	request, [], async (uid, _input, tx) => {
		const transactionSnapshot = await tx.get(db.collection(`users/${uid}/transactions`).limit(401));
		const accountSnapshot = await tx.get(db.collection(`users/${uid}/accounts`));
		if (transactionSnapshot.size > 400) throw new HttpsError('resource-exhausted', 'Too many transactions for one deletion. Export and delete in smaller groups.');
		transactionSnapshot.docs.forEach((doc) => tx.delete(doc.ref));
		accountSnapshot.docs.forEach((doc) => tx.update(doc.ref, { balance: 0, updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
		return { success: true, ids: transactionSnapshot.docs.map((doc) => doc.id) };
	}
));
