import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/services/firebase';

const RANDOM_NOTE_ID = 'main';
export const RANDOM_NOTE_LIMIT = 10_000;

export const useRandomNote = () => {
	const [content, setContent] = useState('');
	const [exists, setExists] = useState(false);
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
			setContent('');
			setExists(false);
			setLoading(false);
			return;
		}

		setLoading(true);
		const noteRef = doc(db, 'users', user.uid, 'random', RANDOM_NOTE_ID);
		const unsubscribe = onSnapshot(
			noteRef,
			(snapshot) => {
				setExists(snapshot.exists());
				setContent(snapshot.exists() ? String(snapshot.data().content ?? '') : '');
				setLoading(false);
			},
			(error) => {
				console.error('Error fetching random note:', error);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	const saveNote = useCallback(
		async (nextContent: string) => {
			if (!user) throw new Error('User not authenticated');

			const noteRef = doc(db, 'users', user.uid, 'random', RANDOM_NOTE_ID);
			if (exists) {
				await updateDoc(noteRef, {
					content: nextContent,
					updatedAt: serverTimestamp(),
				});
				return;
			}

			await setDoc(noteRef, {
				content: nextContent,
				userId: user.uid,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
		},
		[exists, user]
	);

	return { content, loading, saveNote };
};
