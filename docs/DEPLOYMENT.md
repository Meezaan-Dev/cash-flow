# Deployment Guide

Cash Flow has one production SPA and a small Firebase backend surface.

- The SPA is built from `apps/desktop` and emitted to root `dist/`.
- Vercel hosts the SPA and rewrites dashboard/mobile routes back to `/`.
- Firebase hosts Firestore data, Firestore security rules, and Cloud Functions.
- `apps/mobisite` is imported into the desktop host router; it is not deployed as a separate site.

## SPA Deployment

Production is same-domain with one Vite build:

```bash
npm run build
```

`vercel.json` rewrites SPA paths back to `/`, so these URLs can be loaded directly:

- `/`
- `/dashboard`
- `/dashboard/*`
- `/mobisite`

## Firebase Project Setup

Install and authenticate the Firebase CLI when needed:

```bash
npm install -g firebase-tools
firebase login
firebase projects:list
```

The current `firebase.json` has Firestore rules plus two Functions codebases:

```json
{
	"firestore": {
		"rules": "firestore.rules"
	},
	"functions": [
		{
			"source": "functions",
			"predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
			"codebase": "default"
		},
		{
			"source": "yoyo_jwt",
			"codebase": "yoyo_jwt",
			"ignore": [
				"node_modules",
				".git",
				"firebase-debug.log",
				"firebase-debug.*.log",
				"*.local"
			],
			"predeploy": [
				"npm --prefix \"$RESOURCE_DIR\" run lint",
				"npm --prefix \"$RESOURCE_DIR\" run build"
			]
		}
	]
}
```

## Environment Variables And Secrets

The browser app reads Firebase config from repo-root `.env.local` through `apps/desktop/vite.config.ts`.

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` is optional because the client has a production Cloud Functions fallback. Set it when targeting a different Firebase project or emulator.

The AI assistant requires a server-side Firebase secret:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions:askAI
```

For local emulation, copy `functions/.secret.local.example` to `functions/.secret.local` and add the real key there. Never commit the real value and never expose it as `VITE_GEMINI_API_KEY`.

## Cloud Functions

Main API endpoints live in `functions/src/index.ts`:

- `GET /healthCheck`
- `GET /getUserTransactions`
- `POST /askAI`

Deploy all default functions:

```bash
firebase deploy --only functions:default
```

Deploy one function when appropriate:

```bash
firebase deploy --only functions:askAI
```

Useful checks:

```bash
firebase functions:list
firebase functions:log
firebase emulators:start --only functions
```

## Firestore Rules

Firestore rules are deployed separately when needed:

```bash
firebase deploy --only firestore:rules
```

The current `firestore.rules` file is the source of truth. It scopes active data under `users/{userId}` and validates:

- Ownership through `request.auth.uid`.
- Allowed keys for accounts, transactions, budgets, categories, recurring transactions, and random notes.
- Required string fields, timestamp fields, known enum values, and money bounds.
- Transfer metadata: `transferAccountId`, `transferId`, and `transferDirection`.
- Budget lifecycle fields, date fields, display order, and optional account/category scope.
- Category/subcategory shape and random note content length.

Legacy top-level `transactions` and `recurringExpenses` collections are read-only compatibility paths.

## Verification

Before deploying app changes:

```bash
npm test -- --runInBand
npm run build
```

For API changes, also build functions:

```bash
cd functions
npm run build
```

After deployment, verify the SPA route you touched and check Cloud Function logs when API or assistant behavior changed.

## Troubleshooting

- **SPA route 404 on refresh:** confirm Vercel rewrites still send app routes to `/`.
- **Permission errors:** deploy `firestore.rules` and confirm the signed-in user owns the target `users/{userId}` path.
- **AI assistant unavailable:** confirm `GEMINI_API_KEY` exists in Firebase Secret Manager and is attached to the deployed `askAI` function.
- **Auth errors from API:** refresh/sign in again and confirm the request uses `Authorization: Bearer <firebase_id_token>`.
- **Wrong API project:** set `VITE_API_BASE_URL` to the intended Cloud Functions base URL.
