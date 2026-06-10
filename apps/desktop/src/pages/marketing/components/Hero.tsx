import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface HeroProps {
	onAuthClick: (mode: 'login' | 'register') => void;
}

const accountCards = [
	{ label: 'Checking', value: 'R 12,450', tone: 'text-gray-900' },
	{ label: 'Savings', value: 'R 8,200', tone: 'text-emerald-600' },
	{ label: 'Credit', value: '-R 2,100', tone: 'text-red-500' },
];

const transactions = [
	{ name: 'Rent', amount: '-R 7,500', negative: true, date: 'Today' },
	{ name: 'Salary', amount: '+R 22,000', negative: false, date: 'Yesterday' },
	{ name: 'Groceries', amount: '-R 1,240', negative: true, date: '12 Jun' },
	{ name: 'Petrol', amount: '-R 640', negative: true, date: '10 Jun' },
];

const bars = [
	{ height: '55%' }, { height: '80%' }, { height: '60%' }, { height: '70%' },
	{ height: '40%' }, { height: '90%' }, { height: '55%' }, { height: '80%' },
	{ height: '65%' }, { height: '75%' }, { height: '50%' }, { height: '85%' },
];

const Hero: React.FC<HeroProps> = ({ onAuthClick }) => {
	return (
		<section
			id="home"
			className="relative overflow-hidden bg-white pt-32 pb-32 md:pt-44 md:pb-44 px-4 sm:px-6 lg:px-8"
		>
			{/* Subtle radial gradient */}
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
						The beautifully simple personal finance workspace that helps you track accounts, spending, budgets, and reports with less guesswork at the end of every month.
					</p>

					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<button
							onClick={() => onAuthClick('register')}
							className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-xl sm:w-auto"
						>
							Get started free
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
						</button>
						{/* <button
							onClick={() => onAuthClick('login')}
							className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-gray-300 hover:text-gray-900 sm:w-auto"
						>
							View live demo
						</button> */}
					</div>
				</motion.div>

				{/* App mockup */}
				<motion.div
					className="mx-auto mt-20 w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl"
					initial={{ opacity: 0, y: 48 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
				>
					{/* Browser chrome */}
					<div className="flex items-center px-4 py-3 border-b border-gray-100 bg-gray-50/80">
						<div className="flex gap-1.5">
							<div className="h-3 w-3 rounded-full bg-red-400/70" />
							<div className="h-3 w-3 rounded-full bg-amber-400/70" />
							<div className="h-3 w-3 rounded-full bg-emerald-400/70" />
						</div>
						<div className="mx-auto flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-1 font-mono text-xs text-gray-400">
							DONT USE EXCEL, USE CASHFLOW
						</div>
					</div>

					{/* Dashboard content */}
					<div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-3 sm:p-8 bg-white">
						{/* Account cards */}
						{accountCards.map((card) => (
							<div
								key={card.label}
								className="rounded-xl border border-gray-100 bg-gray-50/60 p-5"
							>
								<p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
									{card.label}
								</p>
								<p className={`text-2xl font-semibold font-mono ${card.tone}`}>
									{card.value}
								</p>
							</div>
						))}
					</div>

					<div className="grid gap-5 px-6 pb-6 sm:grid-cols-[1fr_2.2fr] sm:px-8 sm:pb-8">
						{/* Transactions */}
						<div className="rounded-xl border border-gray-100 bg-white p-5">
							<p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
								Recent
							</p>
							{transactions.map((item) => (
								<div
									key={item.name}
									className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-b-0"
								>
									<div>
										<p className="text-sm font-medium text-gray-700">{item.name}</p>
										<p className="text-xs text-gray-400">{item.date}</p>
									</div>
									<span className={`ml-3 flex-shrink-0 text-sm font-semibold font-mono ${item.negative ? 'text-gray-700' : 'text-blue-600'}`}>
										{item.amount}
									</span>
								</div>
							))}
						</div>

						{/* Chart */}
						<div className="rounded-xl border border-gray-100 bg-white p-5">
							<div className="mb-1 flex items-center justify-between">
								<p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
									Monthly spending
								</p>
								<div className="flex items-center gap-1 text-xs font-medium text-blue-600">
									<TrendingUp className="h-3 w-3" /> +12% vs last month
								</div>
							</div>
							<div className="mt-4 flex h-24 items-end gap-1.5">
								{bars.map((bar, index) => (
									<motion.div
										key={index}
										className="flex-1 rounded-t-sm bg-blue-100 relative"
										style={{ height: '100%' }}
									>
										<motion.div
											className="absolute bottom-0 w-full rounded-t-sm bg-blue-500"
											initial={{ height: 0 }}
											animate={{ height: bar.height }}
											transition={{ duration: 0.8, delay: index * 0.04, ease: 'easeOut' }}
										/>
									</motion.div>
								))}
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default Hero;