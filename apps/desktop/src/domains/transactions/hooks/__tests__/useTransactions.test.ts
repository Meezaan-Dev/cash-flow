import { act, renderHook, waitFor } from '@testing-library/react';
import { useTransactions } from '@cash-flow/shared/hooks/useTransactions';
import { auth } from '@cash-flow/shared/services/firebase';
import { apiService } from '@cash-flow/shared/services/api';

const mockUseAuthUser = jest.fn();

jest.mock('@cash-flow/shared/auth/AuthContext', () => ({
	useAuthUser: () => mockUseAuthUser(),
}));

jest.mock('@cash-flow/shared/services/firebase', () => ({
	auth: {
		currentUser: null,
		onAuthStateChanged: jest.fn(),
	},
	db: {},
}));

jest.mock('@cash-flow/shared/services/api', () => ({
	apiService: {
		addTransaction: jest.fn(),
		addTransfer: jest.fn(),
		updateTransaction: jest.fn(),
		deleteTransaction: jest.fn(),
		deleteAllTransactions: jest.fn(),
	},
}));

const mockAuth = auth as unknown as {
	currentUser: { uid: string } | null;
	onAuthStateChanged: jest.Mock;
};
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const mockBatch = {
	set: jest.fn(),
	update: jest.fn(),
	delete: jest.fn(),
	commit: jest.fn(),
};
const mockCollection = jest.fn((...path: unknown[]) => ({ type: 'collection', path }));
const mockDoc = jest.fn((...path: unknown[]) => ({
	type: 'doc',
	path,
	id: String(path.at(-1)),
}));
const mockOnSnapshot = jest.fn();
const mockWriteBatch = jest.fn();

jest.mock('firebase/firestore', () => ({
	collection: (...args: unknown[]) => mockCollection(...args),
	deleteField: jest.fn(() => '__delete_field__'),
	doc: (...args: unknown[]) => mockDoc(...args),
	onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
	query: jest.fn((collectionRef: unknown) => collectionRef),
	writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

const mockUser = { uid: 'user-1' };

describe('useTransactions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockBatch.set.mockReturnValue(undefined);
		mockBatch.update.mockReturnValue(undefined);
		mockBatch.delete.mockReturnValue(undefined);
		mockBatch.commit.mockResolvedValue(undefined);
		mockWriteBatch.mockReturnValue(mockBatch);
		mockApiService.addTransaction.mockResolvedValue('transaction-new');
		mockApiService.addTransfer.mockResolvedValue('transfer-new');
		mockApiService.updateTransaction.mockResolvedValue(undefined);
		mockApiService.deleteTransaction.mockResolvedValue(undefined);
		mockApiService.deleteAllTransactions.mockResolvedValue(undefined);
		mockUseAuthUser.mockReturnValue({ user: mockUser, authReady: true });
		mockOnSnapshot.mockImplementation(
			(_queryRef: unknown, next: (snapshot: unknown) => void) => {
				next({
					docs: [
						{
							id: 'transaction-1',
							data: () => ({
								accountId: 'account-1',
								title: 'Groceries',
								amount: 250,
								type: 'expense',
								category: 'food',
								subcategory: 'groceries',
							}),
						},
					],
				});
				return jest.fn();
			}
		);
		mockAuth.currentUser = mockUser;
		mockAuth.onAuthStateChanged.mockImplementation(
			(callback: (user: unknown) => void) => {
				callback(mockUser);
				return jest.fn();
			}
		);
	});

	it('loads and normalizes transaction subcategories from Firestore', async () => {
		const { result } = renderHook(() => useTransactions());

		await waitFor(() => {
			expect(result.current.transactions).toEqual([
				expect.objectContaining({
					id: 'transaction-1',
					category: 'food',
					subcategory: 'groceries',
				}),
			]);
		});
	});

	it('requires a category before adding income or expense transactions', async () => {
		const { result } = renderHook(() => useTransactions());

		await expect(
			result.current.addTransaction({
				type: 'expense',
				accountId: 'account-1',
				title: 'Lunch',
				category: '   ',
				amount: 120,
			})
		).rejects.toThrow('Category is required.');
		expect(mockApiService.addTransaction).not.toHaveBeenCalled();
	});

	it.each([0, -1, Number.NaN])('rejects invalid transaction amount %s', async (amount) => {
		const { result } = renderHook(() => useTransactions());

		await expect(
			result.current.addTransaction({
				type: 'expense',
				accountId: 'account-1',
				title: 'Lunch',
				category: 'food',
				amount,
			})
		).rejects.toThrow();
		expect(mockApiService.addTransaction).not.toHaveBeenCalled();
	});

	it('creates linked transfer records with stable identity and direction', async () => {
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.addTransfer({
				fromAccountId: 'account-1',
				toAccountId: 'account-2',
				title: 'Move savings',
				amount: 250,
			});
		});

		expect(mockApiService.addTransfer).toHaveBeenCalledWith({
			fromAccountId: 'account-1',
			toAccountId: 'account-2',
			title: 'Move savings',
			amount: 250,
		});
	});

	it('trims category and subcategory values when adding transactions', async () => {
		const { result } = renderHook(() => useTransactions());
		const date = new Date('2026-05-13T12:00:00Z');

		await act(async () => {
			await result.current.addTransaction({
				type: 'expense',
				accountId: 'account-1',
				title: 'Lunch',
				category: ' food ',
				subcategory: ' takeaways_eating_out ',
				amount: 120,
				date,
			});
		});

		expect(mockApiService.addTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				category: 'food',
				subcategory: 'takeaways_eating_out',
				date,
			})
		);
	});

	it('omits blank subcategory values when adding transactions', async () => {
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.addTransaction({
				type: 'expense',
				accountId: 'account-1',
				title: 'Groceries',
				category: 'food',
				subcategory: '   ',
				amount: 250,
			});
		});

		expect(mockApiService.addTransaction).toHaveBeenCalledWith(
			expect.not.objectContaining({
				subcategory: expect.anything(),
			})
		);
	});

	it('deletes subcategory when updating a transaction with a blank value', async () => {
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.updateTransaction('transaction-1', {
				category: 'food',
				subcategory: '',
			});
		});

		expect(mockApiService.updateTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'transaction-1',
				category: 'food',
				subcategory: '',
			})
		);
	});

	it('bulk updates selected transaction categories with trimmed path values', async () => {
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.bulkUpdateTransactionCategories(
				['transaction-1', 'transaction-2', 'transaction-1'],
				' food ',
				' groceries '
			);
		});

		expect(mockBatch.update).toHaveBeenCalledTimes(2);
		expect(mockBatch.update).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				path: expect.arrayContaining(['transactions', 'transaction-1']),
			}),
			{
				category: 'food',
				subcategory: 'groceries',
			}
		);
		expect(mockBatch.update).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				path: expect.arrayContaining(['transactions', 'transaction-2']),
			}),
			{
				category: 'food',
				subcategory: 'groceries',
			}
		);
		expect(mockBatch.commit).toHaveBeenCalledTimes(1);
	});

	it('deletes subcategory when bulk updating to a category-only option', async () => {
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.bulkUpdateTransactionCategories(['transaction-1'], 'food');
		});

		expect(mockBatch.update).toHaveBeenCalledWith(
			expect.anything(),
			{
				category: 'food',
				subcategory: '__delete_field__',
			}
		);
	});

	it('rejects empty category values before bulk updating', async () => {
		const { result } = renderHook(() => useTransactions());

		await expect(
			result.current.bulkUpdateTransactionCategories(['transaction-1'], '   ')
		).rejects.toThrow('Category is required.');
		expect(mockBatch.update).not.toHaveBeenCalled();
		expect(mockBatch.commit).not.toHaveBeenCalled();
	});

	it('rejects edits to transfer records', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		mockApiService.updateTransaction.mockRejectedValueOnce(
			new Error('Transfers cannot be edited. Delete and recreate the transfer instead.')
		);
		const { result } = renderHook(() => useTransactions());

		try {
			await expect(
				result.current.updateTransaction('transaction-1', { amount: 200 })
			).rejects.toThrow('Transfers cannot be edited');
			expect(mockApiService.updateTransaction).toHaveBeenCalledWith({
				id: 'transaction-1',
				amount: 200,
			});
		} finally {
			consoleSpy.mockRestore();
		}
	});

	it('deletes a transfer pair and reverses balances from either side', async () => {
		mockOnSnapshot.mockImplementation(
			(_queryRef: unknown, next: (snapshot: unknown) => void) => {
				next({
					docs: [
						{
							id: 'transfer-out',
							data: () => ({
								accountId: 'account-1',
								transferAccountId: 'account-2',
								transferId: 'pair-1',
								transferDirection: 'out',
								title: 'Move savings',
								amount: 250,
								type: 'transfer',
								category: 'transfer',
							}),
						},
						{
							id: 'transfer-in',
							data: () => ({
								accountId: 'account-2',
								transferAccountId: 'account-1',
								transferId: 'pair-1',
								transferDirection: 'in',
								title: 'Move savings',
								amount: 250,
								type: 'transfer',
								category: 'transfer',
							}),
						},
					],
				});
				return jest.fn();
			}
		);
		const { result } = renderHook(() => useTransactions());
		await waitFor(() => expect(result.current.transactions).toHaveLength(2));

		await act(async () => {
			await result.current.deleteTransaction('transfer-in');
		});

		expect(mockApiService.deleteTransaction).toHaveBeenCalledWith('transfer-in');
	});

	it('chunks deletion so each Firestore batch stays below its write limit', async () => {
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.deleteAllTransactions();
		});

		expect(mockApiService.deleteAllTransactions).toHaveBeenCalledTimes(1);
	});
});
