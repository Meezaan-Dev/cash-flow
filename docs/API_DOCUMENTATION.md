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

Returns the authenticated user's transactions from `users/{uid}/transactions`, ordered by `date` descending.

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

### POST `/askAI`

Generates a concise answer from the authenticated user's account and transaction data.

**Authentication:** required

**Request:**

```http
POST /askAI
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

```json
{
	"question": "How much did I spend this month?",
	"userId": "user_uid",
	"history": [
		{ "role": "user", "content": "Focus on my main account." },
		{ "role": "assistant", "content": "Sure, I will focus there." }
	]
}
```

**Response:**

```json
{
	"success": true,
	"answer": "You spent R2,350.00 this month across 12 expenses..."
}
```

**Status codes:**

- `200` - Success
- `400` - Missing/invalid question, user id, or history
- `401` - Missing/invalid Firebase token
- `403` - Authenticated token user does not match `userId`
- `405` - Method not allowed
- `429` - Gemini rate or quota limit reached
- `502` - Gemini did not return a usable answer
- `503` - Gemini configuration, auth, or availability problem

**Important behavior:**

- `question` is required and limited to 2000 characters.
- `history` is optional and limited to 12 user/assistant messages of 2000 characters each.
- The function verifies the Firebase token before loading data.
- The function rejects requests where the token uid does not match `userId`.
- The prompt includes up to 2000 user transactions and all user accounts.
- Monthly calculations are instructed to use `date` and fall back to `createdAt`.
- Transfers are excluded from income/expense totals unless the user asks about transfers.
- The model is `gemini-2.5-flash`.
- The function requires `GEMINI_API_KEY` in Firebase Secret Manager or local Functions secrets.

**Example structured error:**

```json
{
	"success": false,
	"error": "Gemini rejected the request because its rate or quota limit was reached.",
	"code": "GEMINI_RATE_LIMITED",
	"details": "Wait 30-60 seconds before retrying. If it continues, review the Gemini API project quota and billing status.",
	"retryable": true,
	"requestId": "request-reference"
}
```

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

AI assistant:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize this month","userId":"YOUR_UID","history":[]}' \
  https://us-central1-cash-flow-eb5bd.cloudfunctions.net/askAI
```

## Monitoring

Use Firebase tools for production status and logs:

```bash
firebase functions:list
firebase functions:log
firebase functions:log --only askAI
```

## Future Enhancements

- Add rate limiting around authenticated API calls.
- Split `functions/src/index.ts` into smaller request, auth, analytics, and AI helper modules.
- Consider dedicated analytics endpoints only if the frontend needs server-side aggregation.
