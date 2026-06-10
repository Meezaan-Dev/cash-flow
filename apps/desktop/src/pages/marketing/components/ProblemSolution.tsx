import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2, TrendingUp, Wallet } from 'lucide-react';

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

const transactions = [
	{ name: 'Checkers', date: 'Today', amount: 'R 1 420.50', type: 'expense' },
	{ name: 'Salary Deposit', date: 'Yesterday', amount: '+ R 32 000.00', type: 'income' },
	{ name: 'Netflix', date: '12 Jun', amount: 'R 199.00', type: 'expense' },
	{ name: 'Uber', date: '10 Jun', amount: 'R 145.00', type: 'expense' },
];

const securityItems = [
	'End to end encryption',
	'No third party data sharing',
	'Data stored in South Africa',
	'Delete your account at any time',
];

const ProblemSolution: React.FC = () => {
	const ref = React.useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
	const cardY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

	return (
		<>
			{/* ── How it helps ── */}
			<section
				id="how-it-helps"
				className="bg-white px-4 py-24 sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-6xl">
					<div className="mx-auto max-w-xl text-center mb-14">
						<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-600">
							How it helps
						</div>
						<h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl mb-4">
							From scattered spending
							<br />to clear decisions
						</h2>
						<p className="text-base leading-relaxed text-gray-500">
							Designed for normal money management: quick updates, clear views, and fewer surprises at the end of the month.
						</p>
					</div>

					{/* Steps */}
					<div className="grid gap-5 sm:grid-cols-3">
						{steps.map((item, i) => (
							<motion.div
								key={item.title}
								className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.1, duration: 0.45 }}
							>
								<div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
									{i + 1}
								</div>
								<h3 className="mb-2 text-base font-semibold text-gray-900">{item.title}</h3>
								<p className="text-sm leading-relaxed text-gray-500">{item.body}</p>
							</motion.div>
						))}
					</div>

					{/* Benefits */}
					<div className="mt-5 grid gap-4 sm:grid-cols-3">
						{benefits.map((item, i) => (
							<motion.div
								key={item.title}
								className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4"
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.08, duration: 0.4 }}
							>
								<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
								<div>
									<p className="text-sm font-semibold text-gray-800">{item.title}</p>
									<p className="mt-1 text-xs leading-relaxed text-gray-500">{item.body}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ── Transaction deep-dive ── */}
			<section className="overflow-hidden bg-gray-50 px-4 py-24 md:py-32 sm:px-6 lg:px-8" ref={ref}>
				<div className="mx-auto max-w-6xl">
					<div className="grid gap-16 lg:grid-cols-2 lg:items-center">
						{/* Parallax card */}
						<div className="relative order-2 lg:order-1">
							<motion.div
								className="relative z-10 rounded-2xl border border-gray-200 bg-white shadow-xl p-8"
								style={{ y: cardY }}
							>
								<div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
									<h4 className="font-semibold text-base text-gray-900">Recent Transactions</h4>
									<button className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors">
										View all
									</button>
								</div>
								<div className="space-y-2">
									{transactions.map((tx, i) => (
										<div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors">
											<div className="flex items-center gap-3">
												<div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tx.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
													{tx.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
												</div>
												<div>
													<p className="text-sm font-medium text-gray-800">{tx.name}</p>
													<p className="text-xs text-gray-400">{tx.date}</p>
												</div>
											</div>
											<span className={`font-mono text-sm font-medium ${tx.type === 'income' ? 'text-blue-600' : 'text-gray-700'}`}>
												{tx.amount}
											</span>
										</div>
									))}
								</div>
							</motion.div>
							{/* Glow */}
							<div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[80px]" />
						</div>

						{/* Text */}
						<div className="order-1 space-y-6 lg:order-2">
							<h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl md:text-5xl leading-tight">
								Know exactly<br />where it goes.
							</h2>
							<p className="text-lg leading-relaxed text-gray-500">
								Stop guessing at the end of the month. CashFlow categorises your spending and presents it in a way that actually makes sense.
							</p>
							<ul className="space-y-4">
								{[
									'Smart categorisation',
									'Custom tags and labels',
									'Recurring expense detection',
									'Export to CSV at any time',
								].map((item) => (
									<li key={item} className="flex items-center gap-3">
										<div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
											<CheckCircle2 className="h-3 w-3" />
										</div>
										<span className="text-sm font-medium text-gray-700">{item}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* ── Security ── */}
			<section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-4xl">
					<div className="rounded-3xl border border-gray-200 bg-gray-50 p-10 md:p-16 grid md:grid-cols-2 gap-12 items-center shadow-sm">
						<div className="space-y-5">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
									<polyline points="9 12 11 14 15 10" />
								</svg>
							</div>
							<h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl leading-tight">
								Your data stays yours. Always.
							</h2>
							<p className="text-base leading-relaxed text-gray-500">
								CashFlow never sells, shares or brokers your financial data. End to end encryption means what happens in your account stays in your account.
							</p>
						</div>
						<ul className="space-y-4">
							{securityItems.map((item) => (
								<li key={item} className="flex items-center gap-3">
									<div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
											<polyline points="20 6 9 17 4 12" />
										</svg>
									</div>
									<span className="text-sm font-medium text-gray-700">{item}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>
		</>
	);
};

export default ProblemSolution;