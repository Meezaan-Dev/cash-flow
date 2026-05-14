const CATEGORY_COLORS: Record<string, string> = {
	debit_order: '#FFBB28',
	entertainment: '#FF6B6B',
	food: '#A28DFF',
	other: '#FF8042',
	personal: '#00C49F',
	travel: '#0088FE',
	uncategorized: '#9CA3AF',
};

const DEFAULT_CATEGORY_COLOR = '#9CA3AF';
const DEFAULT_DARK_TEXT = '#111827';
const DEFAULT_LIGHT_TEXT = '#FFFFFF';

export const getCategoryColor = (category: string): string =>
	CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;

export const getContrastingTextColor = (backgroundColor: string): string => {
	const normalized = backgroundColor.replace('#', '');
	const hex =
		normalized.length === 3
			? normalized
					.split('')
					.map((char) => char + char)
					.join('')
			: normalized;

	if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return DEFAULT_DARK_TEXT;

	const red = Number.parseInt(hex.slice(0, 2), 16);
	const green = Number.parseInt(hex.slice(2, 4), 16);
	const blue = Number.parseInt(hex.slice(4, 6), 16);
	const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

	return luminance > 0.62 ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT;
};
