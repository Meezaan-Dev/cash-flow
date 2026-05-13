import { ImportResult, SerializableTransaction, Transaction } from '../types';
import { parseDbDateOrNull } from './date';

const REQUIRED_FIELDS = ['title', 'amount', 'type', 'category'] as const;

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
	if ('category' in row && typeof row.category === 'string' && !row.category.trim()) {
		errors.push(`Row ${rowIndex}: Missing category`);
	}
	const amountNum = Number(row.amount);
	if (!isFinite(amountNum)) {
		errors.push(`Row ${rowIndex}: Invalid amount`);
	}
	if (row.type !== 'income' && row.type !== 'expense') {
		errors.push(`Row ${rowIndex}: Invalid type (transfers cannot be imported)`);
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
				title: String(row.title),
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
		const str = String(value).replace(/"/g, '""');
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
