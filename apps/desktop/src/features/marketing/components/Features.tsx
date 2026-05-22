import React from 'react';
import {
	BarChart3,
	BriefcaseBusiness,
	Cpu,
	FileText,
	LayoutGrid,
	List,
	RefreshCw,
	Target,
	type LucideIcon,
} from 'lucide-react';

type Feature = {
	icon: LucideIcon;
	title: string;
	desc: string;
};

const features: Feature[] = [
	{
		icon: BriefcaseBusiness,
		title: 'Multiple accounts',
		desc: 'Track cash, savings, debit, and credit without mixing balances.',
	},
	{
		icon: List,
		title: 'Income and expenses',
		desc: 'Log daily activity quickly, including transfers between accounts.',
	},
	{
		icon: Target,
		title: 'Real budgets',
		desc: 'Draft, publish, and compare planned spending to actual activity.',
	},
	{
		icon: RefreshCw,
		title: 'Recurring + Quick Fill',
		desc: 'Save regular bills once, then fill new transactions in seconds.',
	},
	{
		icon: BarChart3,
		title: 'Clear reports',
		desc: 'Spending by category, account, trend, income, and net worth.',
	},
	{
		icon: FileText,
		title: 'Data tools',
		desc: 'Import and export CSV or JSON. Manage categories and filters.',
	},
	{
		icon: Cpu,
		title: 'AI spending questions',
		desc: 'Ask about patterns, merchants, categories, and account trends.',
	},
	{
		icon: LayoutGrid,
		title: 'Cloud sync',
		desc: 'Synced across devices with light and dark mode built in.',
	},
];

const Features: React.FC = () => {
	return (
		<section
			id="features"
			className="border-t border-white/[0.06] bg-black px-4 py-14 sm:px-6 lg:px-8"
		>
			<div className="relative mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center">
					<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 px-3 py-1 text-xs font-medium text-blue-300">
						Features
					</div>
					<h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
						Built for everyday money decisions
					</h2>
					<p className="text-sm leading-relaxed text-gray-500">
						Everything is organized around the things people actually check:
						what came in, what went out, what is planned, and what changed.
					</p>
				</div>

				<div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-white/[0.07]">
					{features.map((feature) => {
						const Icon = feature.icon;

						return (
							<div
								key={feature.title}
								className="flex gap-4 border-b border-white/[0.06] bg-black p-5 last:border-b-0 sm:items-center"
							>
								<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-blue-500/30 bg-blue-950/40 text-blue-300">
									<Icon className="h-4 w-4" />
								</div>
								<div className="min-w-0 sm:flex sm:flex-1 sm:items-center sm:justify-between sm:gap-6">
									<h3 className="text-sm font-semibold text-gray-200 sm:w-48 sm:flex-shrink-0">
										{feature.title}
									</h3>
									<p className="mt-1 text-sm leading-relaxed text-gray-600 sm:mt-0">
										{feature.desc}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default Features;
