import { formatCurrency } from '../formatCurrency';

describe('formatCurrency - ZAR', () => {
	it('should format positive amounts in ZAR', () => {
		expect(formatCurrency(100)).toBe('R\u00A0100,00');
		expect(formatCurrency(1234.56)).toBe('R\u00A01\u00A0234,56');
		expect(formatCurrency(1000000)).toBe('R\u00A01\u00A0000\u00A0000,00');
	});

	it('should format negative amounts in ZAR', () => {
		expect(formatCurrency(-100)).toBe('-R\u00A0100,00');
		expect(formatCurrency(-1234.56)).toBe('-R\u00A01\u00A0234,56');
		expect(formatCurrency(-1000000)).toBe('-R\u00A01\u00A0000\u00A0000,00');
	});

	it('should format zero amounts in ZAR', () => {
		expect(formatCurrency(0)).toBe('R\u00A00,00');
		expect(formatCurrency(-0)).toBe('R\u00A00,00');
	});

	it('should handle string inputs', () => {
		expect(formatCurrency('100')).toBe('R\u00A0100,00');
		expect(formatCurrency('1234.56')).toBe('R\u00A01\u00A0234,56');
		expect(formatCurrency('-100')).toBe('-R\u00A0100,00');
	});

	it('should handle invalid inputs', () => {
		expect(formatCurrency(NaN)).toBe('R0.00');
		expect(formatCurrency(Infinity)).toBe('R0.00');
		expect(formatCurrency(-Infinity)).toBe('R0.00');
		expect(formatCurrency('invalid')).toBe('R0.00');
	});

	it('should handle decimal precision', () => {
		expect(formatCurrency(100.1)).toBe('R\u00A0100,10');
		expect(formatCurrency(100.99)).toBe('R\u00A0100,99');
		expect(formatCurrency(100.999)).toBe('R\u00A0101,00'); // Rounds up
	});

	it('should format large numbers with proper grouping', () => {
		expect(formatCurrency(1234567.89)).toBe('R\u00A01\u00A0234\u00A0567,89');
		expect(formatCurrency(999999999.99)).toBe('R\u00A0999\u00A0999\u00A0999,99');
	});

	it('should handle very small amounts', () => {
		expect(formatCurrency(0.01)).toBe('R\u00A00,01');
		expect(formatCurrency(0.99)).toBe('R\u00A00,99');
	});
});
