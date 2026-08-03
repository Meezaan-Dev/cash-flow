import React from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Button } from '@/components/app/ui/button';
import { usePrivacyMode } from '@/app/privacy/PrivacyModeContext';
import { cn } from '@/lib/utils';
import { frostedPanel } from '@/styles/marketingStyles';

const PrivacyModeButton: React.FC = () => {
	const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
	const Icon = isPrivacyMode ? FiEye : FiEyeOff;

	return (
		<Button
			type="button"
			variant={isPrivacyMode ? 'default' : 'outline'}
			className={cn(
				'fixed bottom-4 right-4 z-50 rounded-full shadow-lg md:bottom-6 md:right-6',
				!isPrivacyMode && frostedPanel
			)}
			onClick={togglePrivacyMode}
			aria-label={isPrivacyMode ? 'Reveal data' : 'Hide data'}
			aria-pressed={isPrivacyMode}
			title="Hide or reveal sensitive data (Ctrl+H / Cmd+Shift+H)"
		>
			<Icon className="mr-2 h-4 w-4" />
			{isPrivacyMode ? 'Reveal data' : 'Hide data'}
		</Button>
	);
};

export default PrivacyModeButton;
