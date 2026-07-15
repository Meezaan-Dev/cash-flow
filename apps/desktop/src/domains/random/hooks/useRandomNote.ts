import { useCallback, useEffect, useState } from 'react';
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	serverTimestamp,
	setDoc,
	updateDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/services/firebase';

const RANDOM_NOTE_ID = 'main';
export const RANDOM_NOTE_LIMIT = 10_000;
export const RANDOM_NOTE_MAX_COUNT = 5;

export interface RandomNote {
	id: string;
	content: string;
}

const sortRandomNotes = (notes: RandomNote[]) =>
	[...notes].sort((a, b) => {
		if (a.id === RANDOM_NOTE_ID) return -1;
		if (b.id === RANDOM_NOTE_ID) return 1;
		return a.id.localeCompare(b.id);
	});

export const useRandomNote = () => {
	const [notes, setNotes] = useState<RandomNote[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(() => auth.currentUser);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
			setUser(firebaseUser);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!user) {
			setNotes([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const notesRef = collection(db, 'users', user.uid, 'random');
		const unsubscribe = onSnapshot(
			notesRef,
			(snapshot) => {
				setNotes(
					sortRandomNotes(
						snapshot.docs.map((note) => ({
							id: note.id,
							content: String(note.data().content ?? ''),
						}))
					)
				);
				setLoading(false);
			},
			(error) => {
				console.error('Error fetching random notes:', error);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	const saveNote = useCallback(
		async (noteId: string, nextContent: string) => {
			if (!user) throw new Error('User not authenticated');

			const noteRef = doc(db, 'users', user.uid, 'random', noteId);
			await updateDoc(noteRef, {
				content: nextContent,
				updatedAt: serverTimestamp(),
			});
		},
		[user]
	);

	const addNote = useCallback(async () => {
		if (!user) throw new Error('User not authenticated');
		if (notes.length >= RANDOM_NOTE_MAX_COUNT) {
			throw new Error(`You can keep up to ${RANDOM_NOTE_MAX_COUNT} random notes.`);
		}

		if (notes.length === 0) {
			const noteRef = doc(db, 'users', user.uid, 'random', RANDOM_NOTE_ID);
			await setDoc(noteRef, {
				content: '',
				userId: user.uid,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
			return RANDOM_NOTE_ID;
		}

		const notesRef = collection(db, 'users', user.uid, 'random');
		const noteRef = await addDoc(notesRef, {
			content: '',
			userId: user.uid,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
		return noteRef.id;
	}, [notes.length, user]);

	const deleteNote = useCallback(
		async (noteId: string) => {
			if (!user) throw new Error('User not authenticated');

			const noteRef = doc(db, 'users', user.uid, 'random', noteId);
			await deleteDoc(noteRef);
		},
		[user]
	);

	return { notes, loading, saveNote, addNote, deleteNote };
};
