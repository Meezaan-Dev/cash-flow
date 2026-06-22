import {
	buildTransactionSignature,
	exportTransactionsToCsv,
	filterTransactionsForExport,
	importTransactionsFromFile,
} from '../transactionImportExport';
import { Transaction } from '@/types';

const createFile = (content: string, name: string, type: string) =>
	({
		name,
		type,
		text: jest.fn().mockResolvedValue(content),
	}) as unknown as File;

describe('transaction import/export', () => {
	it('includes subcategory in duplicate signatures', () => {
		const transaction: Transaction = {
			id: 'tx-1',
			accountId: 'account-1',
			title: 'Woolworths',
			amount: 200,
			type: 'expense',
			category: 'food',
			subcategory: 'groceries',
			date: new Date('2026-05-13T00:00:00.000Z'),
		};

		expect(buildTransactionSignature(transaction)).toBe(
			'Woolworths|200|expense|food|groceries|2026-05-13'
		);
	});

	it('imports optional subcategories when category is present', async () => {
		const file = createFile(
			JSON.stringify([
				{
					title: 'Lunch',
					amount: 120,
					type: 'expense',
					category: 'food',
					subcategory: 'takeaways_eating_out',
				},
			]),
			'transactions.json',
			'application/json'
		);
		const addTransaction = jest.fn().mockResolvedValue(undefined);

		const result = await importTransactionsFromFile(
			file,
			[],
			addTransaction,
			'account-1'
		);

		expect(result).toEqual({ importedCount: 1, skippedDuplicates: 0, errors: [] });
		expect(addTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				category: 'food',
				subcategory: 'takeaways_eating_out',
			})
		);
	});

	it('rejects imported rows with a blank category', async () => {
		const file = createFile(
			JSON.stringify([
				{
					title: 'Lunch',
					amount: 120,
					type: 'expense',
					category: '   ',
				},
			]),
			'transactions.json',
			'application/json'
		);

		const result = await importTransactionsFromFile(
			file,
			[],
			jest.fn().mockResolvedValue(undefined),
			'account-1'
		);

		expect(result.importedCount).toBe(0);
		expect(result.errors).toContain('Row 1: Missing category');
	});

	it.each([0, -10, Number.POSITIVE_INFINITY])(
		'rejects non-positive or non-finite imported amount %s',
		async (amount) => {
			const file = createFile(
				JSON.stringify([{ title: 'Bad amount', amount, type: 'expense', category: 'food' }]),
				'transactions.json',
				'application/json'
			);

			const result = await importTransactionsFromFile(
				file,
				[],
				jest.fn().mockResolvedValue(undefined),
				'account-1'
			);

			expect(result.importedCount).toBe(0);
			expect(result.errors).toContain('Row 1: Amount must be greater than zero');
		}
	);

	it('rejects JSON objects instead of transaction arrays', async () => {
		const file = createFile('{}', 'transactions.json', 'application/json');

		await expect(
			importTransactionsFromFile(file, [], jest.fn(), 'account-1')
		).rejects.toThrow('Import file must contain a list of transactions.');
	});

	it('exports subcategory in csv output', () => {
		const csv = exportTransactionsToCsv([
			{
				id: 'tx-1',
				accountId: 'account-1',
				title: 'Groceries',
				amount: 300,
				type: 'expense',
				category: 'food',
				subcategory: 'groceries',
			},
		]);

		expect(csv.split('\n')[0]).toContain('subcategory');
		expect(csv).toContain('"groceries"');
	});

	it('neutralizes spreadsheet formulas in user-controlled CSV fields', () => {
		const csv = exportTransactionsToCsv([
			{
				id: 'tx-1',
				accountId: 'account-1',
				title: '=HYPERLINK("https://example.invalid")',
				amount: 300,
				type: 'expense',
				category: '+SUM(A1:A2)',
			},
		]);

		expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
		expect(csv).toContain('"\'+SUM(A1:A2)"');
	});

	it('filters exports by multiple accounts and categories', () => {
		const transactions: Transaction[] = [
			{ id: '1', accountId: 'a', title: 'Food', amount: 10, type: 'expense', category: 'food' },
			{ id: '2', accountId: 'b', title: 'Fuel', amount: 20, type: 'expense', category: 'transport' },
			{ id: '3', accountId: 'c', title: 'Rent', amount: 30, type: 'expense', category: 'home' },
		];
		expect(filterTransactionsForExport(transactions, {
			accountIds: ['a', 'b'], categories: ['food', 'transport'], type: 'overall',
		})).toHaveLength(2);
	});

	it('includes transfers in overall and filters income or expenses exactly', () => {
		const transactions: Transaction[] = [
			{ accountId: 'a', title: 'Salary', amount: 100, type: 'income', category: 'income' },
			{ accountId: 'a', title: 'Lunch', amount: 10, type: 'expense', category: 'food' },
			{ accountId: 'a', title: 'Move', amount: 20, type: 'transfer', category: 'transfer' },
		];
		const base = { accountIds: [], categories: [] };
		expect(filterTransactionsForExport(transactions, { ...base, type: 'overall' })).toHaveLength(3);
		expect(filterTransactionsForExport(transactions, { ...base, type: 'income' })).toHaveLength(1);
		expect(filterTransactionsForExport(transactions, { ...base, type: 'expense' })).toHaveLength(1);
	});

	it('uses inclusive export date boundaries and rejects reversed ranges', () => {
		const transactions: Transaction[] = [
			{ accountId: 'a', title: 'Start', amount: 10, type: 'expense', category: 'food', date: new Date(2026, 5, 1) },
			{ accountId: 'a', title: 'End', amount: 10, type: 'expense', category: 'food', date: new Date(2026, 5, 30) },
		];
		const base = { accountIds: [], categories: [], type: 'overall' as const };
		expect(filterTransactionsForExport(transactions, { ...base, startDate: '2026-06-01', endDate: '2026-06-30' })).toHaveLength(2);
		expect(filterTransactionsForExport(transactions, { ...base, startDate: '2026-07-01', endDate: '2026-06-01' })).toEqual([]);
	});
});
