import React from 'react';
import SectionHeader from '@/components/marketing/SectionHeader';
import Currency from '@/components/marketing/Currency';
import { pageBg, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';

export const PageShell: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	className,
	children,
	...props
}) => (
	<div
		className={cn('min-h-0 flex-1 overflow-y-auto p-4 md:p-8', pageBg, className)}
		{...props}
	>
		{children}
	</div>
);

export const PageHeader: React.FC<React.ComponentProps<typeof SectionHeader>> = (
	props
) => <SectionHeader {...props} className={cn('mb-6', props.className)} />;

export const SummaryCardGrid: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	className,
	...props
}) => (
	<div
		className={cn(
			'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
			className
		)}
		{...props}
	/>
);

interface SummaryCardProps {
	label: string;
	amount?: number;
	value?: React.ReactNode;
	note?: React.ReactNode;
	tone?: 'default' | 'income' | 'expense' | 'balance-positive' | 'balance-negative';
	icon?: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
	label,
	amount,
	value,
	note,
	tone = 'default',
	icon,
	onClick,
	className,
}) => {
	const content = (
		<>
			<div className="flex items-center justify-between gap-3">
				<p className={sectionLabel}>{label}</p>
				{icon}
			</div>
			{amount !== undefined ? (
				<Currency amount={amount} tone={tone} className="mt-1 text-xl" />
			) : (
				<div className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
					{value}
				</div>
			)}
			{note && (
				<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>
			)}
		</>
	);

	const sharedClassName = cn(
		'rounded-xl border border-gray-100 bg-gray-50/60 p-5 text-left dark:border-gray-800 dark:bg-gray-800/40',
		onClick &&
			'cursor-pointer transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:border-blue-900 dark:hover:bg-gray-900',
		className
	);

	return onClick ? (
		<button type="button" onClick={onClick} className={sharedClassName}>
			{content}
		</button>
	) : (
		<div className={sharedClassName}>
			{content}
		</div>
	);
};

export const FilterBar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	className,
	...props
}) => (
	<div
		className={cn(
			'flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/95 p-3 backdrop-blur dark:border-gray-800/80 dark:bg-gray-900/95',
			className
		)}
		{...props}
	/>
);

export const DataListSurface: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	className,
	...props
}) => (
	<div
		className={cn(
			'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900',
			className
		)}
		{...props}
	/>
);

export const DataListHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	className,
	...props
}) => (
	<div
		className={cn(
			'hidden grid-cols-[minmax(220px,0.9fr)_minmax(220px,1.1fr)_minmax(280px,1fr)] border-b border-gray-200 bg-gray-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 md:grid',
			className
		)}
		{...props}
	/>
);

export const DataListRow: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	className,
	...props
}) => (
	<div
		className={cn(
			'group relative grid gap-4 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30 md:grid-cols-[minmax(220px,0.9fr)_minmax(220px,1.1fr)_minmax(280px,1fr)] md:items-center',
			className
		)}
		{...props}
	/>
);

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description: React.ReactNode;
	icon?: React.ReactNode;
	action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	title,
	description,
	icon,
	action,
	className,
	...props
}) => (
	<div
		className={cn(
			'flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700',
			className
		)}
		{...props}
	>
		{icon && (
			<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
				{icon}
			</div>
		)}
		<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
		<p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
			{description}
		</p>
		{action && <div className="mt-4">{action}</div>}
	</div>
);
