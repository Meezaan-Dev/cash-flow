import { getBalanceAdjustment } from '../../utils/balanceAdjustment';

describe('getBalanceAdjustment', () => {
	it.each([
		[100, 125, 25, 'income'],
		[100, 80, -20, 'expense'],
		[-100, -80, 20, 'income'],
		[-100, -120, -20, 'expense'],
		[10.1, 10.12, 0.02, 'income'],
		[100, 100, 0, 'income'],
	])('derives the adjustment from %s to %s', (current, real, difference, type) => {
		expect(getBalanceAdjustment(current, real)).toEqual({
			difference,
			amount: Math.abs(difference),
			type,
		});
	});
});
