# Import Ordering Guidelines

To maintain consistency and readability in your codebase, follow these guidelines for ordering imports:

## 1. **External Libraries**

Import all third-party libraries and packages first.

- **React and React hooks** should come at the very top.
- **Other external libraries** (e.g., icon libraries, UI frameworks) follow.

```js
import React, { useState, useMemo } from 'react';
import { FiDollarSign, FiPieChart, FiPlusCircle } from 'react-icons/fi';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button,
	Alert,
	Snackbar,
} from '@mui/material';
```

## 2. **Internal Imports**

After external libraries, import your internal modules:

- **Hooks** (e.g., custom hooks)
- **Types** (e.g., TypeScript types)
- **Components** (e.g., UI components)

```js
import { useTransactions } from '../hooks/useTransactions';
import { Transaction, ViewType } from '../types';
import PieChart from '../components/PieChart';
import Sidebar from '../components/Sidebar';
import ThemeDropdown from '../components/ThemeDropdown';
import TransactionForm from '../components/TransactionForm';
import TransactionsTable from '../components/TransactionsTable';
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
