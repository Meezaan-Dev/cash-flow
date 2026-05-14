import { useTheme } from '@/features/theme/context/ThemeContext';
import { lightTheme } from '@/themes/light';
import { darkTheme } from '@/themes/dark';

export const useThemeVariant = () => {
	const { theme } = useTheme();
	return theme === 'dark' ? darkTheme : lightTheme;
};
