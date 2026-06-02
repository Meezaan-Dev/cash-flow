import { useAccounts } from '@/domains/accounts/hooks/useAccounts';
import { Account, AccountType, NetWorthData } from '@/types';
import {
	calculateAvailableBalance,
	calculateNetWorth,
} from '@/domains/accounts/models/AccountModel';

interface AccountsControllerReturn {
	accounts: Account[];
	loading: boolean;
	addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
	updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
	deleteAccount: (id: string) => Promise<void>;
	updateBalance: (accountId: string, delta: number) => Promise<void>;
	getAccountById: (id: string) => Account | undefined;
	getAccountsByType: (type: AccountType) => Account[];
	calculateTotalBalance: () => number;
	calculateAvailableBalance: () => number;
	calculateNetWorth: () => NetWorthData;
}

export const useAccountsController = (): AccountsControllerReturn => {
	const { accounts, addAccount, updateAccount, deleteAccount, updateBalance, loading } =
		useAccounts();

	return {
		accounts,
		loading,
		addAccount,
		updateAccount,
		deleteAccount,
		updateBalance,
		getAccountById: (id) => accounts.find((a) => a.id === id),
		getAccountsByType: (type) => accounts.filter((a) => a.type === type),
		calculateTotalBalance: () =>
			accounts.reduce((sum, a) => sum + a.balance, 0),
		calculateAvailableBalance: () => calculateAvailableBalance(accounts),
		calculateNetWorth: () => calculateNetWorth(accounts),
	};
};
