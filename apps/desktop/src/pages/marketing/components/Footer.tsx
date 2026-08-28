import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FooterProps {
	onAuthClick?: (mode: 'login' | 'register') => void;
}

const Footer: React.FC<FooterProps> = ({ onAuthClick }) => {
	return (
		<>
			{/* ── CTA section ── */}
			<section className="bg-gray-50 px-4 py-24 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-4xl">
					<div className="relative overflow-hidden rounded-3xl bg-blue-600 px-10 py-16 md:px-20 text-center shadow-xl">
						{/* Ambient glows */}
						<div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-[80px]" />
						<div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-[80px]" />

						<div className="relative z-10">
							<h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl mb-5">
								Ready to take control?
							</h2>
							<p className="text-lg text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
								Start tracking accounts, transactions, budgets, reports, and recurring templates in one private workspace. Free to get started, no credit card required.
							</p>
							<button
								onClick={() => onAuthClick?.('register')}
								className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-base font-semibold text-blue-600 shadow-lg hover:bg-white/90 hover:shadow-xl transition-all"
							>
								Try CashFlow for free <ArrowRight className="h-4 w-4" />
							</button>
							<p className="mt-5 text-sm text-white/50">
								Free forever for personal use. No hidden fees.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── Footer ── */}
			<footer className="border-t border-gray-100 bg-white px-4 py-12 sm:px-6 lg:px-8 md:py-16">
				<div className="mx-auto max-w-6xl">
					<div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12 mb-12">
						{/* Brand */}
						<div className="col-span-2">
							<div className="mb-4">
								<span className="text-lg font-semibold tracking-tight text-gray-900">CashFlow</span>
							</div>
							<p className="max-w-xs text-sm leading-relaxed text-gray-500">
								Clarity, control and peace of mind with your money. Built with care by Meezaan.
							</p>
						</div>

						{/* Product */}
						<div>
							<h4 className="mb-4 text-sm font-semibold text-gray-900">Product</h4>
							<ul className="space-y-3">
								{['Features', 'How it helps', 'FAQ'].map((l) => (
									<li key={l}>
										<a href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
											{l}
										</a>
									</li>
								))}
							</ul>
						</div>

						{/* Project */}
						<div>
							<h4 className="mb-4 text-sm font-semibold text-gray-900">Project</h4>
							<ul className="space-y-3">
								{['Personal-use app', 'Privacy info in product copy', 'Built by Meezaan'].map((l) => (
									<li key={l}>
										<span className="text-sm text-gray-500">{l}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 md:flex-row">
						<p className="text-sm text-gray-400">
							© {new Date().getFullYear()} CashFlow by Meezaan Davids. All rights reserved.
						</p>
						<p className="text-sm text-gray-400">Personal finance tracking for private use.</p>
					</div>
				</div>
			</footer>
		</>
	);
};

export default Footer;
