import { act, renderHook, waitFor } from '@testing-library/react';
import { useBudgets } from '../useBudgets';
import { auth } from '@/services/firebase';
import {
	createBudget,
	deleteBudget,
	publishBudget,
	reorderBudgets,
	repeatBudget,
	updateBudget,
} from '@/domains/budgets/services/budgetService';

const mockOnSnapshot = jest.fn();

jest.mock('firebase/firestore', () => ({
	collection: jest.fn((...path: string[]) => ({ path })),
	query: jest.fn((collectionRef: unknown) => collectionRef),
	onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

jest.mock('@/domains/budgets/services/budgetService', () => ({
	createBudget: jest.fn(),
	updateBudget: jest.fn(),
	deleteBudget: jest.fn(),
	publishBudget: jest.fn(),
	repeatBudget: jest.fn(),
	reorderBudgets: jest.fn(),
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
							id: 'budget-1',
							data: () => ({
								userId: 'user-1',
								categoryId: 'food',
								subCategoryId: 'takeaways',
								amount: 1500,
								period: 'monthly',
								month: '2026-05',
								startDate: '2026-05-01',
								endDate: '2026-05-31',
								lifecycleStatus: 'draft',
							}),
						},
					],
				});
				return jest.fn();
			}
		);
	});

	it('subscribes to and normalizes user budgets', async () => {
		const { result } = renderHook(() => useBudgets());
		await waitFor(() => expect(result.current.budgets).toHaveLength(1));
		expect(result.current.budgets[0].subCategoryId).toBe('takeaways');
	});

	it('delegates create, update, and delete operations with ownership', async () => {
		const { result } = renderHook(() => useBudgets());
		const input = {
			categoryId: 'food',
			subCategoryId: 'takeaways',
			amount: 1500,
			period: 'monthly' as const,
			month: '2026-05',
			startDate: '2026-05-01',
			endDate: '2026-05-31',
			lifecycleStatus: 'draft' as const,
		};

		await act(async () => {
			await result.current.addBudget(input);
			await result.current.updateBudget('budget-1', { amount: 1700 });
			await result.current.deleteBudget('budget-1');
			await result.current.publishBudget('budget-1');
			await result.current.repeatBudget('budget-1');
			await result.current.reorderBudgets(['budget-1']);
		});

		expect(createBudget).toHaveBeenCalledWith({ ...input, userId: 'user-1' });
		expect(updateBudget).toHaveBeenCalledWith('user-1', 'budget-1', {
			amount: 1700,
		});
		expect(deleteBudget).toHaveBeenCalledWith('user-1', 'budget-1');
		expect(publishBudget).toHaveBeenCalledWith('user-1', 'budget-1');
		expect(repeatBudget).toHaveBeenCalledWith('user-1', 'budget-1');
		expect(reorderBudgets).toHaveBeenCalledWith('user-1', ['budget-1']);
	});
});
