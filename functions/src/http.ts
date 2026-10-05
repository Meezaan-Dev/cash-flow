import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';

export interface ErrorPayload {
	success: false;
	error: string;
	code: string;
	details: string;
	retryable: boolean;
	requestId: string;
}

export async function verifyToken(authHeader: string): Promise<admin.auth.DecodedIdToken> {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header');
	}
	try {
		return await admin.auth().verifyIdToken(authHeader.slice('Bearer '.length));
	} catch {
		throw new Error('Invalid or expired token');
	}
}

export function setCorsHeaders(res: functions.Response<unknown>): void {
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.set('Access-Control-Max-Age', '3600');
}

export function sendError(
	res: functions.Response<unknown>,
	status: number,
	payload: Omit<ErrorPayload, 'success'>
): void {
	res.status(status).json({ success: false, ...payload });
}

export function getRequestId(req: functions.Request): string {
	return req.get('function-execution-id') || randomUUID();
}

export async function requirePostUser(
	req: functions.Request,
	res: functions.Response<unknown>,
	requestId: string
): Promise<admin.auth.DecodedIdToken | null> {
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
	} catch {
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
