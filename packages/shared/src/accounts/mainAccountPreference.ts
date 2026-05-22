import { useCallback, useEffect, useState } from 'react';

const MAIN_ACCOUNT_STORAGE_KEY = 'cashflow.mainAccountId.v1';
const MAIN_ACCOUNT_CHANGED_EVENT = 'cashflow:main-account-changed';

export const loadMainAccountId = (): string => {
	if (typeof window === 'undefined') return '';
	return window.localStorage.getItem(MAIN_ACCOUNT_STORAGE_KEY) ?? '';
};

export const saveMainAccountId = (accountId: string) => {
	if (typeof window === 'undefined') return;

	if (accountId) {
		window.localStorage.setItem(MAIN_ACCOUNT_STORAGE_KEY, accountId);
	} else {
		window.localStorage.removeItem(MAIN_ACCOUNT_STORAGE_KEY);
	}

	window.dispatchEvent(new Event(MAIN_ACCOUNT_CHANGED_EVENT));
};

export const useMainAccountPreference = () => {
	const [mainAccountId, setMainAccountIdState] = useState(loadMainAccountId);

	useEffect(() => {
		const syncMainAccount = () => setMainAccountIdState(loadMainAccountId());

		window.addEventListener('storage', syncMainAccount);
		window.addEventListener(MAIN_ACCOUNT_CHANGED_EVENT, syncMainAccount);

		return () => {
			window.removeEventListener('storage', syncMainAccount);
			window.removeEventListener(MAIN_ACCOUNT_CHANGED_EVENT, syncMainAccount);
		};
	}, []);

	const setMainAccountId = useCallback((accountId: string) => {
		saveMainAccountId(accountId);
		setMainAccountIdState(accountId);
	}, []);

	return { mainAccountId, setMainAccountId };
};
