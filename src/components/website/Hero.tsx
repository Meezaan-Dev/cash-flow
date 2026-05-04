import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import dashboard from '@/assets/images/previews/dashboard.png';

interface HeroProps {
	onAuthClick: (mode: 'login' | 'register') => void;
}

const Hero: React.FC<HeroProps> = ({ onAuthClick }) => {
	return (
		<section
			id="home"
			className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-32"
		>
			<div className="absolute inset-0 bg-gray-950" />
			<div className="absolute inset-x-0 top-0 h-px bg-blue-400/30" />

			<div className="relative max-w-7xl mx-auto w-full">
				<div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
					<motion.div
						className="space-y-6"
						initial={{ opacity: 0, x: -40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.7, delay: 0.1 }}
					>
						<div className="space-y-4">
							<p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
								Simple money tracking
							</p>
							<h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
								See your money clearly.
							</h1>
							<p className="max-w-lg text-base leading-relaxed text-gray-300 lg:text-lg">
								CashFlow helps you track accounts, spending, budgets, and reports
								in one easy dashboard.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<motion.button
								onClick={() => onAuthClick('register')}
								whileTap={{ scale: 0.97 }}
								className="group inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 lg:px-7 lg:py-3.5 lg:text-base"
							>
								Get Started Free
								<ArrowRight
									size={18}
									className="transition-transform group-hover:translate-x-1"
								/>
							</motion.button>

							<motion.button
								onClick={() => onAuthClick('login')}
								whileTap={{ scale: 0.97 }}
								className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 hover:text-white lg:px-7 lg:py-3.5 lg:text-base"
							>
								Login / Try demo account
							</motion.button>
						</div>
					</motion.div>

					<motion.div
						className="relative flex justify-center"
						initial={{ opacity: 0, x: 40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.7, delay: 0.2 }}
					>
						<img
							src={dashboard}
							alt="CashFlow dashboard showing accounts, transactions, and reports"
							className="w-full"
							loading="lazy"
						/>
					</motion.div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
