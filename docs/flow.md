# Cash Flow App - Data Structure and Flow

This document describes the current app data model, Firestore layout, and frontend data flow. Cash Flow is one deployed SPA: `apps/desktop` owns routing and imports the small `apps/mobisite` capture experience at `/mobisite`.

## 1. Data Structures

**Account**

- `id?: string`
- `userId?: string`
- `name: string`
- `bank?: string`
- `type: 'debit' | 'credit' | 'savings' | 'cash'`
- `currency?: string`
- `balance: number`
- `creditLimit?: number`
- `color?: string`
- `icon?: string`
- `createdAt?: Date | { toDate: () => Date }`
- `updatedAt?: Date | { toDate: () => Date }`

Credit accounts use signed balances. Negative credit balances count as liabilities; available balance can include configured credit limits.

**Transaction**

- `id?: string`
- `userId?: string`
- `accountId: string`
- `title: string`
- `amount: number`
- `type: 'income' | 'expense' | 'transfer'`
- `category: string`
- `subcategory?: string`
- `description?: string`
- `date?: Date | { toDate: () => Date }`
- `createdAt?: Date | { toDate: () => Date }`
- `updatedAt?: Date | { toDate: () => Date }`
- `transferAccountId?: string`
- `transferId?: string`
- `transferDirection?: 'out' | 'in'`
- `recurringTransactionId?: string`
- `recurringOccurrenceDate?: string`

Transfers are represented as two linked transaction documents with shared `transferId`, opposite `transferDirection`, category `transfer`, and balance updates on both accounts.

**Budget**

- `id: string`
- `userId: string`
- `accountId?: string`
- `categoryId: string`
- `subCategoryId?: string`
- `amount: number`
- `period: 'monthly' | 'custom'`
- `month?: string`
- `cycleDay?: number`
- `startDay?: number`
- `endDay?: number`
- `startDate: string`
- `endDate: string`
- `lifecycleStatus: 'draft' | 'published'`
- `displayOrder?: number`
- `createdAt?: Date | { toDate: () => Date }`
- `updatedAt?: Date | { toDate: () => Date }`

Users can create up to eight budgets. New budgets begin as drafts, published budgets track matching expenses, completed periods can be repeated into a new draft, and ordering is persisted.

**Category**

- `id: string`
- `value: string`
- `label: string`
- `subcategories: Array<{ value: string; label: string }>`
- `createdAt?: Date | { toDate: () => Date }`
- `updatedAt?: Date | { toDate: () => Date }`

Categories live per user. Renames update related transactions, recurring templates, and budgets in a batch when needed. Categories or subcategories that are still in use cannot be deleted.

**RecurringTransaction**

- `id?: string`
- `userId?: string`
- `accountId?: string`
- `title: string`
- `amount: number`
- `type?: 'income' | 'expense'`
- `category: string`
- `subcategory?: string`
- `description?: string`
- `frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'`
- `expectedDate?: number`
- `createdAt?: Date | { toDate: () => Date }`
- `updatedAt?: Date | { toDate: () => Date }`

**RandomNote**

- `id: string`
- `userId: string`
- `content: string`
- `createdAt?: Date | { toDate: () => Date }`
- `updatedAt?: Date | { toDate: () => Date }`

Random notes are private user-scoped notes with markdown preview support and a small fixed note cap.

## 2. Firestore Structure

All active app data is scoped under the authenticated user:

```text
users/{userId}/
  accounts/{accountId}
  transactions/{transactionId}
  budgets/{budgetId}
  categories/{categoryId}
  recurringTransactions/{id}
  random/{noteId}
```

Legacy top-level `transactions` and `recurringExpenses` collections are retained as read-only migration compatibility paths.

Firestore rules validate ownership, required fields, amount limits, known enum values, timestamp shape, allowed keys, transfer metadata, budget lifecycle fields, category shape, and random note length.

## 3. Architecture

The app uses an app-flow structure with route screens, domain modules, and shared packages:

| Area | Responsibilities |
|---|---|
| `apps/desktop/src/app/` | Host shell concerns such as protected routes, theme, and privacy mode |
| `apps/desktop/src/pages/` | Route-level screens for dashboard, accounts, marketing, and mobisite framing |
| `apps/desktop/src/domains/` | Desktop domain logic, views, hooks, models, controllers, and contexts |
| `apps/desktop/src/shared/` | App-local shared logic such as filter preferences |
| `apps/mobisite/src/` | Phone-first transaction capture experience mounted at `/mobisite` |
| `packages/shared/src/` | Firebase services, shared models, hooks, types, and utilities used across app shells |
| `packages/ui/src/` | Placeholder for primitives that are genuinely reused across apps |

Provider nesting in `apps/desktop/src/App.tsx`:

```text
ThemeProvider
  Router
    ProtectedRoute
      FilterPreferencesProvider
        CategoriesProvider
          TransactionsProvider
            AccountsProvider
              BudgetsProvider
                Dashboard routes
```

`/mobisite` is protected separately and uses shared hooks directly instead of the desktop dashboard provider stack.

## 4. Data Flow

### Adding A Transaction

```text
TransactionForm or mobisite form
  -> TransactionsContext.addTransaction(...) or useTransactions.addTransaction(...)
  -> Firestore writeBatch:
       create users/{uid}/transactions/{id}
       increment the selected account balance
  -> onSnapshot updates subscribed views
```

Income increments the account balance. Expenses decrement it. Transaction creation requires an existing account and category.

### Adding Or Deleting A Transfer

```text
TransferForm
  -> useTransactions.addTransfer(...)
  -> Firestore writeBatch:
       create linked transfer-out transaction
       create linked transfer-in transaction
       decrement source account
       increment destination account
```

Deleting either side of a transfer deletes the linked pair and reverses both account balance updates.

### Budget Progress

```text
BudgetsList
  -> BudgetsController.getAllBudgetProgress(transactions)
  -> BudgetModel.calculateBudgetProgress(...)
```

Budget matching uses expense transactions, date range or rolling cycle, category, optional subcategory, and optional account scope. Reordering writes a complete display order in one Firestore batch.

### Categories And Filters

Settings manages categories, subcategories, filter visibility, and report preferences. Category path values are reused by transactions, recurring templates, budgets, filters, reports, and import/export.

### Recurring Templates And Quick Fill

Recurring templates are stored in `users/{uid}/recurringTransactions`. Desktop and mobisite forms can fill title, amount, type, category, subcategory, and account from a selected template.

Dashboard due/upcoming recurring prompts are derived from templates and existing transactions. Confirmed occurrences store `recurringTransactionId` and `recurringOccurrenceDate`; there is no separate draft collection.

### Main Account Preference

The main account preference is stored locally through `packages/shared/src/accounts/mainAccountPreference.ts`. Desktop transaction creation and mobisite transaction creation default to that account when it still exists.

### AI Assistant

The assistant calls the `/askAI` Cloud Function with the authenticated user's question, recent local chat history, and user id. The function verifies the Firebase token, loads up to 2000 user transactions plus accounts, and sends only that scoped data to Gemini.

### Privacy Mode

Privacy mode is a client-side display state that masks sensitive values in supported dashboard surfaces. It can be toggled from the dashboard control or keyboard shortcuts.

## 5. Balance Rules

| Operation | Balance effect |
|---|---|
| Add income | `account.balance += amount` |
| Add expense | `account.balance -= amount` |
| Add transfer | `from.balance -= amount`, `to.balance += amount` |
| Delete income | `account.balance -= amount` |
| Delete expense | `account.balance += amount` |
| Delete transfer pair | Reverse both linked transfer balance updates |
| Reconcile | Create an income or expense adjustment transaction |

All transaction balance writes use Firestore `writeBatch` and `increment()` so account totals do not depend on read-modify-write races.
