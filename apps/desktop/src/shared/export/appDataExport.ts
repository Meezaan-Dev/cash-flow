import type {
	Account,
	Budget,
	CategoryDefinition,
	Transaction,
} from '@/types';
import type {
	PaymentPlan,
	PlannedExpense,
} from '@cash-flow/shared/planning/PlanningModel';
import type { RecurringTransaction } from '@cash-flow/shared';
import type { RandomNote } from '@/domains/random/hooks/useRandomNote';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';

export type ExportFormat = 'csv' | 'json';

export interface WholeAppExportData {
	accounts: Account[];
	transactions: Transaction[];
	budgets: Budget[];
	categories: CategoryDefinition[];
	recurringTransactions: RecurringTransaction[];
	plannedExpenses: PlannedExpense[];
	paymentPlans: PaymentPlan[];
	randomNotes: RandomNote[];
}

export interface ExportFile {
	filename: string;
	content: string;
	mimeType: string;
}

const EXPORT_PREFIX = 'cash-flow';

const dateSuffix = () => new Date().toISOString().slice(0, 10);

const normalizeDate = (value: unknown): string | undefined => {
	if (
		!(value instanceof Date) &&
		!(typeof value === 'object' && value !== null && 'toDate' in value)
	) {
		return undefined;
	}
	const parsed = parseDbDateOrNull(value);
	return parsed ? parsed.toISOString() : undefined;
};

const normalizeValue = (value: unknown): unknown => {
	if (value == null) return undefined;
	const parsedDate = normalizeDate(value);
	if (parsedDate) return parsedDate;
	if (Array.isArray(value)) return value.map(normalizeValue);
	if (typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.map(([key, entry]) => [key, normalizeValue(entry)])
				.filter(([, entry]) => entry !== undefined)
		);
	}
	return value;
};

export const buildWholeAppJson = (data: WholeAppExportData): ExportFile => ({
	filename: `${EXPORT_PREFIX}-export-${dateSuffix()}.json`,
	content: JSON.stringify(normalizeValue(data), null, 2),
	mimeType: 'application/json;charset=utf-8',
});

const safeCsvCell = (value: unknown): string => {
	if (value == null) return '';
	const raw = Array.isArray(value) ? value.join('; ') : String(value);
	const spreadsheetSafe = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
	return `"${spreadsheetSafe.replace(/"/g, '""')}"`;
};

const buildCsv = <T extends Record<string, unknown>>(
	headers: string[],
	rows: T[]
): string =>
	[
		headers.join(','),
		...rows.map((row) => headers.map((header) => safeCsvCell(row[header])).join(',')),
	].join('\n');

const asRecord = (value: unknown): Record<string, unknown> =>
	(normalizeValue(value) ?? {}) as Record<string, unknown>;

const file = (name: string, content: string): ExportFile => ({
	filename: `${EXPORT_PREFIX}-${name}-${dateSuffix()}.csv`,
	content,
	mimeType: 'text/csv;charset=utf-8',
});

export const buildWholeAppCsvFiles = (data: WholeAppExportData): ExportFile[] => [
	file(
		'accounts',
		buildCsv(
			[
				'id',
				'userId',
				'name',
				'bank',
				'type',
				'currency',
				'balance',
				'creditLimit',
				'color',
				'icon',
				'createdAt',
			],
			data.accounts.map(asRecord)
		)
	),
	file(
		'transactions',
		buildCsv(
			[
				'id',
				'userId',
				'accountId',
				'title',
				'amount',
				'type',
				'category',
				'subcategory',
				'description',
				'date',
				'createdAt',
				'transferAccountId',
				'transferId',
				'transferDirection',
				'recurringTransactionId',
				'recurringOccurrenceDate',
			],
			data.transactions.map(asRecord)
		)
	),
	file(
		'budgets',
		buildCsv(
			[
				'id',
				'userId',
				'accountId',
				'categoryId',
				'subCategoryId',
				'amount',
				'period',
				'month',
				'cycleDay',
				'startDay',
				'endDay',
				'startDate',
				'endDate',
				'lifecycleStatus',
				'displayOrder',
				'createdAt',
				'updatedAt',
			],
			data.budgets.map(asRecord)
		)
	),
	file(
		'categories',
		buildCsv(
			['id', 'value', 'label', 'subcategories', 'createdAt', 'updatedAt'],
			data.categories.map((category) => ({
				...asRecord(category),
				subcategories: category.subcategories
					.map((subcategory) => `${subcategory.value}:${subcategory.label}`)
					.join('; '),
			}))
		)
	),
	file(
		'recurring-transactions',
		buildCsv(
			[
				'id',
				'userId',
				'accountId',
				'title',
				'amount',
				'type',
				'category',
				'subcategory',
				'description',
				'frequency',
				'expectedDate',
				'createdAt',
			],
			data.recurringTransactions.map(asRecord)
		)
	),
	file(
		'planned-expenses',
		buildCsv(
			[
				'id',
				'userId',
				'title',
				'amount',
				'targetMonth',
				'expectedDate',
				'category',
				'subcategory',
				'accountId',
				'notes',
				'url',
				'priority',
				'status',
				'displayOrder',
				'transactionId',
				'createdAt',
				'updatedAt',
			],
			data.plannedExpenses.map(asRecord)
		)
	),
	file(
		'payment-plans',
		buildCsv(
			[
				'id',
				'userId',
				'itemName',
				'originalTotal',
				'basePaidAmount',
				'expectedPaymentAmount',
				'startDate',
				'expectedCompletionDate',
				'category',
				'url',
				'notes',
				'status',
				'linkedTransactionIds',
				'createdAt',
				'updatedAt',
			],
			data.paymentPlans.map(asRecord)
		)
	),
	file('random-notes', buildCsv(['id', 'content'], data.randomNotes.map(asRecord))),
];

export const buildWholeAppExportFiles = (
	format: ExportFormat,
	data: WholeAppExportData
): ExportFile[] => (format === 'json' ? [buildWholeAppJson(data)] : buildWholeAppCsvFiles(data));
