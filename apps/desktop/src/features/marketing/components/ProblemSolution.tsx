import React from 'react';
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
			className="border-t border-white/[0.06] bg-black px-4 py-14 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-xl text-center">
					<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 px-3 py-1 text-xs font-medium text-blue-300">
						How it helps
					</div>
					<h2 className="mb-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
						From scattered spending
						<br />
						to clear decisions
					</h2>
					<p className="text-sm leading-relaxed text-gray-500">
						Designed for normal money management: quick updates,
						clear views, and fewer surprises at the end of the month.
					</p>
				</div>

				<div className="mt-7 grid gap-3 md:grid-cols-3">
					{steps.map((item, i) => (
						<div
							key={item.title}
							className="rounded-xl border border-white/[0.08] bg-[#080808] p-5"
						>
							<div className="mb-3 flex h-7 w-7 items-center justify-center rounded-md border border-blue-500/30 bg-blue-950/40 text-xs font-bold text-blue-300">
								{i + 1}
							</div>
							<h3 className="mb-1.5 text-sm font-semibold text-gray-200">
								{item.title}
							</h3>
							<p className="text-xs leading-relaxed text-gray-600">{item.body}</p>
						</div>
					))}
				</div>

				<div className="mt-3 grid gap-3 md:grid-cols-3">
					{benefits.map((item) => (
						<div
							key={item.title}
							className="flex gap-3 rounded-lg border border-white/[0.06] bg-[#060606] p-3"
						>
							<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
							<div>
								<p className="text-xs font-semibold text-gray-300">{item.title}</p>
								<p className="mt-1 text-xs leading-relaxed text-gray-600">
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
