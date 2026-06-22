import { getAppErrorMessage } from '../errors';

describe('getAppErrorMessage', () => {
	it('turns Firebase codes into actionable messages', () => {
		expect(getAppErrorMessage(
			{ code: 'auth/invalid-credential', message: 'Firebase: Error' },
			{ operation: 'Sign in' }
		)).toMatch(/email or password is incorrect/i);
	});

	it('preserves specific domain errors', () => {
		expect(getAppErrorMessage(new Error('Selected account could not be found.'), {
			operation: 'Save transaction',
		})).toBe('Selected account could not be found.');
	});

	it('provides a concrete fallback for unknown values', () => {
		expect(getAppErrorMessage(null, { operation: 'Save transaction' }))
			.toMatch(/retry once/i);
	});
});
