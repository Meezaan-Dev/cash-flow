import { act, renderHook, waitFor } from '@testing-library/react';
import { useTransactions } from '@cash-flow/shared/hooks/useTransactions';
import { auth } from '@cash-flow/shared/services/firebase';

jest.mock('@cash-flow/shared/services/firebase', () => ({
	auth: {
		currentUser: null,
		onAuthStateChanged: jest.fn(),
	},
	db: {},
}));

const mockAuth = auth as unknown as {
	currentUser: { uid: string } | null;
	onAuthStateChanged: jest.Mock;
};

const mockBatch = {
	set: jest.fn(),
	update: jest.fn(),
	delete: jest.fn(),
	commit: jest.fn(),
};
const mockCollection = jest.fn((...path: unknown[]) => ({ type: 'collection', path }));
let generatedDocId = 0;
const mockDoc = jest.fn((...path: unknown[]) => ({
	type: 'doc',
	path,
	id: path.length === 1 ? `generated-${++generatedDocId}` : String(path.at(-1)),
}));
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn();
const mockWriteBatch = jest.fn();

jest.mock('firebase/firestore', () => ({
	collection: (...args: unknown[]) => mockCollection(...args),
	deleteField: jest.fn(() => '__delete_field__'),
	doc: (...args: unknown[]) => mockDoc(...args),
	getDoc: (...args: unknown[]) => mockGetDoc(...args),
	getDocs: (...args: unknown[]) => mockGetDocs(...args),
	increment: jest.fn((value: number) => ({ __increment: value })),
	onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
	query: jest.fn((collectionRef: unknown) => collectionRef),
	Timestamp: {
		fromDate: jest.fn((date: Date) => ({ __timestamp: date.toISOString() })),
		now: jest.fn(() => '__timestamp_now__'),
	},
	writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

const mockUser = { uid: 'user-1' };

describe('useTransactions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		generatedDocId = 0;
		mockBatch.set.mockReturnValue(undefined);
		mockBatch.update.mockReturnValue(undefined);
		mockBatch.delete.mockReturnValue(undefined);
		mockBatch.commit.mockResolvedValue(undefined);
		mockWriteBatch.mockReturnValue(mockBatch);
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({
				accountId: 'account-1',
				amount: 100,
				type: 'expense',
			}),
		});
		mockGetDocs.mockResolvedValue({ docs: [] });
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
		expect(mockBatch.set).not.toHaveBeenCalled();
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
		expect(mockBatch.set).not.toHaveBeenCalled();
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

		expect(mockBatch.set).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.objectContaining({ transferId: 'generated-1', transferDirection: 'out' })
		);
		expect(mockBatch.set).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			expect.objectContaining({ transferId: 'generated-1', transferDirection: 'in' })
		);
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

		expect(mockBatch.set).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				category: 'food',
				subcategory: 'takeaways_eating_out',
				date: { __timestamp: date.toISOString() },
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

		expect(mockBatch.set).toHaveBeenCalledWith(
			expect.anything(),
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

		expect(mockBatch.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				category: 'food',
				subcategory: '__delete_field__',
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
		mockGetDoc.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ accountId: 'account-1', amount: 100, type: 'transfer' }),
		});
		const { result } = renderHook(() => useTransactions());

		await expect(
			result.current.updateTransaction('transaction-1', { amount: 200 })
		).rejects.toThrow('Transfers cannot be edited');
		expect(mockBatch.update).not.toHaveBeenCalled();
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

		expect(mockBatch.delete).toHaveBeenCalledTimes(2);
		expect(mockBatch.update).toHaveBeenCalledWith(
			expect.objectContaining({ path: expect.arrayContaining(['accounts', 'account-1']) }),
			{ balance: { __increment: 250 } }
		);
		expect(mockBatch.update).toHaveBeenCalledWith(
			expect.objectContaining({ path: expect.arrayContaining(['accounts', 'account-2']) }),
			{ balance: { __increment: -250 } }
		);
	});

	it('chunks deletion so each Firestore batch stays below its write limit', async () => {
		mockGetDocs
			.mockResolvedValueOnce({
				docs: Array.from({ length: 801 }, (_, index) => ({ ref: `tx-${index}` })),
			})
			.mockResolvedValueOnce({ docs: [{ ref: 'account-1' }, { ref: 'account-2' }] });
		const { result } = renderHook(() => useTransactions());

		await act(async () => {
			await result.current.deleteAllTransactions();
		});

		expect(mockWriteBatch).toHaveBeenCalledTimes(4);
		expect(mockBatch.commit).toHaveBeenCalledTimes(4);
	});
});
