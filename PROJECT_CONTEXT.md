# Cash Flow Project Context

## Purpose

Cash Flow is a personal finance tracker for simple, private use. It is meant to be clear enough to share with friends and family, and easy enough to pick back up after a few months away from the code.

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

## Architecture Map

The app follows a light MVC-style structure:

- `src/models/`: domain shapes, normalization, and pure calculations.
- `src/hooks/`: Firebase reads/writes and real-time subscriptions.
- `src/controllers/`: business operations exposed to UI/state.
- `src/context/`: app-wide state providers consumed by views.
- `src/views/`: feature screens and forms.
- `src/pages/`: route-level shells.
- `src/components/app/`: shared app UI, sidebar, settings, and primitives.

Firebase data is scoped under `users/{userId}/` subcollections for accounts, transactions, budgets, categories, and recurring transaction templates.

## Important Rules

- Accounts come before transactions in the user flow.
- Transaction writes that change balances must stay atomic with Firestore `writeBatch` and `increment()`.
- Transfers are represented as two linked transaction records and two account balance updates.
- Keep data normalization in models and Firebase behavior in hooks.
- Use shared types from `src/types/` instead of redefining domain shapes in UI components.
- Keep the UI friendly and direct; do not turn the app into a marketing surface.

## Where To Start

- Run locally: `npm install`, then `npm run dev`.
- Understand the app shape: read `README.md`, then `flow.md`.
- Understand current engineering priorities: read `CODING_STANDARDS.md`.
- Check known test gaps and manual checks: read `TESTING.md`.
- Deploy safely: read `DEPLOYMENT.md`.

## Future Work Bias

Prefer small changes that preserve the current feel of the app. When improving user experience, make the next useful action obvious before adding new features. When improving code, keep behavior stable and add tests around account balances, transaction history, import/export, and delete flows.
