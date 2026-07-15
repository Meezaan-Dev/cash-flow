import { ImportResult, SerializableTransaction, Transaction } from '@/types';
import { parseDbDateOrNull } from '@cash-flow/shared/utils/date';

export type TransactionExportType = 'overall' | 'income' | 'expense';

export interface TransactionExportFilters {
	accountIds: string[];
	categories: string[];
	type: TransactionExportType;
	startDate?: string;
	endDate?: string;
}

const toLocalDateKey = (transaction: Transaction): string | null => {
	const date = parseDbDateOrNull(transaction.date) ?? parseDbDateOrNull(transaction.createdAt);
	if (!date) return null;
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, '0'),
		String(date.getDate()).padStart(2, '0'),
	].join('-');
};

export const filterTransactionsForExport = (
	transactions: Transaction[],
	filters: TransactionExportFilters
): Transaction[] => {
	if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return [];
	const accountIds = new Set(filters.accountIds);
	const categories = new Set(filters.categories);

	return transactions.filter((transaction) => {
		if (accountIds.size > 0 && !accountIds.has(transaction.accountId)) return false;
		if (categories.size > 0 && !categories.has(transaction.category)) return false;
		if (filters.type !== 'overall' && transaction.type !== filters.type) return false;
		if (filters.startDate || filters.endDate) {
			const dateKey = toLocalDateKey(transaction);
			if (!dateKey) return false;
			if (filters.startDate && dateKey < filters.startDate) return false;
			if (filters.endDate && dateKey > filters.endDate) return false;
		}
		return true;
	});
};

const REQUIRED_FIELDS = ['title', 'amount', 'type', 'category'] as const;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5_000;
const MAX_TITLE_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 2_000;

const normalizeIsoDate = (value: unknown): string => {
	const parsed = parseDbDateOrNull(value);
	return parsed ? parsed.toISOString() : '';
};

const normalizeIsoDateOnly = (value: unknown): string => {
	const iso = normalizeIsoDate(value);
	return iso ? iso.slice(0, 10) : '';
};

export const buildTransactionSignature = (transaction: Transaction): string => {
	return `${transaction.title}|${transaction.amount}|${transaction.type}|${transaction.category}|${transaction.subcategory ?? ''}|${normalizeIsoDateOnly(transaction.date)}`;
};

const parseCsv = (text: string): SerializableTransaction[] => {
	const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
	if (!headerLine) return [];

	const parseCSVValue = (cell: string) => cell.replace(/^"|"$/g, '').replace(/""/g, '"');
	const headers = (headerLine.match(/"(?:[^"]|"")*"|[^,]+/g) || []).map(parseCSVValue);

	return lines.map((line) => {
		const cells = line.match(/"(?:[^"]|"")*"|[^,]+/g) || [];
		const row: Record<string, string> = {};
		headers.forEach((h, i) => {
			row[h] = parseCSVValue(cells[i] ?? '');
		});
		return row as unknown as SerializableTransaction;
	});
};

const validateImportRow = (row: Record<string, unknown>, rowIndex: number): string[] => {
	const errors: string[] = [];
	const missing = REQUIRED_FIELDS.filter((key) => !(key in row) || row[key] === '');
	if (missing.length) {
		errors.push(`Row ${rowIndex}: Missing ${missing.join(', ')}`);
	}
	if (typeof row.title !== 'string' || !row.title.trim()) {
		errors.push(`Row ${rowIndex}: Missing title`);
	} else if (row.title.trim().length > MAX_TITLE_LENGTH) {
		errors.push(`Row ${rowIndex}: Title is too long`);
	}
	if ('category' in row && typeof row.category === 'string' && !row.category.trim()) {
		errors.push(`Row ${rowIndex}: Missing category`);
	} else if (typeof row.category !== 'string') {
		errors.push(`Row ${rowIndex}: Invalid category`);
	} else if (row.category.trim().length > MAX_CATEGORY_LENGTH) {
		errors.push(`Row ${rowIndex}: Category is too long`);
	}
	const amountNum = Number(row.amount);
	if (!Number.isFinite(amountNum) || amountNum <= 0) {
		errors.push(`Row ${rowIndex}: Amount must be greater than zero`);
	}
	if (row.type !== 'income' && row.type !== 'expense') {
		errors.push(`Row ${rowIndex}: Invalid type (transfers cannot be imported)`);
	}
	if (row.description != null && String(row.description).length > MAX_DESCRIPTION_LENGTH) {
		errors.push(`Row ${rowIndex}: Description is too long`);
	}
	return errors;
};

export const importTransactionsFromFile = async (
	file: File,
	existingTransactions: Transaction[],
	addTransaction: (data: { type: 'income' | 'expense'; accountId: string; title: string; category: string; subcategory?: string; description?: string; amount: number }) => Promise<void>,
	defaultAccountId: string = ''
): Promise<ImportResult> => {
	if (!defaultAccountId) {
		throw new Error('Create an account before importing transactions.');
	}
	if (typeof file.size === 'number' && file.size > MAX_IMPORT_BYTES) {
		throw new Error('Import file must be 5 MB or smaller.');
	}

	const text = await file.text();
	let records: SerializableTransaction[] = [];

	if (file.name.toLowerCase().endsWith('.json')) {
		try {
			records = JSON.parse(text);
		} catch {
			throw new Error('Invalid JSON file.');
		}
	} else if (file.name.toLowerCase().endsWith('.csv')) {
		records = parseCsv(text);
	} else {
		throw new Error('Unsupported file type. Use CSV or JSON.');
	}
	if (!Array.isArray(records)) {
		throw new Error('Import file must contain a list of transactions.');
	}
	if (records.length > MAX_IMPORT_ROWS) {
		throw new Error(`Import files can contain at most ${MAX_IMPORT_ROWS} transactions.`);
	}

	const existingSignatures = new Set(existingTransactions.map(buildTransactionSignature));
	let importedCount = 0;
	let skippedDuplicates = 0;
	const errors: string[] = [];

	for (const [index, record] of records.entries()) {
		const row =
			typeof record === 'object' && record
				? (record as unknown as Record<string, unknown>)
				: {};
		const rowNumber = index + 1;
		const rowErrors = validateImportRow(row, rowNumber);
		if (rowErrors.length) {
			errors.push(...rowErrors);
			continue;
		}

		const amountNum = Number(row.amount);
		const dateISO = row.date ? normalizeIsoDateOnly(row.date) : '';
		const normalizedSubcategory = row.subcategory ? String(row.subcategory).trim() : '';
		const signature = `${row.title}|${amountNum}|${row.type}|${row.category}|${normalizedSubcategory}|${dateISO}`;
		if (existingSignatures.has(signature)) {
			skippedDuplicates++;
			continue;
		}

		try {
			const resolvedAccountId = row.accountId
				? String(row.accountId)
				: defaultAccountId;
			await addTransaction({
				title: String(row.title).trim(),
				amount: amountNum,
				type: row.type as 'income' | 'expense',
				category: String(row.category).trim(),
				subcategory: normalizedSubcategory || undefined,
				description: row.description ? String(row.description) : '',
				accountId: resolvedAccountId,
			});
			importedCount++;
			existingSignatures.add(signature);
		} catch {
			errors.push(`Row ${rowNumber}: Failed to save`);
		}
	}

	return { importedCount, skippedDuplicates, errors };
};

export const exportTransactionsToCsv = (transactions: Transaction[]): string => {
	const headers = [
		'title',
		'amount',
		'type',
		'category',
		'subcategory',
		'description',
		'date',
		'createdAt',
		'id',
		'accountId',
	];
	const safe = (value: unknown) => {
		if (value == null) return '';
		const raw = String(value);
		const spreadsheetSafe =
			typeof value === 'string' && /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
		const str = spreadsheetSafe.replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = transactions.map((t) => {
		const date = normalizeIsoDate(t.date);
		const createdAt = normalizeIsoDate(t.createdAt);
		return [
			t.title,
			t.amount,
			t.type,
			t.category,
			t.subcategory ?? '',
			t.description ?? '',
			date,
			createdAt,
			t.id ?? '',
			t.accountId ?? '',
		]
			.map(safe)
			.join(',');
	});

	return [headers.join(','), ...rows].join('\n');
};

export const exportTransactionsToJson = (transactions: Transaction[]): string => {
	const normalized = transactions.map((t) => ({
		...t,
		date: t.date ? normalizeIsoDate(t.date) : undefined,
		createdAt: t.createdAt ? normalizeIsoDate(t.createdAt) : undefined,
	}));
	return JSON.stringify(normalized, null, 2);
};
