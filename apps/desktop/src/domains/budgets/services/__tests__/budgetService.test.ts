import { createBudget, reorderBudgets, updateBudget } from '../budgetService';

const mockUpdateDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockCreateBudget = jest.fn();

jest.mock('@/services/firebase', () => ({
	db: {},
}));

jest.mock('@cash-flow/shared/services/api', () => ({
	apiService: {
		createBudget: (...args: unknown[]) => mockCreateBudget(...args),
	},
}));

jest.mock('firebase/firestore', () => ({
	Timestamp: {
		now: jest.fn(() => 'timestamp-now'),
	},
	addDoc: (...args: unknown[]) => mockAddDoc(...args),
	collection: jest.fn((...path: string[]) => ({ path })),
	deleteDoc: jest.fn(),
	doc: jest.fn((...path: string[]) => ({ path })),
	getDoc: (...args: unknown[]) => mockGetDoc(...args),
	getDocs: (...args: unknown[]) => mockGetDocs(...args),
	query: jest.fn((value: unknown) => value),
	updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
	writeBatch: jest.fn(() => ({
		update: mockBatchUpdate,
		commit: mockBatchCommit,
	})),
}));

describe('budgetService updateBudget', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			id: 'budget-1',
			data: () => ({
				userId: 'user-1',
				categoryId: 'food',
				amount: 1500,
				period: 'monthly',
				month: '2026-06',
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				lifecycleStatus: 'draft',
			}),
		});
		mockGetDocs.mockResolvedValue({ docs: [] });
		mockCreateBudget.mockResolvedValue('budget-new');
	});

	it('never sends undefined optional fields to Firestore', async () => {
		await updateBudget('user-1', 'budget-1', {
			accountId: undefined,
			subCategoryId: undefined,
			amount: 1700,
			period: 'monthly',
			month: '2026-06',
			startDate: '2026-06-01',
			endDate: '2026-06-30',
		});

		expect(mockUpdateDoc).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				accountId: null,
				subCategoryId: null,
				amount: 1700,
			})
		);
		const payload = mockUpdateDoc.mock.calls[0][1];
		expect(Object.values(payload)).not.toContain(undefined);
	});

	it('delegates budget creation to the server-owned API', async () => {
		await expect(createBudget({
			userId: 'user-1',
			categoryId: 'food',
			amount: 1000,
			period: 'monthly',
			month: '2026-06',
			startDate: '2026-06-01',
			endDate: '2026-06-30',
			lifecycleStatus: 'draft',
		})).resolves.toBe('budget-new');
		expect(mockCreateBudget).toHaveBeenCalledWith(expect.objectContaining({
			categoryId: 'food',
			amount: 1000,
		}));
	});

	it('persists the complete display order in one batch', async () => {
		mockBatchCommit.mockResolvedValue(undefined);

		await reorderBudgets('user-1', ['budget-2', 'budget-1']);

		expect(mockBatchUpdate).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.objectContaining({ displayOrder: 0 })
		);
		expect(mockBatchUpdate).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			expect.objectContaining({ displayOrder: 1 })
		);
		expect(mockBatchCommit).toHaveBeenCalledTimes(1);
	});
});
