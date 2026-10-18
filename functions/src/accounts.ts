import * as functions from 'firebase-functions';
import { db } from './firebase';
import { getRequestId, requirePostUser, setCorsHeaders } from './http';

const usersRef = (uid: string) => db.collection('users').doc(uid);
const accountsRef = (uid: string) => usersRef(uid).collection('accounts');
const transactionsRef = (uid: string) => usersRef(uid).collection('transactions');
const resetJobRef = (uid: string) =>
	usersRef(uid).collection('ledgerMaintenance').doc('transactionReset');

interface DeleteAccountBody {
	id?: unknown;
}

const requiredId = (value: unknown): string => {
	if (typeof value !== 'string' || !value.trim() || value.length > 1500) {
		throw new Error('Account ID is required.');
	}
	return value.trim();
};

export const deleteAccount = functions.https.onRequest(async (req, res) => {
	const requestId = getRequestId(req);
	const decoded = await requirePostUser(req, res, requestId);
	if (!decoded) return;

	try {
		const body = (req.body || {}) as DeleteAccountBody;
		const accountId = requiredId(body.id);
		const accountRef = accountsRef(decoded.uid).doc(accountId);

		await db.runTransaction(async (transaction) => {
			const accountSnapshot = await transaction.get(accountRef);
			const resetSnapshot = await transaction.get(resetJobRef(decoded.uid));
			const transactionSnapshot = await transaction.get(
				transactionsRef(decoded.uid).where('accountId', '==', accountId).limit(1)
			);
			if (!accountSnapshot.exists) throw new Error('Account not found.');
			const resetJob = resetSnapshot.data() as { status?: string } | undefined;
			if (resetJob?.status === 'running') {
				throw new Error('Accounts are temporarily locked while the ledger is being reset.');
			}
			if (!transactionSnapshot.empty) {
				throw new Error('This account has transaction history and cannot be deleted.');
			}
			transaction.delete(accountRef);
		});

		setCorsHeaders(res);
		res.status(200).json({ success: true, data: null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Account deletion failed.';
		console.error('Account deletion failed:', { requestId, error });
		setCorsHeaders(res);
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
