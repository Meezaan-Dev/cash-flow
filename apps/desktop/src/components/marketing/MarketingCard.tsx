import React from 'react';
import { cn } from '@/lib/utils';
import { cardSurface } from '@/styles/marketingStyles';

interface MarketingCardProps {
	children: React.ReactNode;
	className?: string;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	hover?: boolean;
}

const MarketingCard: React.FC<MarketingCardProps> = ({
	children,
	className,
	header,
	footer,
	hover = true,
}) => {
	return (
		<section
			className={cn(
				cardSurface,
				!hover && 'hover:shadow-sm',
				'overflow-hidden',
				className
			)}
		>
			{header && <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/20">{header}</div>}
			<div className={cn(header || footer ? 'p-5' : 'p-5')}>{children}</div>
			{footer && <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">{footer}</div>}
		</section>
	);
};

export default MarketingCard;
