import { useRecurringTransactions } from '@/features/recurring/hooks/useRecurringTransactions';
import { RecurringTransaction } from '@/features/recurring/models/RecurringTransactionModel';

interface RecurringTransactionsControllerReturn {
// Data
recurringTransactions: RecurringTransaction[];
loading: boolean;

// CRUD operations
addRecurringTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
deleteRecurringTransaction: (id: string) => Promise<void>;
}

export const useRecurringTransactionsController = (): RecurringTransactionsControllerReturn => {
const {
recurringTransactions,
addRecurringTransaction,
updateRecurringTransaction,
deleteRecurringTransaction,
loading,
} = useRecurringTransactions();

return {
// Data
recurringTransactions,
loading,

// CRUD operations
addRecurringTransaction,
updateRecurringTransaction,
deleteRecurringTransaction,
};
};
