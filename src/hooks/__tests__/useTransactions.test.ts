import { act, renderHook, waitFor } from '@testing-library/react';
import { auth } from '../../services/firebase';
import { useTransactions } from '../useTransactions';

const mockBatch = {
	set: jest.fn(),
	update: jest.fn(),
	delete: jest.fn(),
	commit: jest.fn(),
};
const mockCollection = jest.fn((...path: unknown[]) => ({ type: 'collection', path }));
const mockDoc = jest.fn((...path: unknown[]) => ({ type: 'doc', path }));
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
		Object.defineProperty(auth, 'currentUser', {
			value: mockUser,
			writable: true,
		});
		(auth.onAuthStateChanged as jest.Mock).mockImplementation(
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
});
