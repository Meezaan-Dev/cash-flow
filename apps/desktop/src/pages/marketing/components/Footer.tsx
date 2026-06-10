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
								Join people who have found financial clarity with CashFlow. Free to get started, no credit card required.
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

						{/* Legal */}
						<div>
							<h4 className="mb-4 text-sm font-semibold text-gray-900">Legal</h4>
							<ul className="space-y-3">
								{['Privacy Policy', 'Terms of Service', 'Contact'].map((l) => (
									<li key={l}>
										<a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l}</a>
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
						<div className="flex gap-3">
							{/* X / Twitter */}
							<a href="#" aria-label="Twitter" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
							</a>
							{/* GitHub */}
							<a href="#" aria-label="GitHub" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
								</svg>
							</a>
						</div>
					</div>
				</div>
			</footer>
		</>
	);
};

export default Footer;