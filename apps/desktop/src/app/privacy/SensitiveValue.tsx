import React from 'react';
import { cn } from '@/lib/utils';
import { usePrivacyMode } from '@/app/privacy/PrivacyModeContext';

interface SensitiveValueProps {
	children: React.ReactNode;
	className?: string;
	widthClassName?: string;
}

export const SensitiveValue: React.FC<SensitiveValueProps> = ({
	children,
	className,
	widthClassName = 'w-24',
}) => {
	const { isPrivacyMode } = usePrivacyMode();

	if (isPrivacyMode) {
		return (
			<span
				className={cn(
					'privacy-skeleton inline-block h-[1em] align-[-0.125em]',
					widthClassName,
					className
				)}
				aria-label="Hidden data"
				data-testid="privacy-skeleton"
			/>
		);
	}

	if (!className) return <>{children}</>;

	return <span className={className}>{children}</span>;
};

export const SensitiveText = SensitiveValue;
