import React from 'react';
import { FiInfo } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface HelpTipProps {
	label: string;
	className?: string;
}

const HelpTip: React.FC<HelpTipProps> = ({ label, className }) => {
	return (
		<span className={cn('group relative inline-flex', className)}>
			<button
				type="button"
				aria-label={label}
				className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<FiInfo className="h-3.5 w-3.5" />
			</button>
			<span
				role="tooltip"
				className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-md group-focus-within:block group-hover:block"
			>
				{label}
			</span>
		</span>
	);
};

export default HelpTip;
