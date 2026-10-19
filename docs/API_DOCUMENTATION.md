# API Documentation

This document describes the Firebase Cloud Functions endpoints used by Cash Flow.

## Base URL

Production fallback used by the browser client:

```text
https://us-central1-cash-flow-eb5bd.cloudfunctions.net
```

Override with `VITE_API_BASE_URL` when targeting another Firebase project or a local emulator.

## Authentication

Protected endpoints require a Firebase ID token:

```http
Authorization: Bearer <firebase_id_token>
```

Client code can get a token from Firebase Auth:

```typescript
import { getIdToken } from 'firebase/auth';
import { auth } from './services/firebase';

const token = await getIdToken(auth.currentUser, true);
```

## Response Shapes

Successful data responses use:

```typescript
interface ApiResponse<T> {
	success: true;
	data?: T;
	message?: string;
}
```

Structured API errors use:

```typescript
interface ErrorPayload {
	success: false;
	error: string;
	code: string;
	details: string;
	retryable: boolean;
	requestId: string;
}
```

`getUserTransactions` still returns a simpler legacy error shape for auth/internal failures:

```json
{
	"success": false,
	"error": "Invalid or expired token"
}
```

## Endpoints

### GET `/healthCheck`

Checks whether the default Functions API is running.

**Authentication:** none

**Response:**

```json
{
	"success": true,
	"message": "API is running",
	"timestamp": "2026-08-28T10:30:00.000Z"
}
```

**Status codes:**

- `200` - API is running

### GET `/getUserTransactions`

Returns the authenticated user's transactions from `users/{uid}/transactions`, ordered by `date` descending. With no query parameters it preserves the complete-result response used by existing callers. Add `limit` and/or an opaque `cursor` query parameter for bounded pages; paged responses include `nextCursor` when another page is available.

**Authentication:** required

**Request:**

```http
GET /getUserTransactions
Authorization: Bearer <firebase_id_token>
```

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": "transaction_id",
			"userId": "user_uid",
			"accountId": "account_id",
			"title": "Grocery shopping",
			"amount": 100.5,
			"type": "expense",
			"category": "food",
			"subcategory": "groceries",
			"description": "Weekly groceries",
			"date": "2026-08-28T00:00:00.000Z",
			"createdAt": "2026-08-28T10:30:00.000Z"
		}
	],
	"message": "Successfully retrieved 1 transactions"
}
```

Transfer records may also include `transferAccountId`. The desktop app primarily reads transactions directly from Firestore; this endpoint exists for API consumers and compatibility.

**Status codes:**

- `200` - Success
- `401` - Missing, invalid, or expired token
- `405` - Method not allowed
- `500` - Internal server error

Paged example:

```http
GET /getUserTransactions?limit=100&cursor=<opaque_cursor>
Authorization: Bearer <firebase_id_token>
```

### POST `/deleteAllTransactions`

Starts or resumes the authenticated user's transaction reset job. The job deletes transaction documents in bounded batches and resets account balances only after the transaction collection is empty. While the job is running, server-owned ledger writes are rejected.

**Authentication:** required

**Response:** a `TransactionResetJob` object containing `status`, `phase`, `deletedTransactions`, `resetAccounts`, timestamps, and an optional `error`.

Retries are safe: an errored or stale job can be resumed, while a completed job is returned without repeating the reset.

### POST `/deleteAllTransactionsStatus`

Returns the current transaction reset job for the authenticated user. The browser client uses this endpoint to show progress and recoverable errors.

### POST `/deleteAccount`

Deletes an account only when it belongs to the authenticated user and has no transaction history. Accounts referenced by ordinary or transfer transactions are rejected so their history cannot be orphaned. Direct browser deletes are denied by Firestore rules.

**Request:**

```json
{ "accountId": "account_id" }
```

### POST `/createBudget`

Creates a budget through one server-side Firestore transaction. The transaction atomically checks ownership, the eight-budget limit, and duplicate scope (`accountId`, category, optional subcategory, period, and cycle) before creating the record.

**Request:** the validated budget fields used by the desktop budget form.

## Data Models

### Transaction

```typescript
interface Transaction {
	id?: string;
	userId?: string;
	accountId: string;
	title: string;
	amount: number;
	type: 'income' | 'expense' | 'transfer';
	category: string;
	subcategory?: string;
	description?: string;
	date?: string;
	createdAt?: string;
	updatedAt?: string;
	transferAccountId?: string;
	transferId?: string;
	transferDirection?: 'out' | 'in';
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}
```

### Account

```typescript
interface Account {
	id: string;
	name: string;
	type: string;
	balance: number;
	creditLimit?: number;
	currency: string;
}
```

## CORS

Functions set permissive CORS headers for browser access:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Testing With cURL

Health check:

```bash
curl -X GET https://us-central1-cash-flow-eb5bd.cloudfunctions.net/healthCheck
```

Transactions:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  https://us-central1-cash-flow-eb5bd.cloudfunctions.net/getUserTransactions
```

## Monitoring

Use Firebase tools for production status and logs:

```bash
firebase functions:list
firebase functions:log
```

## Future Enhancements

- Add rate limiting around authenticated API calls.
- Split `functions/src/index.ts` into smaller request, auth, and analytics helper modules when needed.
- Consider dedicated analytics endpoints only if the frontend needs server-side aggregation.
