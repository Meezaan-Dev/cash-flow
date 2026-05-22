import MobisiteApp from '@mobisite/App';
import { BookOpen, ChevronLeft, ChevronRight, Lock, MoreHorizontal, Share, Square } from 'lucide-react';
import type { CSSProperties } from 'react';

const MobisiteFrame = () => {
	return (
		<div className="min-h-screen-safe bg-[radial-gradient(circle_at_top,hsl(var(--muted)),hsl(var(--background))_58%)] px-0 py-0 text-foreground sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-8">
			<div className="hidden sm:block">
				<div
					data-testid="mobile-browser-frame"
					className="rounded-[2.75rem] bg-zinc-950 p-3 shadow-2xl shadow-black/30"
				>
					<div className="flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[2.2rem] border border-zinc-800 bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
						<div className="flex h-9 items-center justify-between px-7 pt-2 text-[11px] font-semibold">
							<span>9:41</span>
							<span className="flex items-center gap-1.5">
								<span className="h-2.5 w-3.5 rounded-sm border border-current" />
								<span className="h-2.5 w-2.5 rounded-full bg-current" />
							</span>
						</div>
						<div className="border-b border-zinc-300/70 bg-zinc-100 px-3 pb-2 pt-1 dark:border-zinc-800 dark:bg-zinc-950">
							<div className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
								<Lock className="h-3.5 w-3.5 text-zinc-500" />
								<span className="min-w-0 flex-1 truncate text-center font-medium text-zinc-700 dark:text-zinc-200">
									cashflow.local/mobisite
								</span>
								<MoreHorizontal className="h-4 w-4 text-zinc-500" />
							</div>
						</div>
						<div
							className="min-h-0 flex-1 overflow-y-auto bg-background"
							style={{ '--vh-screen': '730px' } as CSSProperties}
						>
							<MobisiteApp />
						</div>
						<div className="grid h-14 grid-cols-5 items-center border-t border-zinc-300/70 bg-zinc-100 px-4 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
							<button type="button" className="flex justify-center" aria-label="Back">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<button type="button" className="flex justify-center" aria-label="Forward">
								<ChevronRight className="h-5 w-5" />
							</button>
							<button type="button" className="flex justify-center" aria-label="Share">
								<Share className="h-5 w-5" />
							</button>
							<button type="button" className="flex justify-center" aria-label="Bookmarks">
								<BookOpen className="h-5 w-5" />
							</button>
							<button type="button" className="flex justify-center" aria-label="Tabs">
								<Square className="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>
			</div>
			<div className="block sm:hidden">
				<MobisiteApp />
			</div>
		</div>
	);
};

export default MobisiteFrame;
