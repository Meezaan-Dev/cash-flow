import {
	buildWholeAppCsvFiles,
	buildWholeAppJson,
	type WholeAppExportData,
} from '../appDataExport';

const exportData: WholeAppExportData = {
	accounts: [
		{
			id: 'acc-1',
			userId: 'user-1',
			name: '=Main',
			type: 'debit',
			balance: 1200,
			createdAt: new Date('2026-09-20T10:00:00Z'),
		},
	],
	transactions: [
		{
			id: 'tx-1',
			userId: 'user-1',
			accountId: 'acc-1',
			title: 'Groceries',
			amount: 350,
			type: 'expense',
			category: 'food',
			date: new Date('2026-09-21T12:00:00Z'),
		},
	],
	budgets: [
		{
			id: 'budget-1',
			userId: 'user-1',
			categoryId: 'food',
			amount: 3000,
			period: 'monthly',
			startDate: '2026-09-01',
			endDate: '2026-09-30',
			lifecycleStatus: 'published',
			displayOrder: 0,
		},
	],
	categories: [
		{
			id: 'cat-1',
			value: 'food',
			label: 'Food',
			subcategories: [{ value: 'groceries', label: 'Groceries' }],
		},
	],
	recurringTransactions: [
		{
			id: 'recurring-1',
			userId: 'user-1',
			title: 'Rent',
			amount: 8000,
			category: 'home',
			frequency: 'monthly',
			expectedDate: 1,
		},
	],
	plannedExpenses: [
		{
			id: 'planned-1',
			userId: 'user-1',
			title: 'Shoes',
			amount: 900,
			category: 'personal',
			status: 'planned',
			priority: 'high',
			displayOrder: 0,
		},
	],
	paymentPlans: [
		{
			id: 'payment-1',
			userId: 'user-1',
			itemName: 'Laptop',
			originalTotal: 12000,
			basePaidAmount: 3000,
			status: 'active',
			linkedTransactionIds: ['tx-1'],
		},
	],
	randomNotes: [{ id: 'main', content: 'Remember this' }],
};

describe('appDataExport', () => {
	it('builds one structured JSON export for all datasets', () => {
		const file = buildWholeAppJson(exportData);
		const parsed = JSON.parse(file.content);

		expect(file.filename).toMatch(/^cash-flow-export-\d{4}-\d{2}-\d{2}\.json$/);
		expect(parsed.accounts).toHaveLength(1);
		expect(parsed.plannedExpenses[0]).toMatchObject({
			id: 'planned-1',
			displayOrder: 0,
		});
		expect(parsed.randomNotes[0].content).toBe('Remember this');
	});

	it('builds one spreadsheet-safe CSV file per dataset', () => {
		const files = buildWholeAppCsvFiles(exportData);

		expect(files.map((file) => file.filename)).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/^cash-flow-accounts-\d{4}-\d{2}-\d{2}\.csv$/),
				expect.stringMatching(/^cash-flow-planned-expenses-\d{4}-\d{2}-\d{2}\.csv$/),
				expect.stringMatching(/^cash-flow-random-notes-\d{4}-\d{2}-\d{2}\.csv$/),
			])
		);
		expect(files).toHaveLength(8);
		expect(files.find((file) => file.filename.includes('accounts'))?.content).toContain(
			"\"'=Main\""
		);
		expect(files.find((file) => file.filename.includes('accounts'))?.content).toContain(
			'id,userId,name'
		);
		expect(files.find((file) => file.filename.includes('transactions'))?.content).toContain(
			'id,userId,accountId'
		);
	});
});
