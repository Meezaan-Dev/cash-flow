# Cash Flow

Cash Flow is a private, multi-account personal finance web app. It runs as one Vite/React SPA on one server, with two focused experiences:

- `/dashboard` and `/dashboard/*` - desktop-first admin for full management.
- `/mobisite` - mobile-first capture surface for adding income/expense transactions and viewing a simple transaction list.

Unauthenticated users see the landing page on both desktop and mobile. Authenticated users on mobile-sized browsers (`<768px`) are redirected away from dashboard/admin routes to `/mobisite`, so the full dashboard is desktop/tablet only.

## Start Here

If you are returning to the project after time away, start with [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md). It is the quick re-entry guide for purpose, architecture boundaries, and important rules.

Useful docs:

- [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) - current app purpose, MVP boundaries, and architecture map.
- [docs/flow.md](docs/flow.md) - Firestore paths, data structures, and data flow.
- [docs/TESTING.md](docs/TESTING.md) - automated coverage and manual regression checklist.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - deployment notes.
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) - engineering standards backlog and acceptance checks.

## Product Shape

The friendly first-run path is:

1. Sign in.
2. Create at least one account in desktop admin.
3. Choose a main account for new transactions.
4. Add income/expense transactions from desktop or `/mobisite`.
5. Review transaction history, balances, budgets, recurring expenses, and reports from desktop.

Core features:

- Firebase auth with email/password and Google sign-in.
- Multi-account management for debit, credit, savings, and cash.
- Atomic income/expense writes that update account balances in the same Firestore batch.
- Atomic transfers represented by linked transaction records and balance updates on both accounts.
- Account reconciliation through adjustment transactions.
- Desktop dashboard, transaction history, accounts, budgets, recurring, reports, settings, import/export, and AI assistant.
- Mobisite add/list flow for phone-first transaction capture only.
- Main account preference used as the default account for new desktop and mobisite transactions.
- Recurring expense due-today drafts on the dashboard, confirmable into normal expense transactions.

Out of scope for `/mobisite`:

- Account management
- Transfers
- Budgets
- Recurring management
- Reports
- Settings
- Import/export
- AI assistant

## Routes

| Route | Behavior |
|---|---|
| `/` | Protected entry. Authenticated desktop/tablet users go to `/dashboard`; authenticated mobile users go to `/mobisite`; unauthenticated users see the landing page. |
| `/dashboard` | Desktop dashboard overview. Redirects authenticated mobile-sized browsers to `/mobisite`. |
| `/dashboard/transactions` | Desktop transaction history/table or mobile-width desktop list if reached on a non-mobile guarded viewport. |
| `/dashboard/accounts` | Desktop accounts management. |
| `/dashboard/accounts/:accountId` | Desktop per-account history/detail view. |
| `/dashboard/budgets` | Desktop budget management. |
| `/dashboard/recurring` | Desktop recurring transaction management. |
| `/dashboard/reports` | Desktop reports. |
| `/dashboard/settings` | Desktop settings modal route. |
| `/mobisite` | Mobile capture experience. On desktop/tablet it is shown inside a mobile browser-style frame; on actual small screens it renders full-screen. |

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS, Radix UI primitives, lucide/react-icons
- Firebase Auth and Firestore
- Recharts for reporting
- Jest and Testing Library
- Vercel hosting

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- Firebase project config

### Environment Variables

Create a `.env.local` file in the project root. Vite loads these through `apps/desktop/vite.config.ts` with `envDir` pointing at the repo root.

Required Firebase variables:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Install And Run

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:5173/dashboard` for desktop admin.
- `http://localhost:5173/mobisite` for mobile capture.

If the default Vite port is busy, Vite will print the next available local URL.

### Useful Scripts

```bash
npm run dev          # one Vite dev server for the whole SPA
npm run build        # typecheck + build to root dist/
npm run lint
npm test
npm test -- --runInBand
npm run test:watch
npm run test:coverage
```

## Project Structure

```text
apps/
  desktop/           Single host app, router, desktop dashboard/admin, marketing page
  mobisite/          Mobile capture UI imported by the desktop host router
packages/
  shared/            Firebase services, shared models, hooks, types, date/currency/category utilities
  ui/                Placeholder package for primitives that are genuinely reused across apps
dist/                Single production build output
```

There is only one deployed SPA. `apps/mobisite` is internal separation, not a second server or separate deployment.

## Architecture Notes

### Routing And Auth

- `apps/desktop/src/App.tsx` owns the single router.
- Protected routes render the previous landing page when no Firebase user is authenticated.
- Authenticated mobile-sized dashboard/root requests redirect to `/mobisite` using the `max-width: 767px` media query.
- Desktop users can still open `/mobisite` from the dashboard sidebar to preview the mobile browser frame.

### Shared Data Layer

- Desktop and mobisite both use the shared Firebase hooks/services in `packages/shared`.
- Both transaction entry points call the same `addTransaction` path, preserving account balance integrity.
- Firebase app initialization uses `getApps()/getApp()` guards so desktop and shared imports do not double-initialize Firebase.

### Firestore Collections

All user data is stored under `users/{userId}/`:

| Path | Description |
|---|---|
| `users/{userId}/accounts/{id}` | Financial accounts and balances |
| `users/{userId}/transactions/{id}` | Income, expense, and transfer transaction records |
| `users/{userId}/budgets/{id}` | Monthly spending budgets |
| `users/{userId}/categories/{id}` | User-managed categories and subcategories |
| `users/{userId}/recurringTransactions/{id}` | Recurring transaction templates |

### Account Balance Integrity

- `addTransaction` validates the target account exists, writes the transaction, and updates the account balance in one Firestore `writeBatch`.
- Income increments the account balance; expenses decrement it.
- Transfers write linked records and update both account balances in one batch.
- Deleting a transaction reverses the balance effect when the account document still exists.

### Recurring Due-Today Drafts

- Recurring expense templates with `expectedDate === today.getDate()` appear on the dashboard as confirmable drafts.
- Income templates and templates without `expectedDate` are ignored.
- Confirming a draft creates a normal expense transaction through `addTransaction`.
- Confirmed transactions include:
  - `recurringTransactionId`
  - `recurringOccurrenceDate` as `YYYY-MM-DD`
- A draft is hidden when a transaction already exists with the same recurring id and occurrence date.
- There is no separate draft collection.

### Main Account Preference

- The main account preference is stored locally in `localStorage` via `packages/shared/src/accounts/mainAccountPreference.ts`.
- Settings lets the user change it at any time.
- Desktop transaction creation and mobisite transaction creation default to that account when it exists.
- Forms still allow choosing a different account per transaction.

## Coding Conventions

- Keep data normalization in model files, not UI components.
- Keep Firebase behavior in hooks/services and preserve atomic writes for balance-changing operations.
- Prefer shared hooks/types/utilities from `packages/shared` when behavior is used by both desktop and mobisite.
- Keep `/mobisite` intentionally small: add income/expense and view list only.
- Avoid adding abstractions unless they reduce real duplication or match an existing pattern.
- Use the route split to separate concerns: desktop manages the system; mobisite captures transactions quickly.

## Validation Checklist

Before shipping route, transaction, account, recurring, or mobisite changes, run:

```bash
npm test -- --runInBand
npm run lint
npm run build
```

Known current lint output may include existing Fast Refresh warnings for files that export both components and helpers.

## Deployment

- Production is same-domain with one SPA build.
- `npm run build` emits root `dist/`.
- `vercel.json` rewrites SPA paths back to `/`, so `/dashboard/*` and `/mobisite` can be loaded directly.
- Firestore rules are deployed separately when needed:

```bash
firebase deploy --only firestore:rules
```

## Ideal For

- People managing multiple accounts.
- Budget-conscious individuals.
- Students, freelancers, and anyone who needs lightweight cash-flow tracking.
- Users who want fast mobile transaction capture without giving up a fuller desktop admin view.
