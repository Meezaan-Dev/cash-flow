import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import {
	Transaction,
	filterExpenses,
	filterIncome,
	filterTransfers,
	filterByCategory,
	filterByType,
	filterByAccount,
	getUniqueCategories,
	calculateTotals,
	groupByCategory,
	sortByDateDesc,
} from '@/features/transactions/models/TransactionModel';
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
}

interface AddTransferData {
	fromAccountId: string;
	toAccountId: string;
	amount: number;
	title: string;
	description?: string;
	date?: Date;
}

interface TransactionsControllerReturn {
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
	calculateTotals: () => { totalAmount: number; totalIncome: number; totalExpense: number };
	groupByCategory: () => Record<string, Transaction[]>;
	sortByDateDesc: () => Transaction[];
}

export const useTransactionsController = (): TransactionsControllerReturn => {
	const {
		transactions,
		addTransaction,
		addTransfer,
		updateTransaction,
		bulkUpdateTransactionCategories,
		deleteTransaction,
		deleteAllTransactions,
		loading,
	} = useTransactions();

	return {
		transactions,
		loading,
		addTransaction,
		addTransfer,
		updateTransaction,
		bulkUpdateTransactionCategories,
		deleteTransaction,
		deleteAllTransactions,
		getExpenses: () => filterExpenses(transactions),
		getIncome: () => filterIncome(transactions),
		getTransfers: () => filterTransfers(transactions),
		getByCategory: (category) => filterByCategory(transactions, category),
		getByType: (type) => filterByType(transactions, type),
		getByAccount: (accountId) => filterByAccount(transactions, accountId),
		getAll: () => transactions,
		getUniqueCategories: () => getUniqueCategories(transactions),
		calculateTotals: () => calculateTotals(transactions),
		groupByCategory: () => groupByCategory(transactions),
		sortByDateDesc: () => sortByDateDesc(transactions),
	};
};
