---
name: git-workflow
description: >-
  Branch naming, commit messages, and pull request creation for the cash-flow
  repo. Use when creating branches, commits, or PRs; when the user asks to
  open a pull request; or when an agent needs git conventions for this project.
---

# Git Workflow (cash-flow)

## Base branch

- **Default PR target:** `master`
- Never force-push to `master`
- Only create commits when the user explicitly asks

## Branch naming

Format:

```text
<type>/<short-kebab-description>
```

### Allowed types

| Type | Use when |
|------|----------|
| `feat` | New user-facing capability or meaningful UI/behavior addition |
| `fix` | Bug fix or regression repair |
| `chore` | Tooling, deps, CI, config, housekeeping (no user-facing behavior change) |
| `docs` | Documentation-only changes |
| `refactor` | Internal restructure with no intended behavior change |

### Rules

- Lowercase, kebab-case after the slash
- Short but specific (2–5 words)
- No ticket IDs unless the team already uses them consistently
- One logical change per branch

### Examples

```text
feat/premium-dashboard-ui
feat/mobisite-home-picker
fix/due-today-layout-overlap
fix/transaction-form-close
chore/upgrade-vite
docs/routes-and-agents
refactor/extract-marketing-primitives
```

### Choosing a type

- User-visible new behavior → `feat`
- Something broken → `fix`
- README, docs/, skill files, comments only → `docs`
- Move/rename/simplify code, same behavior → `refactor`
- package.json scripts, lint config, `.github/` → `chore`

## Commit messages

Prefer imperative, concise subject lines. Optional scope in parentheses.

```text
<type>(<scope>): <subject>

<optional body — why, not a file list>
```

Examples:

```text
feat(dashboard): redesign overview with marketing-style cards

fix(mobisite): show due-today section above widget grid

docs(agents): add git-workflow skill for branch and PR standards

refactor(accounts): extract Currency into marketing components

chore: align jest config with workspace packages
```

Pass the message via HEREDOC when committing:

```bash
git commit -m "$(cat <<'EOF'
feat(dashboard): add marketing card primitives

Introduce shared Currency and SectionHeader for consistent styling.
EOF
)"
```

## Pull request workflow

Use `gh` for all GitHub tasks. Before opening a PR:

1. `git status` — see untracked/modified files
2. `git diff` — review staged and unstaged changes
3. Confirm branch tracks remote and is up to date with `master`
4. `git log master...HEAD` and `git diff master...HEAD` — full PR scope
5. Run relevant tests (`npm test`; `tsc` for desktop if TS changed)

### Create branch and push

```bash
git checkout -b feat/short-description
# ... work, commit when user asks ...
git push -u origin HEAD
```

### PR title

Match the primary change type and scope:

```text
feat: premium dashboard marketing UI
fix: recurring due-today layout overlap
docs: agent git workflow standards
```

Title case or sentence case is fine; stay consistent within the PR.

### PR body template

```markdown
## Summary
- Bullet 1: what changed and why
- Bullet 2: another logical group of changes

## Test plan
- [ ] `npm test`
- [ ] Manual check: <specific route or flow>
- [ ] Light/dark mode (if UI)
```

Create with HEREDOC:

```bash
gh pr create --title "feat: short title" --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...

EOF
)"
```

Return the PR URL when done.

## Pre-PR checklist

- [ ] Branch name uses an allowed `type/` prefix
- [ ] Commits match the change (don't mix unrelated feat + fix)
- [ ] No secrets (`.env`, credentials) staged
- [ ] Tests pass for touched areas
- [ ] PR summary covers **all** commits on the branch, not only the latest
- [ ] PR targets `master` unless user specifies otherwise

## Repo context for agents

- **Monorepo:** `apps/desktop`, `apps/mobisite`, `packages/shared`, `packages/ui`
- **Desktop shell:** `apps/desktop/src/pages/dashboard/`, domain views under `apps/desktop/src/domains/`
- **Mobile:** `apps/mobisite/src/App.tsx` at `/mobisite`; mobile viewports redirect from dashboard routes
- **Shared logic:** `packages/shared/src/`
- **Docs:** start at `docs/PROJECT_CONTEXT.md`, routes in `docs/ROUTES.md`
- **UI standards:** marketing landing uses raw Tailwind `blue-600` / `gray-*`; app dashboard uses `apps/desktop/src/styles/marketingStyles.ts` and `apps/desktop/src/components/marketing/`

## Additional resources

- Extended examples: [reference.md](reference.md)
- App architecture: [docs/PROJECT_CONTEXT.md](../../../docs/PROJECT_CONTEXT.md)
- Routes: [docs/ROUTES.md](../../../docs/ROUTES.md)
