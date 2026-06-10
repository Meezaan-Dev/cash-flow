import MobisiteApp from '@mobisite/App';
import { Battery, Signal, Wifi } from 'lucide-react';
import type { CSSProperties } from 'react';

/** iPhone 15 logical viewport (points). */
const IPHONE_15_WIDTH = 393;
const IPHONE_15_HEIGHT = 852;
/** Usable app height below status bar + home indicator. */
const IPHONE_15_APP_HEIGHT = 759;

const MobisiteFrame = () => {
	return (
		<div className="min-h-screen-safe bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(148,163,184,0.22),transparent_55%),linear-gradient(180deg,#e2e8f0_0%,#cbd5e1_100%)] px-0 py-0 text-foreground dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.12),transparent_55%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-10">
			<div className="hidden sm:block">
				<div
					data-testid="mobile-browser-frame"
					className="relative rounded-[3.25rem] bg-gradient-to-b from-zinc-400 via-zinc-600 to-zinc-800 p-[10px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-black/40"
					style={{ width: IPHONE_15_WIDTH + 20, height: IPHONE_15_HEIGHT + 20 }}
				>
					{/* Side buttons */}
					<div
						className="absolute -left-[2px] top-[148px] h-8 w-[3px] rounded-l-sm bg-zinc-500/90"
						aria-hidden
					/>
					<div
						className="absolute -left-[2px] top-[196px] h-14 w-[3px] rounded-l-sm bg-zinc-500/90"
						aria-hidden
					/>
					<div
						className="absolute -left-[2px] top-[252px] h-14 w-[3px] rounded-l-sm bg-zinc-500/90"
						aria-hidden
					/>
					<div
						className="absolute -right-[2px] top-[210px] h-20 w-[3px] rounded-r-sm bg-zinc-500/90"
						aria-hidden
					/>

					<div
						className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.65rem] bg-black"
						style={{ width: IPHONE_15_WIDTH, height: IPHONE_15_HEIGHT }}
					>
						{/* Dynamic Island */}
						<div
							className="pointer-events-none absolute left-1/2 top-[11px] z-20 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.45)]"
							aria-hidden
						/>

						{/* Status bar */}
						<div className="relative z-10 flex h-[54px] shrink-0 items-end justify-between px-7 pb-1 text-[13px] font-semibold text-white">
							<span>9:41</span>
							<span className="flex items-center gap-1.5">
								<Signal className="h-3.5 w-3.5" strokeWidth={2.5} />
								<Wifi className="h-3.5 w-3.5" strokeWidth={2.5} />
								<Battery className="h-3.5 w-5" strokeWidth={2.5} />
							</span>
						</div>

						{/* App viewport */}
						<div
							className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background"
							style={{ '--vh-screen': `${IPHONE_15_APP_HEIGHT}px` } as CSSProperties}
						>
							<MobisiteApp />
						</div>

						{/* Home indicator */}
						<div className="flex h-[34px] shrink-0 items-center justify-center bg-background pb-2">
							<div className="h-[5px] w-[134px] rounded-full bg-zinc-900/80 dark:bg-white/30" />
						</div>
					</div>
				</div>
				<p className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
					iPhone 15 preview
				</p>
			</div>
			<div className="block sm:hidden">
				<MobisiteApp />
			</div>
		</div>
	);
};

export default MobisiteFrame;
