# Cash Flow Project Context

## Purpose

Cash Flow is a personal finance tracker for simple, private use. It runs on one server with `/dashboard` for desktop management and `/mobisite` for mobile-first transaction capture.

## Core MVP

The core app flow is:

1. Sign in.
2. Create at least one account.
3. Add income, expense, or transfer transactions.
4. Review dashboard totals and transaction history.
5. Add budgets when planning is useful.
6. Import or export data when moving between files and the app.

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

## Product Shape

The friendly first-run path is:

1. Sign in.
2. Create at least one account in desktop admin.
3. Choose a main account for new transactions.
4. Add income/expense transactions from desktop or `/mobisite`.
5. Review transaction history, balances, budgets, recurring expenses, and reports from desktop.

Core capabilities include Firebase auth, multi-account management for debit/credit/savings/cash, atomic income and expense writes, linked transfer records, account reconciliation, desktop dashboard/admin views, mobile transaction capture, recurring due-today drafts, import/export, reports, settings, and the AI assistant.

## Architecture Map

The app now follows an app-flow structure with domain logic separated from pages and shared app services:

- `apps/desktop/src/app/`: host app shell concerns such as routes and theme wiring.
- `apps/desktop/src/pages/`: route-level screens and page-specific dashboard, account, marketing, and mobisite components.
- `apps/desktop/src/domains/`: desktop domain logic, views, hooks, models, controllers, and contexts for accounts, transactions, budgets, categories, recurring transactions, reports, auth, and AI.
- `apps/desktop/src/shared/`: app-local shared logic such as filters that are reused across multiple pages.
- `apps/mobisite/src/`: small mobile app mounted inside the host router at `/mobisite`.
- `packages/shared/src/`: Firebase, shared types, models, hooks, and date/currency/category utilities used across app shells.
- `packages/ui/src/`: shared UI package placeholder for reusable primitives as they are extracted.

Firebase data is scoped under `users/{userId}/` subcollections for accounts, transactions, budgets, categories, and recurring transaction templates.

There is only one deployed SPA. `apps/mobisite` is internal separation, not a second server or separate deployment.

## Important Rules

- Accounts come before transactions in the user flow.
- Transaction writes that change balances must stay atomic with Firestore `writeBatch` and `increment()`.
- Transfers are represented as two linked transaction records and two account balance updates.
- Keep data normalization in domain models and Firebase behavior in domain hooks.
- Use shared types from `src/types/` instead of redefining domain shapes in UI components.
- Keep the UI friendly and direct; do not turn the app into a marketing surface.
- Keep `/mobisite` intentionally small: add income/expense and view list only.
- Use the route split to separate concerns: desktop manages the system; mobisite captures transactions quickly.

## Where To Start

- Run locally: `npm install`, then `npm run dev`.
- Understand the app shape: read [README.md](../README.md), then [flow.md](flow.md).
- Understand current engineering priorities: read [CODING_STANDARDS.md](CODING_STANDARDS.md).
- Check known test gaps and manual checks: read [TESTING.md](TESTING.md).
- Deploy safely: read [DEPLOYMENT.md](DEPLOYMENT.md).

## Future Work Bias

Prefer small changes that preserve the current feel of the app. When improving user experience, make the next useful action obvious before adding new features. When improving code, keep behavior stable and add tests around account balances, transaction history, import/export, and delete flows.
