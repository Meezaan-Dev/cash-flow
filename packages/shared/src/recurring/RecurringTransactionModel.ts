export interface RecurringTransaction {
	id?: string;
	userId?: string;
	accountId?: string;
	title: string;
	amount: number;
	type?: 'income' | 'expense';
	category: string;
	subcategory?: string;
	description?: string;
	mode?: 'template' | 'scheduled';
	frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
	expectedDate?: number;
	displayOrder?: number;
	createdAt?: Date | { toDate: () => Date };
}

type RecurringDoc = {
	id?: string;
	userId?: string;
	accountId?: string;
	title?: string;
	amount?: number;
	type?: string;
	category?: string;
	subcategory?: string;
	description?: string;
	mode?: string;
	frequency?: string;
	expectedDate?: unknown;
	displayOrder?: unknown;
	createdAt?: unknown;
};

const normalizeExpectedDate = (value: unknown): number | undefined => {
	if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31) {
		return value;
	}

	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10);
		if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 31) {
			return parsed;
		}
	}

	return undefined;
};

export const normalizeRecurringTransaction = (doc: RecurringDoc): RecurringTransaction => {
	const recurringTransaction: RecurringTransaction = {
		id: doc.id,
		userId: doc.userId,
		accountId: doc.accountId,
		title: doc.title ?? '',
		amount: doc.amount ?? 0,
		type: (doc.type as RecurringTransaction['type']) ?? 'expense',
		category: doc.category ?? '',
		subcategory: doc.subcategory || undefined,
		description: doc.description,
		mode:
			doc.mode === 'scheduled' || doc.mode === 'template'
				? doc.mode
				: normalizeExpectedDate(doc.expectedDate)
					? 'scheduled'
					: 'template',
		frequency: doc.frequency as RecurringTransaction['frequency'],
		expectedDate: normalizeExpectedDate(doc.expectedDate),
		displayOrder:
			typeof doc.displayOrder === 'number' && Number.isInteger(doc.displayOrder) && doc.displayOrder >= 0
				? doc.displayOrder
				: undefined,
	};

	if (doc.createdAt) {
		if (typeof doc.createdAt === 'object' && 'toDate' in doc.createdAt) {
			recurringTransaction.createdAt = (doc.createdAt as { toDate: () => Date }).toDate();
		} else if (doc.createdAt instanceof Date) {
			recurringTransaction.createdAt = doc.createdAt;
		} else {
			recurringTransaction.createdAt = new Date(doc.createdAt as string | number);
		}
	}

	return recurringTransaction;
};

export const normalizeRecurringTransactions = (docs: RecurringDoc[]): RecurringTransaction[] =>
	docs.map(normalizeRecurringTransaction);

export const validateRecurringTransaction = (transaction: Partial<RecurringTransaction>): string[] => {
	const errors: string[] = [];

	if (!transaction.title || transaction.title.trim() === '') {
		errors.push('Title is required');
	}

	if (
		transaction.amount === undefined ||
		transaction.amount === null ||
		!Number.isFinite(transaction.amount) ||
		transaction.amount <= 0
	) {
		errors.push('Amount must be greater than 0');
	}

	if (!transaction.category || transaction.category.trim() === '') {
		errors.push('Category is required');
	}

	if (
		transaction.mode &&
		!['template', 'scheduled'].includes(transaction.mode)
	) {
		errors.push('Mode must be template or scheduled');
	}

	if (
		transaction.frequency &&
		!['daily', 'weekly', 'monthly', 'yearly'].includes(transaction.frequency)
	) {
		errors.push('Frequency must be daily, weekly, monthly, or yearly');
	}

	if (transaction.mode === 'scheduled' && transaction.expectedDate === undefined) {
		errors.push('Monthly reminders need an expected day');
	}
	if (transaction.mode === 'scheduled' && transaction.frequency !== 'monthly') {
		errors.push('Scheduled reminders must be monthly');
	}
	if (
		transaction.mode === 'template' &&
		(transaction.frequency !== undefined || transaction.expectedDate !== undefined)
	) {
		errors.push('Template-only items cannot have a schedule');
	}

	if (
		transaction.expectedDate !== undefined &&
		(!Number.isInteger(transaction.expectedDate) ||
			transaction.expectedDate < 1 ||
			transaction.expectedDate > 31)
	) {
		errors.push('Expected date must be a day between 1 and 31');
	}

	return errors;
};
