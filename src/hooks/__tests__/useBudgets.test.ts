import { act, renderHook, waitFor } from '@testing-library/react';
import { useBudgets } from '../useBudgets';
import { auth } from '../../services/firebase';

const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('firebase/firestore', () => ({
	collection: jest.fn((...path: string[]) => ({ path })),
	addDoc: (...args: unknown[]) => mockAddDoc(...args),
	deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
	updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
	doc: jest.fn((...path: string[]) => ({ path })),
	query: jest.fn((collectionRef: unknown) => collectionRef),
	onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
	Timestamp: {
		now: jest.fn(() => 'timestamp-now'),
	},
}));

const mockUser = { uid: 'user-1' };

describe('useBudgets', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
		mockOnSnapshot.mockImplementation(
			(_queryRef: unknown, next: (snapshot: unknown) => void) => {
				next({
					docs: [
						{
							id: 'draft-1',
							data: () => ({
								category: 'groceries',
								amount: 1000,
								period: 'monthly',
								status: 'draft',
								plannedStartDate: '2026-05-01',
								plannedEndDate: '2026-05-31',
							}),
						},
						{
							id: 'published-1',
							data: () => ({
								category: 'groceries',
								amount: 500,
								period: 'monthly',
								status: 'published',
								plannedStartDate: '2026-05-01',
								plannedEndDate: '2026-05-31',
							}),
						},
					],
				});
				return jest.fn();
			}
		);
	});

	it('creates draft budgets with draft status', async () => {
		const { result } = renderHook(() => useBudgets());

		await act(async () => {
			await result.current.addDraftBudget({
				category: 'groceries',
				amount: 1000,
				period: 'monthly',
				plannedStartDate: '2026-05-01',
				plannedEndDate: '2026-05-31',
			});
		});

		expect(mockAddDoc).toHaveBeenCalledWith(expect.anything(), {
			category: 'groceries',
			amount: 1000,
			period: 'monthly',
			plannedStartDate: '2026-05-01',
			plannedEndDate: '2026-05-31',
			status: 'draft',
			userId: 'user-1',
			createdAt: 'timestamp-now',
		});
	});

	it('publishes a draft by updating status and using the planned period', async () => {
		const { result } = renderHook(() => useBudgets());

		await waitFor(() => {
			expect(result.current.budgets).toHaveLength(2);
		});

		await act(async () => {
			await result.current.publishBudget('draft-1');
		});

		expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
			status: 'published',
			actualStartDate: '2026-05-01',
			actualEndDate: '2026-05-31',
		});
		expect(mockAddDoc).not.toHaveBeenCalled();
		expect(mockDeleteDoc).not.toHaveBeenCalled();
	});
});
