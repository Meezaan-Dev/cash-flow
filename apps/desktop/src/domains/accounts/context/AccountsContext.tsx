import React, { createContext, useContext, ReactNode } from 'react';
import { useAccountsController } from '@/domains/accounts/controllers/AccountsController';
import { Account, AccountType, NetWorthData } from '@/types';

interface AccountsContextValue {
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

const AccountsContext = createContext<AccountsContextValue | undefined>(undefined);

export const AccountsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const controller = useAccountsController();

	return (
		<AccountsContext.Provider value={controller}>
			{children}
		</AccountsContext.Provider>
	);
};

export const useAccountsContext = (): AccountsContextValue => {
	const context = useContext(AccountsContext);
	if (!context) {
		throw new Error('useAccountsContext must be used within an AccountsProvider');
	}
	return context;
};
