import { act, renderHook, waitFor } from '@testing-library/react';
import { useTransactions } from '@cash-flow/shared/hooks/useTransactions';
import { auth } from '@cash-flow/shared/services/firebase';
import { runFinancialCommand } from '@cash-flow/shared/services/financialCommands';

jest.mock('@cash-flow/shared/services/firebase', () => ({
	auth: { currentUser: null, onAuthStateChanged: jest.fn() },
	db: {},
}));

jest.mock('@cash-flow/shared/services/financialCommands', () => ({
	runFinancialCommand: jest.fn(),
}));

const mockOnSnapshot = jest.fn();
jest.mock('firebase/firestore', () => ({
	collection: jest.fn((...path: unknown[]) => ({ path })),
	query: jest.fn((value: unknown) => value),
	onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

const mockAuth = auth as unknown as {
	currentUser: { uid: string } | null;
	onAuthStateChanged: jest.Mock;
};
const mockCommand = runFinancialCommand as jest.Mock;
const mockUser = { uid: 'user-1' };

describe('useTransactions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCommand.mockResolvedValue({ success: true });
		mockAuth.currentUser = mockUser;
		mockAuth.onAuthStateChanged.mockImplementation((callback) => {
			callback(mockUser);
			return jest.fn();
		});
		mockOnSnapshot.mockImplementation((_query, next) => {
			next({
				docs: [{
					id: 'transaction-1',
					data: () => ({
						accountId: 'account-1', title: 'Groceries', amount: 250,
						type: 'expense', category: 'food', subcategory: 'groceries',
					}),
				}],
			});
			return jest.fn();
		});
	});

	it('loads owner transactions through the direct read listener', async () => {
		const { result } = renderHook(() => useTransactions());
		await waitFor(() => expect(result.current.transactions[0]).toEqual(expect.objectContaining({
			id: 'transaction-1', subcategory: 'groceries',
		})));
	});

	it('validates and sends a create command', async () => {
		const { result } = renderHook(() => useTransactions());
		const date = new Date('2026-05-13T12:00:00Z');
		await act(() => result.current.addTransaction({
			type: 'expense', accountId: 'account-1', title: ' Lunch ', category: ' food ',
			subcategory: ' takeaway ', amount: 120, date,
		}));
		expect(mockCommand).toHaveBeenCalledWith('createTransaction', {
			accountId: 'account-1', title: 'Lunch', amount: 120, type: 'expense',
			category: 'food', subcategory: 'takeaway', date: date.toISOString(),
		});
	});

	it.each([0, -1, Number.NaN])('rejects invalid amount %s before calling the server', async (amount) => {
		const { result } = renderHook(() => useTransactions());
		await expect(result.current.addTransaction({
			type: 'expense', accountId: 'account-1', title: 'Lunch', category: 'food', amount,
		})).rejects.toThrow();
		expect(mockCommand).not.toHaveBeenCalled();
	});

	it('creates transfers through one atomic server command', async () => {
		const { result } = renderHook(() => useTransactions());
		await act(() => result.current.addTransfer({
			fromAccountId: 'account-1', toAccountId: 'account-2', title: 'Move savings', amount: 250,
		}));
		expect(mockCommand).toHaveBeenCalledWith('createTransfer', {
			fromAccountId: 'account-1', toAccountId: 'account-2', title: 'Move savings', amount: 250,
		});
	});

	it('sends null to remove optional fields during an update', async () => {
		const { result } = renderHook(() => useTransactions());
		await act(() => result.current.updateTransaction('transaction-1', { subcategory: '' }));
		expect(mockCommand).toHaveBeenCalledWith('updateTransaction', {
			transactionId: 'transaction-1', updates: { subcategory: null },
		});
	});

	it('deduplicates bulk category update IDs', async () => {
		const { result } = renderHook(() => useTransactions());
		await act(() => result.current.bulkUpdateTransactionCategories(
			['transaction-1', 'transaction-2', 'transaction-1'], ' food ', ' groceries '
		));
		expect(mockCommand).toHaveBeenCalledWith('bulkUpdateTransactionCategories', {
			transactionIds: ['transaction-1', 'transaction-2'], category: 'food', subcategory: 'groceries',
		});
	});

	it('routes deletion through the trusted command', async () => {
		const { result } = renderHook(() => useTransactions());
		await act(() => result.current.deleteTransaction('transaction-1'));
		expect(mockCommand).toHaveBeenCalledWith('deleteTransaction', { transactionId: 'transaction-1' });
	});

	it('routes delete-all through the trusted command', async () => {
		const { result } = renderHook(() => useTransactions());
		await act(() => result.current.deleteAllTransactions());
		expect(mockCommand).toHaveBeenCalledWith('deleteAllTransactions', {});
	});
});
