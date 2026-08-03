import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface PrivacyModeContextValue {
	isPrivacyMode: boolean;
	togglePrivacyMode: () => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextValue | undefined>(undefined);

export const PrivacyModeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const [isPrivacyMode, setPrivacyMode] = useState(false);
	const togglePrivacyMode = useCallback(() => {
		setPrivacyMode((current) => !current);
	}, []);

	const value = useMemo(() => ({ isPrivacyMode, togglePrivacyMode }), [isPrivacyMode, togglePrivacyMode]);

	return (
		<PrivacyModeContext.Provider value={value}>
			{children}
		</PrivacyModeContext.Provider>
	);
};

export const usePrivacyMode = (): PrivacyModeContextValue => {
	const context = useContext(PrivacyModeContext);
	if (context) return context;
	return {
		isPrivacyMode: false,
		togglePrivacyMode: () => undefined,
	};
};
