import * as functions from 'firebase-functions';
import { randomUUID } from 'crypto';
import { db, FieldValue, Timestamp } from './firebase';
import { getRequestId, requirePostUser, sendError, setCorsHeaders } from './http';

type TransactionType = 'income' | 'expense' | 'transfer';
type OrdinaryTransactionType = 'income' | 'expense';

interface TransactionData {
	userId: string;
	accountId: string;
	transferAccountId?: string;
	transferId?: string;
	transferDirection?: 'out' | 'in';
	amount: number;
	title: string;
	category: string;
	subcategory?: string;
	description?: string;
	type: TransactionType;
	date?: FirebaseFirestore.Timestamp;
	createdAt: FirebaseFirestore.Timestamp;
	updatedAt?: FirebaseFirestore.Timestamp;
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}

interface AddTransactionBody {
	type?: OrdinaryTransactionType;
	accountId?: string;
	title?: string;
	category?: string;
	subcategory?: string;
	description?: string;
	amount?: number;
	date?: string;
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}

interface AddTransferBody {
	fromAccountId?: string;
	toAccountId?: string;
	amount?: number;
	title?: string;
	description?: string;
	date?: string;
}

interface UpdateTransactionBody extends Partial<AddTransactionBody> {
	id?: string;
}

interface DeleteTransactionBody {
	id?: string;
}

const MAX_MONEY = 1_000_000_000_000;
const TEXT_LIMITS = {
	documentId: 1500,
	title: 200,
	category: 80,
	subcategory: 80,
	description: 2000,
};

const usersRef = (uid: string) => db.collection('users').doc(uid);
const accountsRef = (uid: string) => usersRef(uid).collection('accounts');
const transactionsRef = (uid: string) => usersRef(uid).collection('transactions');
const resetJobRef = (uid: string) =>
	usersRef(uid).collection('ledgerMaintenance').doc('transactionReset');
const RESET_BATCH_SIZE = 400;
const RESET_WORKER_TIMEOUT_MS = 5 * 60 * 1000;

type ResetPhase = 'transactions' | 'accounts';
type ResetStatus = 'running' | 'completed' | 'error';

export interface TransactionResetJob {
	status: ResetStatus;
	phase: ResetPhase;
	deletedTransactions: number;
	resetAccounts: number;
	lastTransactionId?: string;
	lastAccountId?: string;
	updatedAt: FirebaseFirestore.Timestamp;
	error?: string;
}

const readResetJob = async (uid: string): Promise<TransactionResetJob | null> => {
	const snapshot = await resetJobRef(uid).get();
	return snapshot.exists ? (snapshot.data() as TransactionResetJob) : null;
};

async function assertLedgerWritable(
	transaction: FirebaseFirestore.Transaction,
	userId: string
): Promise<void> {
	const resetSnapshot = await transaction.get(resetJobRef(userId));
	const resetJob = resetSnapshot.data() as Partial<TransactionResetJob> | undefined;
	if (resetJob?.status === 'running') {
		throw new Error('Transactions are temporarily locked while the ledger is being reset.');
	}
}

function requiredText(value: unknown, field: string, maxLength: number): string {
	if (typeof value !== 'string') throw new Error(`${field} is required.`);
	const normalized = value.trim();
	if (!normalized) throw new Error(`${field} is required.`);
	if (normalized.length > maxLength) throw new Error(`${field} is too long.`);
	return normalized;
}

function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${field} is invalid.`);
	const normalized = value.trim();
	if (!normalized) return undefined;
	if (normalized.length > maxLength) throw new Error(`${field} is too long.`);
	return normalized;
}

function positiveMoney(value: unknown, field = 'Amount'): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_MONEY) {
		throw new Error(`${field} must be greater than zero.`);
	}
	return value;
}

function optionalDate(value: unknown): FirebaseFirestore.Timestamp | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') throw new Error('Date is invalid.');
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error('Date is invalid.');
	return Timestamp.fromDate(date);
}

function ordinaryDelta(type: OrdinaryTransactionType, amount: number): number {
	return type === 'income' ? amount : -amount;
}

function normalizeAddTransaction(body: AddTransactionBody): Required<Pick<AddTransactionBody, 'type' | 'accountId' | 'title' | 'category' | 'amount'>> &
	Pick<AddTransactionBody, 'subcategory' | 'description' | 'recurringTransactionId' | 'recurringOccurrenceDate'> & { date?: FirebaseFirestore.Timestamp } {
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

function normalizeTransfer(body: AddTransferBody) {
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

function sendLedgerError(
	res: functions.Response<unknown>,
	status: number,
	error: unknown,
	requestId: string
): void {
	const message = error instanceof Error ? error.message : 'Ledger operation failed.';
	sendError(res, status, {
		error: message,
		code: status === 400 ? 'LEDGER_INPUT_INVALID' : 'LEDGER_OPERATION_FAILED',
		details: message,
		retryable: false,
		requestId,
	});
}

async function assertAccountExists(
	transaction: FirebaseFirestore.Transaction,
	userId: string,
	accountId: string
): Promise<FirebaseFirestore.DocumentReference> {
	const accountRef = accountsRef(userId).doc(accountId);
	const accountSnap = await transaction.get(accountRef);
	if (!accountSnap.exists) {
		throw new Error('Selected account could not be found.');
	}
	return accountRef;
}

function dataFromTransactionSnap(
	snapshot: FirebaseFirestore.DocumentSnapshot
): TransactionData {
	const data = snapshot.data() as Partial<TransactionData> | undefined;
	if (!snapshot.exists || !data) throw new Error('Transaction not found.');
	if (!data.accountId || !data.type || typeof data.amount !== 'number') {
		throw new Error('Existing transaction is invalid.');
	}
	return data as TransactionData;
}

export async function addLedgerTransaction(uid: string, body: AddTransactionBody): Promise<string> {
	const input = normalizeAddTransaction(body);
	const transactionId = transactionsRef(uid).doc().id;
	await db.runTransaction(async (transaction) => {
		await assertLedgerWritable(transaction, uid);
		const accountRef = await assertAccountExists(transaction, uid, input.accountId);
		const txRef = transactionsRef(uid).doc(transactionId);
		const now = Timestamp.now();
		transaction.set(txRef, {
			userId: uid,
			accountId: input.accountId,
			title: input.title,
			amount: input.amount,
			type: input.type,
			category: input.category,
			...(input.subcategory ? { subcategory: input.subcategory } : {}),
			...(input.description ? { description: input.description } : {}),
			...(input.date ? { date: input.date } : {}),
			...(input.recurringTransactionId ? { recurringTransactionId: input.recurringTransactionId } : {}),
			...(input.recurringOccurrenceDate ? { recurringOccurrenceDate: input.recurringOccurrenceDate } : {}),
			createdAt: now,
		});
		transaction.update(accountRef, { balance: FieldValue.increment(ordinaryDelta(input.type, input.amount)) });
	});
	return transactionId;
}

export async function addLedgerTransfer(uid: string, body: AddTransferBody): Promise<string> {
	const input = normalizeTransfer(body);
	const outgoingId = transactionsRef(uid).doc().id;
	const incomingId = transactionsRef(uid).doc().id;
	await db.runTransaction(async (transaction) => {
		await assertLedgerWritable(transaction, uid);
		const fromRef = await assertAccountExists(transaction, uid, input.fromAccountId);
		const toRef = await assertAccountExists(transaction, uid, input.toAccountId);
		const now = Timestamp.now();
		const txDate = input.date ?? now;
		const shared = {
			userId: uid,
			transferId: outgoingId,
			title: input.title,
			amount: input.amount,
			type: 'transfer',
			category: 'transfer',
			...(input.description ? { description: input.description } : {}),
			date: txDate,
			createdAt: now,
		};
		transaction.set(transactionsRef(uid).doc(outgoingId), {
			...shared,
			accountId: input.fromAccountId,
			transferAccountId: input.toAccountId,
			transferDirection: 'out',
		});
		transaction.set(transactionsRef(uid).doc(incomingId), {
			...shared,
			accountId: input.toAccountId,
			transferAccountId: input.fromAccountId,
			transferDirection: 'in',
		});
		transaction.update(fromRef, { balance: FieldValue.increment(-input.amount) });
		transaction.update(toRef, { balance: FieldValue.increment(input.amount) });
	});
	return outgoingId;
}

export async function updateLedgerTransaction(uid: string, body: UpdateTransactionBody): Promise<void> {
	const transactionId = requiredText(body.id, 'Transaction ID', TEXT_LIMITS.documentId);
	await db.runTransaction(async (transaction) => {
		await assertLedgerWritable(transaction, uid);
		const txRef = transactionsRef(uid).doc(transactionId);
		const old = dataFromTransactionSnap(await transaction.get(txRef));
		if (old.type === 'transfer' || (body as { type?: string }).type === 'transfer') {
			throw new Error('Transfers cannot be edited. Delete and recreate the transfer instead.');
		}
		const nextType = body.type ?? old.type;
		if (nextType !== 'income' && nextType !== 'expense') {
			throw new Error('Transaction type must be income or expense.');
		}

		const updates: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
			updatedAt: Timestamp.now(),
		};
		if (body.title !== undefined) updates.title = requiredText(body.title, 'Title', TEXT_LIMITS.title);
		if (body.amount !== undefined) updates.amount = positiveMoney(body.amount);
		if (body.type !== undefined) updates.type = body.type;
		if (body.accountId !== undefined) updates.accountId = requiredText(body.accountId, 'Account', TEXT_LIMITS.documentId);
		if (body.category !== undefined) updates.category = requiredText(body.category, 'Category', TEXT_LIMITS.category);
		if (Object.prototype.hasOwnProperty.call(body, 'subcategory')) {
			updates.subcategory = optionalText(body.subcategory, 'Subcategory', TEXT_LIMITS.subcategory) ?? FieldValue.delete();
		}
		if (Object.prototype.hasOwnProperty.call(body, 'description')) {
			updates.description = optionalText(body.description, 'Description', TEXT_LIMITS.description) ?? FieldValue.delete();
		}
		if (body.date !== undefined) {
			updates.date = optionalDate(body.date) ?? FieldValue.delete();
		}

		const oldAccountId = old.accountId;
		const newAccountId = typeof updates.accountId === 'string' ? updates.accountId : oldAccountId;
		const oldAmount = positiveMoney(old.amount, 'Existing amount');
		const newAmount = typeof updates.amount === 'number' ? updates.amount : oldAmount;
		const oldType = old.type as OrdinaryTransactionType;
		const newType = (typeof updates.type === 'string' ? updates.type : oldType) as OrdinaryTransactionType;
		const oldDelta = ordinaryDelta(oldType, oldAmount);
		const newDelta = ordinaryDelta(newType, newAmount);

		if (oldAccountId !== newAccountId) {
			const oldAccountRef = await assertAccountExists(transaction, uid, oldAccountId);
			const newAccountRef = await assertAccountExists(transaction, uid, newAccountId);
			transaction.update(oldAccountRef, { balance: FieldValue.increment(-oldDelta) });
			transaction.update(newAccountRef, { balance: FieldValue.increment(newDelta) });
		} else {
			const balanceChange = newDelta - oldDelta;
			if (balanceChange !== 0) {
				const accountRef = await assertAccountExists(transaction, uid, oldAccountId);
				transaction.update(accountRef, { balance: FieldValue.increment(balanceChange) });
			}
		}
		transaction.update(txRef, updates);
	});
}

export async function deleteLedgerTransaction(uid: string, body: DeleteTransactionBody): Promise<void> {
	const transactionId = requiredText(body.id, 'Transaction ID', TEXT_LIMITS.documentId);
	await db.runTransaction(async (transaction) => {
		await assertLedgerWritable(transaction, uid);
		const txRef = transactionsRef(uid).doc(transactionId);
		const tx = dataFromTransactionSnap(await transaction.get(txRef));
		if (tx.type === 'transfer') {
			if (!tx.transferId || !tx.transferDirection || !tx.transferAccountId) {
				throw new Error('This legacy transfer cannot be deleted safely. Reconcile the accounts instead.');
			}
			const partnerQuery = await transaction.get(
				transactionsRef(uid).where('transferId', '==', tx.transferId)
			);
			const transferDocs = partnerQuery.docs;
			if (transferDocs.length !== 2) {
				throw new Error('Paired transfer transaction could not be found.');
			}
			const outgoingDoc = transferDocs.find((doc) => doc.data().transferDirection === 'out');
			const incomingDoc = transferDocs.find((doc) => doc.data().transferDirection === 'in');
			if (!outgoingDoc || !incomingDoc) {
				throw new Error('Paired transfer transaction could not be found.');
			}
			const outgoing = outgoingDoc.data() as TransactionData;
			const incoming = incomingDoc.data() as TransactionData;
			const outgoingAccountRef = await assertAccountExists(transaction, uid, outgoing.accountId);
			const incomingAccountRef = await assertAccountExists(transaction, uid, incoming.accountId);
			transaction.update(outgoingAccountRef, { balance: FieldValue.increment(outgoing.amount) });
			transaction.update(incomingAccountRef, { balance: FieldValue.increment(-incoming.amount) });
			transaction.delete(outgoingDoc.ref);
			transaction.delete(incomingDoc.ref);
			return;
		}

		const accountRef = await assertAccountExists(transaction, uid, tx.accountId);
		const delta = tx.type === 'income' ? -tx.amount : tx.amount;
		transaction.update(accountRef, { balance: FieldValue.increment(delta) });
		transaction.delete(txRef);
	});
}

async function claimResetWorker(uid: string): Promise<
	{ job: TransactionResetJob; claimed: boolean }
> {
	const now = Date.now();
	let job!: TransactionResetJob;
	let claimed = false;
	await db.runTransaction(async (transaction) => {
		const ref = resetJobRef(uid);
		const snapshot = await transaction.get(ref);
		const current = snapshot.data() as (TransactionResetJob & {
			workerId?: string;
			workerUntil?: FirebaseFirestore.Timestamp;
		}) | undefined;
		const workerUntil = current?.workerUntil?.toMillis() ?? 0;

		if (current?.status === 'completed') {
			job = current;
			return;
		}
		if (current?.status === 'running' && workerUntil > now) {
			job = current;
			return;
		}

		job = {
			status: 'running',
			phase: current?.phase ?? 'transactions',
			deletedTransactions: current?.deletedTransactions ?? 0,
			resetAccounts: current?.resetAccounts ?? 0,
			...(current?.lastTransactionId ? { lastTransactionId: current.lastTransactionId } : {}),
			...(current?.lastAccountId ? { lastAccountId: current.lastAccountId } : {}),
			updatedAt: Timestamp.now(),
		};
		transaction.set(ref, {
			...job,
			workerId: randomUUID(),
			workerUntil: Timestamp.fromMillis(now + RESET_WORKER_TIMEOUT_MS),
			error: FieldValue.delete(),
		});
		claimed = true;
	});
	return { job, claimed };
}

async function updateResetJob(
	uid: string,
	updates: Record<string, unknown>
): Promise<void> {
	await resetJobRef(uid).update({ ...updates, updatedAt: Timestamp.now() });
}

export async function deleteAllLedgerTransactions(uid: string): Promise<TransactionResetJob> {
	const { job, claimed } = await claimResetWorker(uid);
	if (!claimed) return job;

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
					lastTransactionId: FieldValue.delete(),
				});
				current = { ...current, phase: 'accounts' };
				continue;
			}

			const batch = db.batch();
			snapshot.docs.forEach((transactionDoc) => batch.delete(transactionDoc.ref));
			await batch.commit();
			const lastTransactionId = snapshot.docs[snapshot.docs.length - 1].id;
			current = {
				...current,
				lastTransactionId,
				deletedTransactions: current.deletedTransactions + snapshot.size,
			};
			await updateResetJob(uid, {
				lastTransactionId,
				deletedTransactions: current.deletedTransactions,
				workerUntil: Timestamp.fromMillis(Date.now() + RESET_WORKER_TIMEOUT_MS),
			});
		}

		while (current.phase === 'accounts') {
			let query = accountsRef(uid).orderBy('__name__').limit(RESET_BATCH_SIZE);
			if (current.lastAccountId) query = query.startAfter(current.lastAccountId);
			const snapshot = await query.get();
			if (snapshot.empty) {
				current = { ...current, status: 'completed' };
				await updateResetJob(uid, {
					status: 'completed',
					workerId: FieldValue.delete(),
					workerUntil: FieldValue.delete(),
					lastAccountId: FieldValue.delete(),
				});
				return current;
			}

			const batch = db.batch();
			snapshot.docs.forEach((accountDoc) =>
				batch.update(accountDoc.ref, { balance: 0, updatedAt: Timestamp.now() })
			);
			await batch.commit();
			const lastAccountId = snapshot.docs[snapshot.docs.length - 1].id;
			current = {
				...current,
				lastAccountId,
				resetAccounts: current.resetAccounts + snapshot.size,
			};
			await updateResetJob(uid, {
				lastAccountId,
				resetAccounts: current.resetAccounts,
				workerUntil: Timestamp.fromMillis(Date.now() + RESET_WORKER_TIMEOUT_MS),
			});
		}
		return current;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Ledger reset failed.';
		await updateResetJob(uid, {
			status: 'error',
			error: message,
			workerId: FieldValue.delete(),
			workerUntil: FieldValue.delete(),
		});
		throw error;
	}
}

export async function getDeleteAllTransactionsStatus(uid: string): Promise<TransactionResetJob | null> {
	return readResetJob(uid);
}

function ledgerEndpoint(
	operation: (uid: string, body: Record<string, unknown>) => Promise<unknown>
) {
	return functions.https.onRequest(async (req, res) => {
		const requestId = getRequestId(req);
		const decoded = await requirePostUser(req, res, requestId);
		if (!decoded) return;
		try {
			const data = await operation(decoded.uid, (req.body || {}) as Record<string, unknown>);
			setCorsHeaders(res);
			res.status(200).json({ success: true, data });
		} catch (error) {
			console.error('Ledger endpoint failed:', { requestId, error });
			sendLedgerError(res, error instanceof Error ? 400 : 500, error, requestId);
		}
	});
}

export const addTransaction = ledgerEndpoint(async (uid, body) => ({
	id: await addLedgerTransaction(uid, body as AddTransactionBody),
}));

export const addTransfer = ledgerEndpoint(async (uid, body) => ({
	id: await addLedgerTransfer(uid, body as AddTransferBody),
}));

export const updateTransaction = ledgerEndpoint(async (uid, body) => {
	await updateLedgerTransaction(uid, body as UpdateTransactionBody);
	return null;
});

export const deleteTransaction = ledgerEndpoint(async (uid, body) => {
	await deleteLedgerTransaction(uid, body as DeleteTransactionBody);
	return null;
});

export const deleteAllTransactions = ledgerEndpoint(async (uid) => {
	return deleteAllLedgerTransactions(uid);
});

export const deleteAllTransactionsStatus = functions.https.onRequest(async (req, res) => {
	const requestId = getRequestId(req);
	const decoded = await requirePostUser(req, res, requestId);
	if (!decoded) return;
	try {
		const job = await getDeleteAllTransactionsStatus(decoded.uid);
		setCorsHeaders(res);
		res.status(200).json({ success: true, data: job });
	} catch (error) {
		console.error('Ledger reset status failed:', { requestId, error });
		sendLedgerError(res, 500, error, requestId);
	}
});
