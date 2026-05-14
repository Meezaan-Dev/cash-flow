import { useState, useEffect } from 'react';
import { auth } from '@/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export const useAuth = () => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setCurrentUser(user);
		});

		return () => unsubscribe();
	}, []);

	return { currentUser };
};
