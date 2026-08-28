# Import Ordering Guidelines

To maintain consistency and readability in your codebase, follow these guidelines for ordering imports:

## 1. **External Libraries**

Import all third-party libraries and packages first.

- **React and React hooks** should come at the very top.
- **Other external libraries** (e.g., icon libraries, UI frameworks) follow.

```js
import React, { useState, useMemo } from 'react';
import { FiDollarSign, FiPieChart, FiPlusCircle } from 'react-icons/fi';
```

## 2. **Internal Imports**

After external libraries, import your internal modules:

- **Hooks** (e.g., custom hooks)
- **Types** (e.g., TypeScript types)
- **Components** (e.g., shared UI primitives and feature components)

```js
import { Button } from '@/components/app/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { Transaction, ViewType } from '@/types';
import PieChart from '@/domains/reports/components/PieChart';
import Sidebar from '@/pages/dashboard/components/Sidebar';
import ThemeDropdown from '@/app/theme/components/ThemeDropdown';
import TransactionForm from '@/domains/transactions/views/TransactionForm';
import TransactionsTable from '@/domains/transactions/views/TransactionsTable';
```

## 3. **Styles**

Import CSS or other style files last.

```js
import '../styles/Dashboard.css';
```

---

## **Summary**

1. **External libraries** (React, icons, UI frameworks)
2. **Internal modules** (hooks, types, components)
3. **Styles**

This order improves clarity and helps avoid circular dependencies.
