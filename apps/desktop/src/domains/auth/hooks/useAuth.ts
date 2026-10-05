import { useAuthUser } from '@cash-flow/shared/auth/AuthContext';

export const useAuth = () => {
	const { user: currentUser } = useAuthUser();
	return { currentUser };
};
