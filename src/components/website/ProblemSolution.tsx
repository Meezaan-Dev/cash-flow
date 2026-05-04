import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const steps = [
	{
		title: 'Start with your accounts',
		body: 'Add the places your money lives, then CashFlow keeps balances connected to every transaction and transfer you log.',
	},
	{
		title: 'Plan before the month gets away',
		body: 'Create budget drafts, choose the dates that matter, and compare planned spending with real activity.',
	},
	{
		title: 'Review with less guesswork',
		body: 'Use filters, reports, and the AI assistant to answer practical questions about categories, merchants, accounts, and trends.',
	},
];

const benefits = [
	{
		title: 'Less manual cleanup',
		body: 'Recurring templates, Quick Fill, imports, exports, and custom categories keep regular admin small.',
	},
	{
		title: 'Better day-to-day visibility',
		body: 'Search, date ranges, category filters, and account views make it easier to understand a specific period.',
	},
	{
		title: 'Confidence across devices',
		body: 'Your data is scoped to your account and synced securely, so the numbers stay available when you need them.',
	},
];

const ProblemSolution: React.FC = () => {
	return (
		<section
			id="how-it-helps"
			className="relative bg-gray-950 px-4 py-24 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-6xl">
				<motion.div
					className="mx-auto mb-14 max-w-3xl text-center"
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-400">
						How it helps
					</p>
					<h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
						Simple steps from scattered spending to clear decisions
					</h2>
					<p className="text-base leading-relaxed text-gray-400 md:text-lg">
						CashFlow is designed for normal money management: quick updates,
						clear views, and fewer surprises at the end of the month.
					</p>
				</motion.div>

				<motion.div
					className="grid gap-4 md:grid-cols-3"
					initial={{ opacity: 0, y: 32 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.1 }}
				>
					{steps.map((item, i) => (
						<div
							key={item.title}
							className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
						>
							<div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-sm font-bold text-blue-400">
								{i + 1}
							</div>
							<h3 className="mb-2 text-lg font-semibold text-white">
								{item.title}
							</h3>
							<p className="text-sm leading-relaxed text-gray-400">{item.body}</p>
						</div>
					))}
				</motion.div>

				<div className="mt-6 grid gap-3 md:grid-cols-3">
					{benefits.map((item) => (
						<div key={item.title} className="flex gap-3 rounded-lg p-3">
							<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
							<div>
								<p className="font-medium text-white">{item.title}</p>
								<p className="mt-1 text-sm leading-relaxed text-gray-400">
									{item.body}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default ProblemSolution;
