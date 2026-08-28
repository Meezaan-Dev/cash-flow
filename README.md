# Cash Flow

Cash Flow is a private, multi-account personal finance web app. It ships as one Vite/React SPA with two focused experiences:

- `/dashboard` and `/dashboard/*` - desktop-first admin for full management.
- `/mobisite` - mobile-first capture for adding income/expense transactions and viewing a simple transaction list.

Unauthenticated users see the landing page. Authenticated users on mobile-sized browsers (`<768px`) are redirected from dashboard/admin routes to `/mobisite`.

## Start Here

If you are returning to the project after time away, start with [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md). It is the quick re-entry guide for purpose, architecture boundaries, and important rules.

AI agents should read [AGENTS.md](AGENTS.md) for repo conventions and [agents/skills/git-workflow/SKILL.md](agents/skills/git-workflow/SKILL.md) before creating branches, commits, or pull requests.

Useful docs:

- [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) - app purpose, product shape, architecture map, and important rules.
- [docs/ROUTES.md](docs/ROUTES.md) - route behavior and desktop/mobile routing rules.
- [docs/flow.md](docs/flow.md) - Firestore paths, data structures, providers, and data flow.
- [docs/TESTING.md](docs/TESTING.md) - automated coverage, validation commands, and manual regression checklist.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Vercel SPA deployment, Firebase Functions, secrets, and rules.
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - Cloud Functions endpoint contract.
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) - engineering standards backlog and acceptance checks.

## Product Surface

The app currently includes:

- Accounts with debit, credit, savings, cash, credit-limit, balance, transfer, and reconcile flows.
- Transactions with income, expense, transfer, category, subcategory, filters, bulk category edits, and CSV/JSON import/export.
- Budgets with draft/published states, monthly/custom periods, optional account and subcategory scope, repeat actions, and ordering.
- Recurring transaction templates, due/upcoming dashboard prompts, and mobile/desktop Quick Fill.
- Reports for spending, subcategory breakdowns, account activity, trends, and net worth.
- Settings for theme, privacy mode, main account preference, categories, filters, data tools, and sign out.
- Random private notes and an authenticated Gemini-backed assistant.

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS, Radix UI primitives, lucide/react-icons
- Firebase Auth, Firestore, and Firebase Cloud Functions
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

Optional browser API base URL:

```text
VITE_API_BASE_URL=
```

The AI assistant uses the server-side `GEMINI_API_KEY` secret in Firebase Functions. Do not expose it with a `VITE_` prefix.

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
functions/           Firebase Cloud Functions for API and AI assistant endpoints
agents/skills/       Project-specific agent workflow guidance
dist/                Single production build output
```

There is only one deployed SPA. `apps/mobisite` is internal separation, not a second server or separate deployment.
