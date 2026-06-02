export const getRecurringFrequencyLabel = (frequency?: string): string => {
	switch (frequency) {
		case 'daily':
			return 'Daily';
		case 'weekly':
			return 'Weekly';
		case 'monthly':
			return 'Monthly';
		case 'yearly':
			return 'Yearly';
		default:
			return 'Monthly';
	}
};

export const getRecurringExpectedDateLabel = (expectedDate?: number): string => {
	if (!expectedDate) return 'Unscheduled';
	return `Day ${expectedDate}`;
};
