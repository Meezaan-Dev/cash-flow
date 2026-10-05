import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LedgerGhostMascot } from '@cash-flow/ui';

interface HeroProps {
	onAuthClick: (mode: 'login' | 'register') => void;
}

const navItems = ['Dashboard', 'Transactions', 'Planning', 'Accounts', 'Budgets'];

const comingUp = [
	{ name: 'Rent', meta: 'Recurring · Fri 21 Jun', amount: 'R 9,000' },
	{ name: 'New shoes', meta: 'Planned · Personal', amount: 'R 800' },
];

const recent = [
	{ name: 'Salary', amount: '+R 22,000', negative: false, date: 'Today' },
	{ name: 'Checkers', amount: '-R 1,240', negative: true, date: 'Yesterday' },
	{ name: 'Petrol', amount: '-R 640', negative: true, date: '12 Jun' },
];

const Hero: React.FC<HeroProps> = ({ onAuthClick }) => {
	return (
		<section
			id="home"
			className="relative overflow-hidden bg-white pt-32 pb-32 md:pt-44 md:pb-44 px-4 sm:px-6 lg:px-8"
		>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.10),transparent)]" />

			<div className="relative mx-auto max-w-4xl text-center">
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, ease: 'easeOut' }}
				>
					<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-600">
						Simple money tracking
					</div>

					<h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
						Clarity, control and{' '}
						<br className="hidden sm:block" />
						<span className="text-blue-600">peace of mind</span>
						{' '}with money.
					</h1>

					<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500">
						A calm desktop dashboard for available balance, what&apos;s coming up, and recent
						activity—plus a quick side panel when you need to add a transaction.
					</p>

					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<button
							onClick={() => onAuthClick('register')}
							className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-xl sm:w-auto"
						>
							Get started free
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
						</button>
					</div>
				</motion.div>

				<motion.div
					className="mx-auto mt-20 w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl"
					initial={{ opacity: 0, y: 48 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
				>
					<div className="flex items-center border-b border-gray-100 bg-white px-4 py-3">
						<div className="flex gap-1.5">
							<div className="h-3 w-3 rounded-full bg-red-400/70" />
							<div className="h-3 w-3 rounded-full bg-amber-400/70" />
							<div className="h-3 w-3 rounded-full bg-emerald-400/70" />
						</div>
						<div className="mx-auto rounded-md border border-gray-200 bg-white px-4 py-1 font-mono text-xs text-gray-400">
							cashflow.app/dashboard
						</div>
					</div>

					<div className="flex min-h-[320px] bg-white">
						<aside className="hidden w-36 shrink-0 border-r border-gray-200 bg-white p-3 sm:block">
							<div className="flex items-center gap-2">
								<LedgerGhostMascot size="sm" decorative className="h-7 w-7 shadow-sm" />
								<p className="text-xs font-semibold text-gray-900">CashFlow</p>
							</div>
							<p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
								Available
							</p>
							<p className="font-mono text-xs font-semibold text-emerald-600">R 18,550</p>
							<div className="mt-4 space-y-1">
								{navItems.map((item, index) => (
									<div
										key={item}
										className={`rounded-lg px-2 py-1.5 text-[10px] font-medium ${
											index === 0
												? 'bg-blue-50 text-blue-700'
												: 'text-gray-600'
										}`}
									>
										{item}
									</div>
								))}
							</div>
						</aside>

						<div className="relative min-w-0 flex-1 p-5 sm:p-6">
							<p className="text-xs font-medium text-gray-500">Available</p>
							<p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-gray-950">
								R 18,550
							</p>
							<p className="mt-1 text-xs text-gray-500">
								Net worth <span className="font-mono font-medium">R 21,200</span>
							</p>

							<div className="mt-4 grid max-w-sm grid-cols-2 gap-2">
								<div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left">
									<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										Spent this month
									</p>
									<p className="mt-1 font-mono text-sm font-semibold text-gray-800">
										R 6,420
									</p>
								</div>
								<div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left">
									<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										Coming up
									</p>
									<p className="mt-1 text-sm font-semibold text-gray-900">2 items</p>
								</div>
							</div>

							<div className="mt-5 grid gap-3 sm:grid-cols-2">
								<div className="rounded-xl border border-gray-200 bg-white p-3 text-left">
									<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										Coming up
									</p>
									{comingUp.map((item) => (
										<div
											key={item.name}
											className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 first:mt-2 first:border-t-0 first:pt-0"
										>
											<div className="min-w-0">
												<p className="truncate text-xs font-medium text-gray-800">
													{item.name}
												</p>
												<p className="truncate text-[10px] text-gray-400">{item.meta}</p>
											</div>
											<span className="font-mono text-[10px] font-semibold text-gray-700">
												{item.amount}
											</span>
										</div>
									))}
								</div>
								<div className="rounded-xl border border-gray-200 bg-white p-3 text-left">
									<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										Recent
									</p>
									{recent.map((item) => (
										<div
											key={item.name}
											className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 first:mt-2 first:border-t-0 first:pt-0"
										>
											<div>
												<p className="text-xs font-medium text-gray-800">{item.name}</p>
												<p className="text-[10px] text-gray-400">{item.date}</p>
											</div>
											<span
												className={`font-mono text-[10px] font-semibold ${
													item.negative ? 'text-gray-700' : 'text-blue-600'
												}`}
											>
												{item.amount}
											</span>
										</div>
									))}
								</div>
							</div>

							<div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] border-l border-gray-200 bg-white/95 shadow-[-12px_0_40px_rgba(15,23,42,0.08)] sm:block">
								<div className="border-b border-gray-100 px-4 py-4">
									<div className="flex items-center gap-2">
										<LedgerGhostMascot size="sm" decorative className="h-8 w-8 shadow-sm" />
										<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
											New
										</p>
									</div>
									<p className="mt-1 text-sm font-semibold text-gray-900">Add transaction</p>
								</div>
								<div className="space-y-3 p-4">
									<div className="grid grid-cols-3 gap-1">
										{['expense', 'income', 'transfer'].map((type, index) => (
											<div
												key={type}
												className={`rounded-lg py-1.5 text-center text-[9px] font-semibold capitalize ${
													index === 0
														? 'bg-blue-600 text-white'
														: 'border border-gray-200 text-gray-600'
												}`}
											>
												{type}
											</div>
										))}
									</div>
									{['Title', 'Amount', 'Account'].map((label) => (
										<div key={label}>
											<p className="text-[9px] font-medium text-gray-500">{label}</p>
											<div className="mt-1 h-7 rounded-lg border border-gray-200 bg-white" />
										</div>
									))}
									<div className="mt-2 h-8 rounded-lg bg-blue-600" />
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default Hero;
