import MobisiteApp from '@mobisite/App';
import { Battery, Signal, Wifi } from 'lucide-react';
import type { CSSProperties } from 'react';

/** iPhone 15 logical viewport (points). */
const IPHONE_15_WIDTH = 393;
const IPHONE_15_HEIGHT = 852;
const IPHONE_15_TOP_SAFE_AREA = 72;
const IPHONE_15_BOTTOM_SAFE_AREA = 22;
const IPHONE_15_APP_HEIGHT =
	IPHONE_15_HEIGHT - IPHONE_15_TOP_SAFE_AREA - IPHONE_15_BOTTOM_SAFE_AREA;
const DEVICE_WIDTH = IPHONE_15_WIDTH + 36;
const DEVICE_HEIGHT = IPHONE_15_HEIGHT + 36;

const MobisiteFrame = () => {
	return (
		<div className="min-h-screen-safe bg-black px-0 py-0 text-foreground sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-8">
			<div className="hidden sm:block">
				<div
					data-testid="mobile-browser-frame"
					className="relative rounded-[4.55rem] border border-white/85 bg-[linear-gradient(115deg,#fbfbfd_0%,#b7b8bd_34%,#f7f7f8_48%,#4b4c50_100%)] shadow-[0_2.8px_2.2px_rgba(0,0,0,0.034),0_6.7px_5.3px_rgba(0,0,0,0.048),0_12.5px_10px_rgba(0,0,0,0.06),0_22.3px_17.9px_rgba(0,0,0,0.072),0_41.8px_33.4px_rgba(0,0,0,0.086),0_70px_70px_rgba(0,0,0,0.38),0_0_44px_rgba(255,255,255,0.22)]"
					style={{ width: DEVICE_WIDTH, height: DEVICE_HEIGHT }}
				>
					<div
						className="absolute left-1/2 top-[5px] h-[3px] w-[88px] -translate-x-1/2 rounded-b-full bg-black/55"
						aria-hidden
					/>
					<div
						className="absolute -left-[5px] top-[154px] h-[68px] w-[5px] rounded-l-full bg-white/85 shadow-[inset_-1px_0_1px_rgba(0,0,0,0.35)]"
						aria-hidden
					/>
					<div
						className="absolute -left-[5px] top-[246px] h-[48px] w-[5px] rounded-l-full bg-white/85 shadow-[inset_-1px_0_1px_rgba(0,0,0,0.35)]"
						aria-hidden
					/>
					<div
						className="absolute -left-[5px] top-[311px] h-[48px] w-[5px] rounded-l-full bg-white/85 shadow-[inset_-1px_0_1px_rgba(0,0,0,0.35)]"
						aria-hidden
					/>
					<div
						className="absolute -right-[5px] top-[254px] h-[126px] w-[5px] rounded-r-full bg-white/80 shadow-[inset_1px_0_1px_rgba(0,0,0,0.4)]"
						aria-hidden
					/>

					<div className="absolute inset-[10px] overflow-hidden rounded-[4rem] bg-black p-[8px]">
						<div
							className="relative h-full w-full overflow-hidden rounded-[3.35rem] bg-background px-0"
							style={
								{
									paddingTop: IPHONE_15_TOP_SAFE_AREA,
									paddingBottom: IPHONE_15_BOTTOM_SAFE_AREA,
								} as CSSProperties
							}
						>
							<div
								className="h-full min-h-0 overflow-hidden"
								style={{ '--vh-screen': `${IPHONE_15_APP_HEIGHT}px` } as CSSProperties}
							>
								<MobisiteApp />
							</div>
						</div>

						<div
							className="pointer-events-none absolute left-1/2 top-[23px] z-30 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.45)]"
							aria-hidden
						/>
						<div
							className="pointer-events-none absolute left-[251px] top-[36px] z-40 h-[6px] w-[6px] rounded-full bg-white/20"
							aria-hidden
						/>
						<div
							className="pointer-events-none absolute left-[252px] top-[37px] z-40 h-[2px] w-[2px] rounded-full bg-black/80"
							aria-hidden
						/>

						<div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex h-[69px] items-center justify-between px-[47px] pt-2 text-[14px] font-semibold text-white">
							<span>9:41</span>
							<span className="flex items-center gap-1.5">
								<Signal className="h-3.5 w-3.5" strokeWidth={2.5} />
								<Wifi className="h-3.5 w-3.5" strokeWidth={2.5} />
								<Battery className="h-3.5 w-5" strokeWidth={2.5} />
							</span>
						</div>

						<div
							className="pointer-events-none absolute bottom-[13px] left-1/2 z-20 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-white/45"
							aria-hidden
						/>
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
