import React, { useState, useRef } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import useClickOutside from '@/hooks/useClickOutside';
import { useTheme } from '@/features/theme/context/ThemeContext';
import { Theme } from '@/types';

const ThemeDropdown: React.FC = () => {
	const { theme, setTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(dropdownRef, () => setIsOpen(false));

	const themes = [
		{ id: 'light', name: 'Light', icon: <FiSun className="theme-icon" /> },
		{ id: 'dark', name: 'Dark', icon: <FiMoon className="theme-icon" /> },
	];

	const currentTheme = themes.find((t) => t.id === theme) || themes[0];

	return (
		<div className="theme-dropdown" ref={dropdownRef}>
			<button
				className="theme-dropdown-toggle"
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Change theme"
				aria-expanded={isOpen}
			>
				{currentTheme.icon}
				<span className="theme-label">{currentTheme.name}</span>
				<span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
			</button>

			{isOpen && (
				<div className="theme-dropdown-menu">
					{themes.map((themeOption) => (
						<button
							key={themeOption.id}
							className={`theme-option ${theme === themeOption.id ? 'active' : ''}`}
							onClick={() => {
								setTheme(themeOption.id as Theme);
								setIsOpen(false);
							}}
						>
							{themeOption.icon}
							<span>{themeOption.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default ThemeDropdown;
