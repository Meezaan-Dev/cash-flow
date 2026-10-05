import ledgerGhostMascot from './assets/ledger-ghost-mascot.png';

type LedgerGhostMascotSize = 'sm' | 'md' | 'lg';

interface LedgerGhostMascotProps {
	size?: LedgerGhostMascotSize;
	className?: string;
	alt?: string;
	decorative?: boolean;
}

const sizeClasses: Record<LedgerGhostMascotSize, string> = {
	sm: 'h-9 w-9',
	md: 'h-16 w-16',
	lg: 'h-24 w-24',
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
	classes.filter(Boolean).join(' ');

export const LedgerGhostMascot = ({
	size = 'md',
	className,
	alt = 'Cash Flow ledger ghost',
	decorative = false,
}: LedgerGhostMascotProps) => (
	<img
		src={ledgerGhostMascot}
		alt={decorative ? '' : alt}
		aria-hidden={decorative ? true : undefined}
		className={joinClasses(
			'shrink-0 rounded-full object-cover shadow-[0_14px_32px_rgba(15,23,42,0.16)]',
			sizeClasses[size],
			className
		)}
	/>
);
