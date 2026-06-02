import React, { createContext, useContext, ReactNode } from 'react';
import { useTransactionsController } from '@/domains/transactions/controllers/TransactionsController';
import { useRecurringTransactionsController } from '@/domains/recurring/controllers/RecurringTransactionsController';
import { Transaction } from '@/domains/transactions/models/TransactionModel';
import { RecurringTransaction } from '@/domains/recurring/models/RecurringTransactionModel';
import { TransactionType } from '@/types';

interface AddTransactionData {
type: 'income' | 'expense';
accountId: string;
title: string;
category: string;
subcategory?: string;
description?: string;
amount: number;
date?: Date;
recurringTransactionId?: string;
recurringOccurrenceDate?: string;
}

interface AddTransferData {
fromAccountId: string;
toAccountId: string;
amount: number;
title: string;
description?: string;
date?: Date;
}

interface TransactionsContextValue {
transactions: Transaction[];
loading: boolean;
addTransaction: (data: AddTransactionData) => Promise<void>;
addTransfer: (data: AddTransferData) => Promise<void>;
updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
bulkUpdateTransactionCategories: (
ids: string[],
category: string,
subcategory?: string
) => Promise<void>;
deleteTransaction: (id: string) => Promise<void>;
deleteAllTransactions: () => Promise<void>;
getExpenses: () => Transaction[];
getIncome: () => Transaction[];
getTransfers: () => Transaction[];
getByCategory: (category: string) => Transaction[];
getByType: (type: TransactionType) => Transaction[];
getByAccount: (accountId: string) => Transaction[];
getAll: () => Transaction[];
getUniqueCategories: () => string[];
calculateTotals: () => {
totalAmount: number;
totalIncome: number;
totalExpense: number;
};
groupByCategory: () => Record<string, Transaction[]>;
sortByDateDesc: () => Transaction[];
recurringTransactions: RecurringTransaction[];
recurringTransactionsLoading: boolean;
addRecurringTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
deleteRecurringTransaction: (id: string) => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
const transactionsController = useTransactionsController();
const recurringTransactionsController = useRecurringTransactionsController();

return (
<TransactionsContext.Provider
value={{
...transactionsController,
...recurringTransactionsController,
recurringTransactionsLoading: recurringTransactionsController.loading,
}}
>
{children}
</TransactionsContext.Provider>
);
};

export const useTransactionsContext = (): TransactionsContextValue => {
const context = useContext(TransactionsContext);
if (!context) {
throw new Error('useTransactionsContext must be used within a TransactionsProvider');
}
return context;
};
