const MAX_MONEY_VALUE = 1_000_000_000_000;

export const TEXT_LIMITS = {
	accountName: 120,
	bankName: 120,
	title: 200,
	category: 80,
	subcategory: 80,
	description: 2_000,
	documentId: 1_500,
} as const;

export const normalizeRequiredText = (
	value: unknown,
	label: string,
	maxLength: number
): string => {
	if (typeof value !== 'string') {
		throw new Error(`${label} is required.`);
	}

	const normalized = value.trim();
	if (!normalized) {
		throw new Error(`${label} is required.`);
	}
	if (normalized.length > maxLength) {
		throw new Error(`${label} must be ${maxLength} characters or fewer.`);
	}
	return normalized;
};

export const normalizeOptionalText = (
	value: unknown,
	label: string,
	maxLength: number
): string | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') {
		throw new Error(`${label} must be text.`);
	}

	const normalized = value.trim();
	if (!normalized) return undefined;
	if (normalized.length > maxLength) {
		throw new Error(`${label} must be ${maxLength} characters or fewer.`);
	}
	return normalized;
};

export const assertFiniteMoney = (value: unknown, label: string): number => {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${label} must be a finite number.`);
	}
	if (Math.abs(value) > MAX_MONEY_VALUE) {
		throw new Error(`${label} is too large.`);
	}
	return value;
};

export const assertPositiveMoney = (value: unknown, label = 'Amount'): number => {
	const amount = assertFiniteMoney(value, label);
	if (amount <= 0) {
		throw new Error(`${label} must be greater than zero.`);
	}
	return amount;
};

export const assertValidDate = (value: unknown, label = 'Date'): Date | undefined => {
	if (value === undefined) return undefined;
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new Error(`${label} is invalid.`);
	}
	return value;
};
