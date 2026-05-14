# Testing Documentation for Cash Flow Application

## Overview

This document summarizes current automated coverage and manual testing priorities for Cash Flow.

## Testing Stack

- **Jest**: test runner and assertions
- **React Testing Library**: component-level testing
- **@testing-library/user-event**: realistic UI interactions
- **@testing-library/jest-dom**: DOM matchers

## Test Structure

```
src/
├── components/__tests__/
│   ├── AIChatbot.test.tsx
│   └── AuthModals.test.tsx
├── hooks/__tests__/
│   └── useAuth.test.ts
├── utils/__tests__/
│   └── formatCurrency.test.ts
└── setupTests.ts
```

## Running Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Current Automated Coverage

- `useAuth` authentication state and login/register behavior
- `AuthModals` UI flows and validation
- `formatCurrency` numeric and formatting edge cases
- `AIChatbot` chat UI flow and API error handling

Run `npm test` for the latest exact test count in your environment.

## Manual Regression Checklist

- Recurring transaction CRUD and quick-fill behavior
- Import/export flows (CSV/JSON, duplicate handling)
- Dashboard/Table/List filtering and sorting behavior
- Multi-account transfer and reconcile flows
- Theme switching (dark/light mode)
- Mobile responsiveness and sidebar navigation

## High-Priority Missing Tests

1. Single-confirm transaction deletion flow (no duplicate confirmation dialogs).
2. Import should fail fast when no accounts exist.
3. `askAI` monthly analytics should include entries that only have `createdAt`.
4. Transfer pair update/delete invariants and account-balance integrity.
5. Dashboard selection/edit lifecycle across `transaction`, `table`, and `list` views.

## Configuration Notes

- JSDOM environment with TypeScript (`ts-jest`)
- Firebase/auth and browser API mocks in test setup utilities
- Local storage and router behavior mocked where needed
