import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Theme, ThemeContextType } from '@/types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [theme, setThemeState] = useState<Theme>(() => {
		return (localStorage.getItem('theme') as Theme) || 'light';
	});

	const setTheme = (newTheme: Theme) => {
		localStorage.setItem('theme', newTheme);
		setThemeState(newTheme);
	};

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			<div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
};
