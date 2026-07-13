# Routes

Cash Flow is one deployed SPA. `apps/desktop/src/App.tsx` owns routing for both desktop admin and the mounted mobile capture experience.

## Route Behavior

| Route | Behavior |
|---|---|
| `/` | Protected entry. Authenticated desktop/tablet users go to `/dashboard`; authenticated mobile users go to `/mobisite`; unauthenticated users see the landing page. |
| `/dashboard` | Desktop dashboard overview. Redirects authenticated mobile-sized browsers to `/mobisite`. |
| `/dashboard/transactions` | Desktop transaction history/table, or mobile-width desktop list if reached on a non-mobile guarded viewport. |
| `/dashboard/accounts` | Desktop accounts management. |
| `/dashboard/accounts/:accountId` | Desktop per-account history/detail view. |
| `/dashboard/budgets` | Desktop budget management. |
| `/dashboard/recurring` | Desktop recurring transaction management. |
| `/dashboard/reports` | Desktop reports. |
| `/dashboard/random` | Desktop freeform private notes area. |
| `/dashboard/assistant` | Gemini-powered financial assistant workspace. |
| `/dashboard/settings` | Desktop settings modal route. |
| `/mobisite` | Mobile capture experience. On desktop/tablet it is shown inside a mobile browser-style frame; on actual small screens it renders full-screen. |

## Auth And Viewport Rules

- Protected routes render the landing page when no Firebase user is authenticated.
- Authenticated mobile-sized dashboard/root requests redirect to `/mobisite` using the `max-width: 767px` media query.
- Desktop users can still open `/mobisite` from the dashboard sidebar to preview the mobile browser frame.

## Mobisite Scope

`/mobisite` is intentionally small and phone-first. It supports:

- Adding income and expense transactions.
- Viewing a simple transaction list.
- Using the main account preference as the default account when it exists.

Out of scope for `/mobisite`:

- Account management
- Transfers
- Budgets
- Recurring management
- Reports
- Settings
- Import/export
- AI assistant
