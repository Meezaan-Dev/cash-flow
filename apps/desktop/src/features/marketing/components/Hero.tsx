import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
	onAuthClick: (mode: 'login' | 'register') => void;
}

const accountCards = [
	{ label: 'Checking', value: 'R 12,450', tone: 'text-white' },
	{ label: 'Savings', value: 'R 8,200', tone: 'text-green-400' },
	{ label: 'Credit', value: '-R 2,100', tone: 'text-red-400' },
];

const transactions = [
	{ name: 'Rent', amount: '-R 7,500', negative: true },
	{ name: 'Salary', amount: '+R 22,000', negative: false },
	{ name: 'Groceries', amount: '-R 1,240', negative: true },
	{ name: 'Petrol', amount: '-R 640', negative: true },
];

const bars = [
	{ height: '55%', highlight: false },
	{ height: '80%', highlight: true },
	{ height: '60%', highlight: false },
	{ height: '70%', highlight: true },
	{ height: '40%', highlight: false },
	{ height: '90%', highlight: true },
	{ height: '55%', highlight: false },
	{ height: '80%', highlight: true },
];

const Hero: React.FC<HeroProps> = ({ onAuthClick }) => {
	return (
		<section
			id="home"
			className="relative overflow-hidden bg-black px-4 pb-16 pt-28 text-center sm:px-6 lg:px-8 lg:pb-20 lg:pt-36"
		>
			<div className="pointer-events-none absolute left-1/2 top-10 h-80 w-[min(44rem,90vw)] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

			<div className="relative mx-auto max-w-7xl">
				<motion.div
					className="mx-auto max-w-5xl"
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.65, ease: 'easeOut' }}
				>
					<div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 px-3.5 py-1.5 text-xs font-medium text-blue-300">
						Simple money tracking
					</div>
					<h1 className="text-4xl font-extrabold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
						See your money
						<br />
						clearly.
					</h1>
					<p className="mt-4 text-lg font-semibold text-blue-500">
						The personal finance workspace
					</p>
					<p className="mx-auto mt-4 max-w-[21rem] text-base leading-relaxed text-gray-500 sm:max-w-2xl">
						CashFlow helps you track accounts, spending, budgets, and reports in
						one clean dashboard with less guesswork at the end of every month.
					</p>

					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<button
							onClick={() => onAuthClick('register')}
							className="group inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
						>
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
							Get Started Free
						</button>

						<button
							onClick={() => onAuthClick('login')}
							className="inline-flex items-center justify-center rounded-full border border-white/10 px-7 py-3.5 text-sm font-semibold text-gray-400 transition-colors hover:border-white/20 hover:text-white"
						>
							Login / Try demo account
						</button>
					</div>
				</motion.div>

				<motion.div
					className="mx-auto mt-12 w-full max-w-[22.5rem] overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#080808] p-4 text-left shadow-2xl shadow-blue-950/20 sm:max-w-4xl sm:p-5"
					initial={{ opacity: 0, y: 36 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
				>
					<div className="mb-4 flex gap-1.5">
						<div className="h-2 w-2 rounded-full bg-white/10" />
						<div className="h-2 w-2 rounded-full bg-white/10" />
						<div className="h-2 w-2 rounded-full bg-white/10" />
					</div>

					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						{accountCards.map((card) => (
							<div
								key={card.label}
								className="min-w-0 rounded-lg border border-white/[0.06] bg-[#0d0d0d] p-4"
							>
								<p className="mb-1 text-[10px] text-gray-600">{card.label}</p>
								<p className={`text-lg font-bold ${card.tone}`}>
									{card.value}
								</p>
							</div>
						))}
					</div>

					<div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2.2fr]">
						<div className="min-w-0 rounded-lg border border-white/[0.06] bg-[#0d0d0d] p-4">
							{transactions.map((item) => (
								<div
									key={item.name}
									className="flex items-center justify-between border-b border-white/[0.04] py-1.5 last:border-b-0"
								>
									<span className="min-w-0 truncate text-xs text-gray-600">
										{item.name}
									</span>
									<span
										className={`ml-3 flex-shrink-0 text-xs font-semibold ${
											item.negative ? 'text-red-400' : 'text-white'
										}`}
									>
										{item.amount}
									</span>
								</div>
							))}
						</div>

						<div className="min-w-0 rounded-lg border border-white/[0.06] bg-[#0d0d0d] p-4">
							<p className="mb-3 text-[10px] text-gray-600">Monthly spending</p>
							<div className="flex h-20 items-end gap-1.5">
								{bars.map((bar, index) => (
									<div
										key={`${bar.height}-${index}`}
										className={`flex-1 rounded-t-sm ${
											bar.highlight ? 'bg-blue-600' : 'bg-white/10'
										}`}
										style={{ height: bar.height }}
									/>
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
