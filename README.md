## Project Overview - Cash Flow

**Cash Flow** is a multi-account personal finance web application. It lets users track income, expenses, and transfers across multiple bank and cash accounts, set spending budgets, view reports, and reconcile balances — all in real-time via Firebase.

## Start Here

If you are returning to the project after time away, start with [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). It summarizes the core MVP, supporting features, architecture boundaries, and important rules.

Use these docs as the main map:

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — quick re-entry guide and MVP boundaries.
- [flow.md](flow.md) — data structures, Firestore paths, and app data flow.
- [TESTING.md](TESTING.md) — automated coverage and manual regression checklist.
- [DEPLOYMENT.md](DEPLOYMENT.md) — deployment notes.
- [CODING_STANDARDS.md](CODING_STANDARDS.md) — engineering standards backlog and acceptance checks.

## Core MVP

The friendly first-run path is: sign in, create an account, add transactions, review history, then use budgets or import/export when needed.

Core features:

- Auth
- Accounts
- Transactions
- Transfers
- Dashboard
- Budgets
- Import/export

Supporting features:

- Recurring transactions
- Reports
- AI assistant
- Marketing website components

## Key Features

- **Secure Login:** User authentication with Firebase (Google + email/password).
- **Multi-Account Management:** Track debit, credit, savings, and cash accounts with custom colors and bank names.
- **Account Transfers:** Move money between accounts atomically — two linked transaction records and both balances updated in a single Firestore batch write.
- **Account Reconciliation:** Compare app balance vs actual bank balance and auto-create an adjustment transaction to correct any discrepancy.
- **Real-Time Tracking:** Instantly log income, expenses, and transfers with live Firestore subscriptions (`onSnapshot`).
- **Budgets:** Set monthly spending limits per category with color-coded progress bars (green / yellow / red).
- **Reports:** Spending by category (pie chart), spending by account (bar chart), income vs expense trend (area chart), and net worth breakdown.
- **Account Detail Page:** Per-account transaction history with income/expense totals and category breakdown.
- **Recurring Transactions:** Create income or expense recurring templates accessible from the dedicated "Recurring" sidebar view, with filtering by frequency, category, and type, and Quick Fill support in the transaction form.
- **AI Assistant:** Ask natural-language questions about spending, categories, merchants, and account trends from your own transaction data.
- **Import/Export:** Import transactions from CSV/JSON with validation and deduping; export all data as CSV/JSON.
- **MVC Architecture:** Clean separation of concerns — models, hooks, controllers, contexts, views.
- **Theme Support:** Dark and light mode throughout.
- **Cloud Sync:** All data stored under `users/{userId}/` subcollections in Firestore.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn/ui, Recharts
- **Backend:** Firebase Auth & Firestore
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Environment Variables

Create a `.env.local` file in the project root with the Firebase config values used in [src/services/firebase.ts](src/services/firebase.ts):

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID

### Install & Run

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Run tests: `npm test`

### Deploy Firestore Rules

After cloning, deploy security rules once:

```
firebase deploy --only firestore:rules
```

### Useful Scripts

- `npm run build`
- `npm run lint`
- `npm run test:watch`
- `npm run test:coverage`

## Project Structure

```
src/
├── pages/           # Route-level screens (Dashboard, Home, AccountDetail)
├── views/
│   ├── Accounts/    # AccountsList, AccountForm, TransferForm, ReconcileForm
│   ├── Budgets/     # BudgetsList, BudgetForm
│   ├── RecurringTransactions/ # RecurringTransactionsView, RecurringTransactionsList, RecurringTransactionForm
│   ├── Reports/     # ReportsView (4 chart sections)
│   └── Transactions/# TransactionForm, TransactionsTable, TransactionsList
├── components/app/  # Reusable app components (Sidebar, SettingsModal, ui primitives)
├── context/         # Global state — Accounts, Budgets, Transactions, Theme
├── hooks/           # Data layer — useAccounts, useBudgets, useTransactions, useRecurringTransactions, useAuth
├── controllers/     # Business logic — AccountsController, BudgetsController, TransactionsController, RecurringTransactionsController, ReportsController
├── models/          # Domain models, normalization — Account, Budget, Transaction, RecurringTransaction
├── services/        # Firebase init
├── utils/           # Pure utilities (date, formatting, import/export, dateRangeFilter)
└── types/           # Shared TypeScript interfaces
```

## Architecture & Data Flow

### Firestore Collections

All data is stored under user-scoped subcollections:

| Path | Description |
|---|---|
| `users/{userId}/transactions/{id}` | All transactions (income, expense, transfer) |
| `users/{userId}/accounts/{id}` | User's financial accounts |
| `users/{userId}/budgets/{id}` | Monthly spending budgets |
| `users/{userId}/recurringTransactions/{id}` | Recurring transaction templates (income or expense) |

### MVC Layers

- **Models** — data interfaces, Firestore normalization, pure utility functions (`src/models/`)
- **Hooks** — Firestore read/write with `onSnapshot` real-time listeners (`src/hooks/`)
- **Controllers** — business logic wrapping hooks, exposed to UI via context (`src/controllers/`)
- **Contexts** — React Context providers: `AccountsContext`, `BudgetsContext`, `TransactionsContext` (`src/context/`)
- **Views** — feature UI components consuming contexts (`src/views/`, `src/pages/`)

### Account Balance Integrity

- Every `addTransaction` call in `useTransactions` uses a Firestore `writeBatch` to atomically write the transaction document and update the account balance via `increment()`.
- Transfers create two transaction records (one per account) and update both balances in the same batch.
- `deleteTransaction` reverses the balance update in the same batch.

## State Management

- **AccountsContext** — accounts list, CRUD, net worth calculation
- **BudgetsContext** — budgets list, CRUD, budget progress
- **TransactionsContext** — transactions list, recurring transactions (CRUD + real-time), add/update/delete/transfer; exposes `recurringTransactions`, `recurringTransactionsLoading`, `addRecurringTransaction`, `updateRecurringTransaction`, `deleteRecurringTransaction`
- **ThemeContext** — dark/light mode

Provider nesting order in `App.tsx`:

```
ThemeProvider → TransactionsProvider → AccountsProvider → BudgetsProvider → Router
```

## Coding Conventions

- Keep data normalization in models, not in UI components.
- Prefer small, focused components with single responsibility.
- Use `writeBatch` + `increment()` for any operation that touches both a transaction and an account balance.
- Reuse utilities from `src/utils/` instead of duplicating logic.
- Use shared types from `src/types/` across all layers.
- See `CODING_STANDARDS.md` for the incremental standards uplift backlog and acceptance checks.

## Goals

- Help users stay on top of their finances across multiple accounts.
- Make budgeting easy and accessible.
- Keep data secure, consistent, and always up to date.

## Recurring Transactions Usage

1. **Creating a Recurring Transaction:**
   - Click "Recurring" in the left sidebar to open the Recurring Transactions view
   - Click "Add New"
   - Select the transaction type (Expense or Income)
   - Fill in title, amount, category, frequency, and optional description
   - Click "Add Transaction"

2. **Using Quick Fill:**
   - Click "New Transaction"
   - In the "Quick Fill" section, select a recurring transaction
   - The form auto-fills title, amount, category, and type
   - Adjust any fields as needed, then submit

3. **Managing Recurring Transactions:**
   - Edit: click the edit icon next to any recurring transaction; update fields and save
   - Delete: click the delete icon (a confirmation dialog is required before deletion)

4. **Filtering Recurring Transactions:**
   - Use the Frequency, Category, and Type dropdowns at the top of the Recurring view to narrow the list
   - The total summary card updates to reflect the filtered results
   - Click "Reset" to clear all active filters

## Import/Export Usage

- Open the Dashboard → Settings (bottom-left in the sidebar) → "Data" tab.
- **Import:** upload a `.csv` or `.json` file. Required fields: `title`, `amount`, `type`, `category`. Optional: `accountId`, `description`, `date`.
- Import requires at least one account to exist first. If `accountId` is missing on a row, the first available account is used.
- Only `income` and `expense` rows are accepted during import (`transfer` rows are rejected).
- Duplicates are skipped via `title+amount+type+category+date` signature.
- **Export CSV / Export JSON:** downloads all your transactions including `accountId`.

## AI Assistant Notes

- AI responses are scoped to the authenticated user's data only, and the API verifies that request `userId` matches the auth token user.
- The assistant uses deterministic, rule-based analytics over up to 2000 transactions.
- Date-based monthly analysis uses transaction `date` and falls back to `createdAt` when needed.
- Best supported prompts: monthly spend, category totals, merchant frequency/spend, and highest-spend account comparisons.

## Ideal For

- Budget-conscious individuals
- People managing multiple bank accounts
- Students and freelancers
- Anyone wanting a lightweight, multi-account finance tracker
