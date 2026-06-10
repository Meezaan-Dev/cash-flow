# Git workflow reference

## Branch name → PR title mapping

| Branch | PR title |
|--------|----------|
| `feat/premium-dashboard-ui` | `feat: premium dashboard marketing UI` |
| `fix/mobisite-nav-overlap` | `fix: mobisite nav overlapping content` |
| `docs/agent-git-standards` | `docs: add agent git workflow skills` |
| `refactor/shared-date-helpers` | `refactor: consolidate transaction date parsing` |
| `chore/jest-workspace-config` | `chore: align jest with npm workspaces` |

## Multi-commit PR example

Branch `feat/dashboard-redesign` with commits:

1. `feat(dashboard): add marketing primitives`
2. `feat(dashboard): restyle shell and overview`
3. `fix(dashboard): due-today section layout`

PR summary should mention **all three**, not only the latest commit.

## When to split branches

Split into separate PRs when:

- Changes are independently reviewable (e.g. `docs/` vs large `feat/`)
- One part is blocked or risky
- User explicitly asks to split

Keep together when:

- Changes are one feature/fix end-to-end
- Shared types/components are required by the feature in the same PR

## Common mistakes

| Mistake | Correct approach |
|---------|------------------|
| `feature/new-ui` | Use `feat/new-ui` |
| `bugfix-login` | Use `fix/login-redirect` |
| `updates` | Use specific type + description |
| PR body lists only latest commit | Summarize full `git diff master...HEAD` |
| Targeting `develop` | Target `master` for this repo |
| Commit without user request | Ask or wait for explicit commit instruction |

## Test commands

```bash
# Full suite
npm test

# Desktop TypeScript
cd apps/desktop && npx tsc -p tsconfig.app.json

# Focused tests
npm test -- --testPathPattern="DashboardOverview|mobisite"
```

## File locations agents often touch

| Area | Path |
|------|------|
| Dashboard shell | `apps/desktop/src/pages/dashboard/` |
| Marketing primitives | `apps/desktop/src/components/marketing/` |
| Marketing styles | `apps/desktop/src/styles/marketingStyles.ts` |
| Domain views | `apps/desktop/src/domains/*/views/` |
| Mobisite app | `apps/mobisite/src/App.tsx` |
| Mobisite frame | `apps/desktop/src/pages/mobisite/MobisiteFrame.tsx` |
| Shared hooks/types | `packages/shared/src/` |
| Agent skills | `.cursor/skills/` |
