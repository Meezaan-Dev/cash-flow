export const parseDbDateOrNull = (dateInput: unknown): Date | null => {
	if (dateInput instanceof Date) return dateInput;

	if (
		typeof dateInput === 'object' &&
		dateInput !== null &&
		'toDate' in dateInput
	) {
		return (dateInput as { toDate: () => Date }).toDate();
	}

	if (typeof dateInput === 'string') {
		// Handle potential specific string formats if needed, matching current logic:
		const dateOnly = dateInput.split(' at ')[0];
		const parsed = new Date(dateOnly);
		if (!isNaN(parsed.getTime())) return parsed;
	}

	return null;
};

export const parseDbDate = (dateInput: unknown): Date => {
	return parseDbDateOrNull(dateInput) ?? new Date();
};

export const getTransactionDateOrEpoch = (
	dateInput: unknown,
	fallbackInput?: unknown
): Date => {
	return parseDbDateOrNull(dateInput) ?? parseDbDateOrNull(fallbackInput) ?? new Date(0);
};

export const compareTransactionsByDateDesc = <
	T extends { date?: unknown; createdAt?: unknown },
>(
	left: T,
	right: T
): number => {
	return (
		getTransactionDateOrEpoch(right.date, right.createdAt).getTime() -
		getTransactionDateOrEpoch(left.date, left.createdAt).getTime()
	);
};
