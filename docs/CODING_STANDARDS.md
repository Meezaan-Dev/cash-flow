# Coding Standards Uplift Backlog

This backlog defines incremental engineering-standard improvements with clear acceptance checks.

## 1) Type Safety Hardening

- Replace remaining `any` usage in app code paths with shared domain types from `src/types`.
- Prefer explicit union types for view routing and UI state transitions.

Acceptance checks:

- `rg "\bany\b" src --glob "*.{ts,tsx}"` should only match intentional library interop exceptions.
- Dashboard/table/list selection and delete handlers compile without type assertions.

## 2) Shared Date Semantics

- Use centralized date helpers from `src/utils/date.ts` for transaction sorting and display fallback behavior.
- Ensure every transaction surface consistently uses `date ?? createdAt`.

Acceptance checks:

- No duplicated inline `toDate` parsing logic in sidebar/list/table flows.
- Transaction ordering is consistent across dashboard surfaces for the same dataset.

## 3) Cloud Function Modularity

- Break `functions/src/index.ts` into focused helpers/services:
  - request/auth validation
  - transaction/account analytics
  - intent routing and response formatting
- Keep endpoint handlers thin and orchestrator-like.

Acceptance checks:

- Each service/helper file has a single responsibility and isolated unit-test targets.
- Endpoint handlers are primarily validation + orchestration (minimal business branching inline).

## 4) Error Handling Standards

- Replace console-only failures in user workflows with surfaced UI feedback where appropriate.
- Ensure API responses are explicit and consistent (`success`, `error`, actionable messages).

Acceptance checks:

- High-risk user flows (import, delete, transaction submit) always produce user-visible feedback on failure.
- Functions endpoints return predictable status codes and stable error shapes.

## 5) Test Coverage Priorities

- Add regression tests around known risk areas:
  - single-confirm delete flow
  - import-without-account guard
  - AI month date fallback
  - transfer balance invariants

Acceptance checks:

- New tests fail before regressions are fixed and pass after.
- `npm test` and `npm run lint` pass on CI for touched files.
