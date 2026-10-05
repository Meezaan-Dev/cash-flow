import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextValue {
	user: User | null;
	authReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({
	user: auth.currentUser,
	authReady: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(() => auth.currentUser);
	const [authReady, setAuthReady] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
			setUser(firebaseUser);
			setAuthReady(true);
		});
		return () => unsubscribe();
	}, []);

	const value = useMemo(() => ({ user, authReady }), [user, authReady]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthUser = () => useContext(AuthContext);
