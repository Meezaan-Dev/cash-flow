const { test } = require('node:test');
const { rejects } = require('node:assert/strict');
const { addLedgerTransaction, addLedgerTransfer } = require('../lib/ledger');

test('addLedgerTransaction rejects missing categories before writing', async () => {
	await rejects(
		addLedgerTransaction('user-1', {
			type: 'expense',
			accountId: 'account-1',
			title: 'Lunch',
			category: '   ',
			amount: 120,
		}),
		/Category is required/
	);
});

test('addLedgerTransaction rejects invalid money before writing', async () => {
	await rejects(
		addLedgerTransaction('user-1', {
			type: 'income',
			accountId: 'account-1',
			title: 'Salary',
			category: 'salary',
			amount: 0,
		}),
		/Amount must be greater than zero/
	);
});

test('addLedgerTransfer rejects same-account transfers before writing', async () => {
	await rejects(
		addLedgerTransfer('user-1', {
			fromAccountId: 'account-1',
			toAccountId: 'account-1',
			title: 'Move money',
			amount: 50,
		}),
		/Source and destination accounts must be different/
	);
});
