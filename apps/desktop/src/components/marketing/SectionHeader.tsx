import React from 'react';
import { cn } from '@/lib/utils';
import { pageSubtitle, pageTitle, pillBadge } from '@/styles/marketingStyles';

interface SectionHeaderProps {
	badge?: string;
	title: string;
	subtitle?: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
	compact?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
	badge,
	title,
	subtitle,
	actions,
	className,
	compact = false,
}) => {
	return (
		<header
			className={cn(
				'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
				className
			)}
		>
			<div>
				{badge && <div className={cn(pillBadge, 'mb-4')}>{badge}</div>}
				<h1
					className={cn(
						compact ? 'text-2xl' : pageTitle,
						badge ? '' : 'mt-0'
					)}
				>
					{title}
				</h1>
				{subtitle && (
					<div className={cn(pageSubtitle, 'mt-1 text-sm')}>{subtitle}</div>
				)}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</header>
	);
};

export default SectionHeader;
