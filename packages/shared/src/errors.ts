export interface AppErrorOptions {
	operation: string;
	fallback?: string;
}

interface ErrorLike {
	code?: unknown;
	message?: unknown;
	name?: unknown;
}

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
	'auth/email-already-in-use': 'That email address already has an account. Sign in instead or use a different email.',
	'auth/invalid-credential': 'The email or password is incorrect. Check both fields and try again.',
	'auth/invalid-email': 'The email address is not valid. Check its format and try again.',
	'auth/network-request-failed': 'Authentication could not reach Firebase. Check your connection and try again.',
	'auth/popup-blocked': 'The browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
	'auth/popup-closed-by-user': 'Google sign-in was cancelled before it completed. Open it again when ready.',
	'auth/too-many-requests': 'Firebase temporarily blocked sign-in after repeated attempts. Wait a few minutes before trying again.',
	'auth/user-disabled': 'This account has been disabled. Contact the app administrator for access.',
	'auth/weak-password': 'The password is too weak. Use at least six characters and avoid an easily guessed password.',
	'aborted': 'The database changed while this operation was running. Retry once to apply it to the latest data.',
	'already-exists': 'That record already exists. Refresh the page and edit the existing item instead.',
	'failed-precondition': 'The request could not be completed because required data is missing or out of date. Refresh and try again.',
	'not-found': 'The requested record no longer exists. Refresh the page to load the latest data.',
	'permission-denied': 'Firebase denied this operation. Sign in again; if it continues, verify the Firestore security rules for this account.',
	'resource-exhausted': 'The Firebase quota or request limit was reached. Wait briefly and try again.',
	'unauthenticated': 'Your session is no longer valid. Sign in again before retrying.',
	'unavailable': 'Firebase is temporarily unavailable. Check your connection and retry in a moment.',
};

const normalizeCode = (code: unknown): string =>
	typeof code === 'string' ? code.replace(/^firestore\//, '') : '';

export const getAppErrorMessage = (
	error: unknown,
	{ operation, fallback }: AppErrorOptions
): string => {
	const candidate = error && typeof error === 'object' ? (error as ErrorLike) : undefined;
	const code = normalizeCode(candidate?.code);
	if (code && FIREBASE_ERROR_MESSAGES[code]) return FIREBASE_ERROR_MESSAGES[code];

	if (error instanceof TypeError && /fetch|network|load/i.test(error.message)) {
		return `${operation} could not reach the server. Check your connection, then retry.`;
	}

	const message = typeof candidate?.message === 'string' ? candidate.message.trim() : '';
	if (message && !/^(something went wrong|failed|error|unknown error)$/i.test(message)) {
		return message;
	}

	return fallback ?? `${operation} failed for an unknown reason. Retry once; if it continues, refresh the page and sign in again.`;
};
