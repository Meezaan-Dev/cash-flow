# Testing Documentation for Cash Flow

This document summarizes current automated coverage and manual testing priorities.

## Testing Stack

- **Jest** for test runner and assertions
- **React Testing Library** for component-level rendering and interaction tests
- **@testing-library/user-event** for realistic UI interactions
- **@testing-library/jest-dom** for DOM matchers
- **ts-jest** for TypeScript test compilation

## Test Layout

Tests live next to the app/domain code they cover:

```text
apps/desktop/src/__tests__/                 # host routing
apps/desktop/src/app/                       # shell/theme/privacy behavior
apps/desktop/src/components/marketing/      # shared display helpers
apps/desktop/src/domains/*/                 # account, auth, budget, category, recurring, report, transaction, AI tests
apps/desktop/src/pages/*/                   # route/page-level tests
apps/desktop/src/shared/filters/            # filter preferences and URL filter helpers
apps/mobisite/src/__tests__/                # mobile capture app tests
packages/shared/src/__tests__/              # shared errors/utilities
packages/shared/src/recurring/__tests__/    # recurring due/upcoming draft helpers
```

Run `find apps packages -path '*/__tests__/*' -type f | sort` for the exact current file list.

## Running Tests

```bash
npm test
npm test -- --runInBand
npm run test:watch
npm run test:coverage
```

Before shipping route, transaction, account, budget, recurring, mobisite, or assistant changes, run:

```bash
npm test -- --runInBand
npm run lint
npm run build
```

Known lint output may include existing Fast Refresh warnings for files that export both components and helpers.

## Current Automated Coverage

- App routing, protected route behavior, desktop/mobile redirects, mobisite frame routing
- Auth modal flows, email/password auth, Google sign-in states, and return-to-mobisite behavior
- Account model behavior, credit limits, available balance, net worth, account detail rendering
- Transaction normalization, sorting, add/update/delete, bulk category updates, transfer pair identity/deletion, import/export filtering
- Budget model, service, hook, list behavior, progress, duplicates, recurring cycles, custom dates, card ordering, and history links
- Category utilities and category/subcategory path behavior
- Filter preference merging and URL filter round trips
- Dashboard summary, digest periods, dashboard overview, account strip, recurring prompts, and privacy mode shortcuts
- Recurring transaction list/form/calendar behavior and saved account handling
- Reports controller summaries for categories, subcategories, accounts, date ranges, monthly trends, and net worth
- AI chatbot UI, auth-required state, loading, errors, clearing, and recent history payloads
- Mobisite home/list/add flows, last-view restore, success messages, recurring Quick Fill, and stale recurring account handling
- Shared recurring due/upcoming draft helpers and shared error messages

## Manual Regression Checklist

- First-run flow: sign in, create an account, add the first transaction
- Desktop/mobile routing: `/`, `/dashboard`, `/dashboard/*`, and `/mobisite` at desktop and mobile widths
- Multi-account transfer and reconcile flows, including balance updates
- Transaction create/edit/delete, bulk category edit, filtering, sorting, and date range behavior
- Import/export flows for CSV/JSON, including duplicate handling and empty-account guard
- Category and subcategory create/rename/delete, including in-use protections
- Budget create/edit/delete, optional account/subcategory scope, draft publishing, custom dates, repeat actions, eight-budget limit, ordering, and history links
- Mobile-created expense transactions appearing in matching desktop budgets
- Recurring template CRUD, dashboard due/upcoming prompts, and Quick Fill on desktop and `/mobisite`
- Reports date range and breakdown views
- AI assistant responses and API error states
- Settings tabs: general, data, filters, categories, theme, main account, and sign out
- Privacy mode masking and keyboard shortcuts
- Light/dark mode and key responsive layouts

## High-Priority Missing Tests

These are the remaining high-value gaps based on current test names:

1. Single-confirm transaction deletion flow at the full table/dialog interaction level.
2. `askAI` Cloud Function analytics/prompt behavior with transactions that only have `createdAt`.
3. End-to-end import UI behavior from Settings, beyond pure import/export utilities.
4. Manual visual coverage for landing page copy fit on narrow mobile widths.

## Configuration Notes

- JSDOM environment with TypeScript through `ts-jest`
- Firebase/auth and browser API mocks in test setup utilities
- Local storage and router behavior mocked where needed
- Function source is TypeScript-built separately under `functions/`
