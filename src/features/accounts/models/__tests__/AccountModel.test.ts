import {
	calculateAvailableBalance,
	calculateNetWorth,
	getAccountAvailableBalance,
	getAccountLiability,
	normalizeAccount,
} from '../AccountModel';
import { Account } from '@/types';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
	id: 'account-1',
	name: 'Account',
	type: 'debit',
	balance: 0,
	...overrides,
});

describe('AccountModel', () => {
	it('defaults missing credit limits to zero when normalizing accounts', () => {
		const account = normalizeAccount({
			id: 'credit-account',
			name: 'Credit',
			type: 'credit',
			balance: 3500,
		});

		expect(account.creditLimit).toBe(0);
		expect(getAccountAvailableBalance(account)).toBe(3500);
	});

	it('adds a credit limit to a positive credit balance for available funds', () => {
		const account = makeAccount({
			type: 'credit',
			balance: 3500,
			creditLimit: 300,
		});

		expect(getAccountAvailableBalance(account)).toBe(3800);
		expect(getAccountLiability(account)).toBe(0);
	});

	it('treats only negative signed balances as liabilities', () => {
		const account = makeAccount({
			type: 'credit',
			balance: -100,
			creditLimit: 300,
		});

		expect(getAccountAvailableBalance(account)).toBe(200);
		expect(getAccountLiability(account)).toBe(100);
	});

	it('includes credit limits in available balance but excludes them from net worth', () => {
		const accounts = [
			makeAccount({ id: 'debit', balance: 1000 }),
			makeAccount({
				id: 'credit',
				type: 'credit',
				balance: 3500,
				creditLimit: 300,
			}),
			makeAccount({ id: 'negative-credit', type: 'credit', balance: -100 }),
		];

		expect(calculateAvailableBalance(accounts)).toBe(4700);
		expect(calculateNetWorth(accounts)).toEqual({
			assets: 4500,
			liabilities: 100,
			netWorth: 4400,
		});
	});
});
