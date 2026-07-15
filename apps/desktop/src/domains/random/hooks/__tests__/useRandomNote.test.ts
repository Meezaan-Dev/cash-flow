import { act, renderHook, waitFor } from '@testing-library/react';
import { useRandomNote, RANDOM_NOTE_MAX_COUNT } from '../useRandomNote';
import { auth } from '@/services/firebase';
import { addDoc, deleteDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
	addDoc: jest.fn(),
	collection: jest.fn((...segments: string[]) => ({ type: 'collection', segments })),
	deleteDoc: jest.fn((ref) => Promise.resolve(ref)),
	doc: jest.fn((...segments: string[]) => ({ type: 'doc', segments })),
	onSnapshot: jest.fn(),
	serverTimestamp: jest.fn(() => 'server-time'),
	setDoc: jest.fn(() => Promise.resolve()),
	updateDoc: jest.fn(() => Promise.resolve()),
}));

const mockSnapshot = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
	docs: docs.map((item) => ({
		id: item.id,
		data: () => item.data,
	})),
});

describe('useRandomNote', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(auth as { currentUser: unknown }).currentUser = { uid: 'user-1' };
		(onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
			callback({ uid: 'user-1' });
			return jest.fn();
		});
		(onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
			next(
				mockSnapshot([
					{ id: 'secondary', data: { content: 'Second note' } },
					{ id: 'main', data: { content: 'Legacy note' } },
				])
			);
			return jest.fn();
		});
		(addDoc as jest.Mock).mockResolvedValue({ id: 'new-note' });
	});

	it('loads the legacy main note first from the random collection', async () => {
		const { result } = renderHook(() => useRandomNote());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.notes).toEqual([
			{ id: 'main', content: 'Legacy note' },
			{ id: 'secondary', content: 'Second note' },
		]);
	});

	it('creates main as the first note and generated documents after that', async () => {
		(onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
			next(mockSnapshot([]));
			return jest.fn();
		});
		const { result } = renderHook(() => useRandomNote());

		await waitFor(() => expect(result.current.loading).toBe(false));
		await act(async () => {
			await expect(result.current.addNote()).resolves.toBe('main');
		});

		expect(setDoc).toHaveBeenCalledWith(
			expect.objectContaining({ segments: expect.arrayContaining(['random', 'main']) }),
			expect.objectContaining({ content: '', userId: 'user-1' })
		);

		(onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
			next(mockSnapshot([{ id: 'main', data: { content: '' } }]));
			return jest.fn();
		});
		const next = renderHook(() => useRandomNote());
		await waitFor(() => expect(next.result.current.notes).toHaveLength(1));
		await act(async () => {
			await expect(next.result.current.addNote()).resolves.toBe('new-note');
		});

		expect(addDoc).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'collection' }),
			expect.objectContaining({ content: '', userId: 'user-1' })
		);
	});

	it('caps random notes at five and saves or deletes selected notes', async () => {
		(onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
			next(
				mockSnapshot(
					Array.from({ length: RANDOM_NOTE_MAX_COUNT }, (_, index) => ({
						id: index === 0 ? 'main' : `note-${index}`,
						data: { content: `Note ${index + 1}` },
					}))
				)
			);
			return jest.fn();
		});
		const { result } = renderHook(() => useRandomNote());

		await waitFor(() => expect(result.current.notes).toHaveLength(RANDOM_NOTE_MAX_COUNT));
		await act(async () => {
			await expect(result.current.addNote()).rejects.toThrow('up to 5 random notes');
		});
		await act(async () => {
			await result.current.saveNote('main', 'Updated note');
			await result.current.deleteNote('note-1');
		});

		expect(updateDoc).toHaveBeenCalledWith(
			expect.objectContaining({ segments: expect.arrayContaining(['random', 'main']) }),
			expect.objectContaining({ content: 'Updated note' })
		);
		expect(deleteDoc).toHaveBeenCalledWith(
			expect.objectContaining({ segments: expect.arrayContaining(['random', 'note-1']) })
		);
	});
});
