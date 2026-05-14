import React from 'react';
import { motion } from 'framer-motion';
import {
	FiBarChart2,
	FiBriefcase,
	FiClock,
	FiCpu,
	FiFileText,
	FiList,
	FiRefreshCw,
	FiTarget,
} from 'react-icons/fi';

import expenses from '@/assets/images/previews/recurring-expenses.png';
import reports from '@/assets/images/previews/reports.png';
import auto from '@/assets/images/previews/auto-fill.png';

const Features: React.FC = () => {
	const features = [
		{
			icon: <FiBriefcase size={24} />,
			title: 'Multiple accounts',
			desc: 'Track cash, savings, debit, and credit balances without mixing everything together.',
		},
		{
			icon: <FiList size={24} />,
			title: 'Income, expenses, and transfers',
			desc: 'Log daily activity quickly, including money moved between your own accounts.',
		},
		{
			icon: <FiTarget size={24} />,
			title: 'Budgets that match real periods',
			desc: 'Draft a budget, publish it, and compare actual spending against the dates you choose.',
		},
		{
			icon: <FiRefreshCw size={24} />,
			title: 'Recurring payments and Quick Fill',
			desc: 'Save regular bills or income once, then use them to fill new transactions faster.',
		},
		{
			icon: <FiBarChart2 size={24} />,
			title: 'Clear reports',
			desc: 'See spending by category, account, monthly trend, income, expenses, and net worth.',
		},
		{
			icon: <FiFileText size={24} />,
			title: 'Flexible data tools',
			desc: 'Import and export CSV or JSON, manage categories, and choose which filters stay visible.',
		},
		{
			icon: <FiCpu size={24} />,
			title: 'AI spending questions',
			desc: 'Ask about your own spending patterns, merchants, categories, and account activity.',
		},
		{
			icon: <FiClock size={24} />,
			title: 'Cloud sync and themes',
			desc: 'Your account stays synced across devices, with light and dark mode built in.',
		},
	];

	const demoSections = [
		{
			title: 'Stay ahead of recurring money',
			desc: 'Keep regular bills and income ready, then use Quick Fill when it is time to log them.',
			image: expenses,
		},
		{
			title: 'Log everyday activity faster',
			desc: 'Create income, expense, or transfer records with the account, category, date, and notes you need.',
			image: auto,
		},
		{
			title: 'Understand the bigger picture',
			desc: 'Use reports to compare categories, accounts, income, expenses, monthly trends, and net worth.',
			image: reports,
		},
	];

	return (
		<>
			{/* Key Features */}
			<section
				id="features"
				className="relative bg-gray-950 px-4 py-24 sm:px-6 lg:px-8"
			>
				<div className="relative max-w-7xl mx-auto">
					<motion.div
						className="mx-auto mb-14 max-w-3xl text-center"
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-400">
							Features
						</p>
						<h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
							Built for everyday money decisions
						</h2>
						<p className="text-base leading-relaxed text-gray-400 md:text-lg">
							Everything is organized around the things people actually check:
							what came in, what went out, what is planned, and what changed.
						</p>
					</motion.div>

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{features.map((feature, i) => (
							<motion.div
								key={i}
								className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-colors hover:bg-gray-900"
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: i * 0.08 }}
							>
								<div className="space-y-4">
									<div className="inline-flex rounded-lg bg-blue-500/10 p-3 text-blue-400">
										{feature.icon}
									</div>
									<div>
										<h3 className="mb-2 text-lg font-semibold text-white">
											{feature.title}
										</h3>
										<p className="text-sm leading-relaxed text-gray-400">
											{feature.desc}
										</p>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Demo Sections */}
			<section
				id="reports"
				className="relative bg-gray-950 px-4 py-24 sm:px-6 lg:px-8"
			>
				<div className="max-w-7xl mx-auto">
					<motion.div
						className="mx-auto mb-16 max-w-4xl text-center"
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-400">
							Reports and workflows
						</p>
						<h2 className="text-3xl font-bold text-white md:text-4xl">
							See what changed, then decide what to do next
						</h2>
					</motion.div>

					<div className="space-y-20">
						{demoSections.map((item, i) => (
							<motion.div
								key={i}
								className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
									i % 2 === 1 ? 'lg:flex-row-reverse' : ''
								}`}
								initial={{ opacity: 0, y: 40 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6, delay: 0.1 }}
							>
								<div className={`${i % 2 === 1 ? 'lg:order-2' : ''}`}>
									<h3 className="mb-3 text-2xl font-bold text-white md:text-3xl">
										{item.title}
									</h3>
									<p className="max-w-xl text-base leading-relaxed text-gray-400 md:text-lg">
										{item.desc}
									</p>
								</div>
								<div
									className={`relative ${i % 2 === 1 ? 'lg:order-1' : ''}`}
								>
									<div className="relative">
										<img
											src={item.image}
											alt={item.title}
											className="w-full"
											loading="lazy"
										/>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</>
	);
};

export default Features;
