# Agent guide (cash-flow)

Quick context for AI agents working in this repository.

## Start here

1. [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) — purpose, architecture, data model
2. [docs/ROUTES.md](docs/ROUTES.md) — `/dashboard`, `/mobisite`, mobile redirects
3. [.cursor/skills/git-workflow/SKILL.md](.cursor/skills/git-workflow/SKILL.md) — **branch names, commits, PRs**

## Git conventions (summary)

**Branch format:** `<type>/<short-kebab-description>`

| Type | Purpose |
|------|---------|
| `feat` | New feature or user-facing behavior |
| `fix` | Bug fix |
| `chore` | Tooling, deps, CI, maintenance |
| `docs` | Documentation only |
| `refactor` | Code restructure, same behavior |

**Base branch for PRs:** `master`

**Examples:** `feat/premium-dashboard-ui`, `fix/due-today-layout`, `docs/agent-standards`

Read the full workflow (commit format, PR template, checklist) in [.cursor/skills/git-workflow/SKILL.md](.cursor/skills/git-workflow/SKILL.md).

## Repo layout

```
apps/desktop/     # Main SPA (dashboard, marketing, mobisite frame)
apps/mobisite/    # Mobile capture app (mounted at /mobisite)
packages/shared/  # Firebase, types, hooks, utilities
packages/ui/      # Shared UI placeholder
docs/             # Project documentation
.cursor/skills/   # Agent skills (project-specific)
```

## Key rules

- Only commit when the user explicitly asks
- Do not force-push `master`
- Use `gh` for GitHub (PRs, issues, checks)
- Run `npm test` before opening PRs when code changed
- Desktop UI: marketing-style tokens in `apps/desktop/src/styles/marketingStyles.ts`
- Mobile: authenticated users on viewports `<768px` redirect to `/mobisite`

## Testing

```bash
npm test
cd apps/desktop && npx tsc -p tsconfig.app.json
```

See [docs/TESTING.md](docs/TESTING.md) for manual regression checklist.
