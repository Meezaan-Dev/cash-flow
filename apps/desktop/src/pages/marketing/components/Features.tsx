import React from 'react';
import { motion } from 'framer-motion';
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
	illustration: React.ReactNode;
};

function IllustrationAccounts() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<defs>
				<linearGradient id="fa1" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
					<stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
				</linearGradient>
			</defs>
			<rect x="60" y="75" width="170" height="90" rx="12" fill="#e2e8f0" />
			<rect x="50" y="55" width="170" height="90" rx="12" fill="#bfdbfe" opacity="0.7" />
			<rect x="40" y="35" width="170" height="90" rx="12" fill="url(#fa1)" />
			<rect x="56" y="52" width="46" height="7" rx="3.5" fill="white" opacity="0.6" />
			<circle cx="172" cy="56" r="9" fill="white" opacity="0.3" />
			<circle cx="184" cy="56" r="9" fill="white" opacity="0.5" />
			<rect x="56" y="95" width="66" height="9" rx="4.5" fill="white" opacity="0.8" />
			<rect x="56" y="110" width="42" height="7" rx="3.5" fill="white" opacity="0.5" />
		</svg>
	);
}

function IllustrationTransactions() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			{[
				{ y: 40, w: 160, color: '#3b82f6', label: true },
				{ y: 72, w: 110, color: '#6366f1', label: false },
				{ y: 104, w: 140, color: '#3b82f6', label: true },
				{ y: 136, w: 90, color: '#6366f1', label: false },
			].map((row, i) => (
				<g key={i}>
					<rect x="24" y={row.y} width={row.w} height="22" rx="11" fill={row.color} opacity="0.12" />
					<rect x="24" y={row.y} width={row.w * 0.65} height="22" rx="11" fill={row.color} opacity="0.35" />
					<circle cx="240" cy={row.y + 11} r="11" fill={row.color} opacity="0.15" />
					<rect x="228" cy={row.y + 8} x1="228" width="24" height="6" rx="3" fill={row.color} opacity="0.4" />
				</g>
			))}
		</svg>
	);
}

function IllustrationBudget() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<defs>
				<linearGradient id="fb2" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor="#3b82f6" />
					<stop offset="100%" stopColor="#6366f1" />
				</linearGradient>
			</defs>
			<circle cx="140" cy="90" r="68" stroke="#e2e8f0" strokeWidth="13" fill="none" />
			<circle cx="140" cy="90" r="68" stroke="url(#fb2)" strokeWidth="13" fill="none"
				strokeDasharray="427" strokeDashoffset="107" strokeLinecap="round"
				transform="rotate(-90 140 90)" />
			<circle cx="140" cy="90" r="48" stroke="#e2e8f0" strokeWidth="9" fill="none" />
			<circle cx="140" cy="90" r="48" stroke="#93c5fd" strokeWidth="9" fill="none"
				strokeDasharray="301" strokeDashoffset="100" strokeLinecap="round"
				transform="rotate(-90 140 90)" />
			<rect x="118" y="81" width="44" height="7" rx="3.5" fill="#3b82f6" opacity="0.25" />
			<rect x="125" y="93" width="30" height="5" rx="2.5" fill="#6366f1" opacity="0.18" />
		</svg>
	);
}

function IllustrationRecurring() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<defs>
				<linearGradient id="fc3" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#3b82f6" />
					<stop offset="100%" stopColor="#6366f1" />
				</linearGradient>
			</defs>
			<path d="M140 40 A60 60 0 1 1 80 100" stroke="#e2e8f0" strokeWidth="12" fill="none" strokeLinecap="round" />
			<path d="M140 40 A60 60 0 0 1 200 100" stroke="url(#fc3)" strokeWidth="12" fill="none" strokeLinecap="round" />
			<polygon points="75,88 80,108 95,95" fill="url(#fc3)" opacity="0.8" />
			{[0, 1, 2, 3].map(i => (
				<rect key={i} x="50" y={130 + i * 0} width="180" height="0" rx="4" fill="#3b82f6" opacity="0" />
			))}
			<rect x="60" y="130" width="160" height="8" rx="4" fill="#bfdbfe" opacity="0.5" />
			<rect x="60" y="148" width="120" height="8" rx="4" fill="#bfdbfe" opacity="0.35" />
		</svg>
	);
}

function IllustrationReports() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<defs>
				<linearGradient id="fd4" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
					<stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
				</linearGradient>
				<linearGradient id="fd4b" x1="0" y1="1" x2="1" y2="0">
					<stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.15" />
				</linearGradient>
			</defs>
			{[
				{ x: 24, h: 50 }, { x: 60, h: 90 }, { x: 96, h: 68 },
				{ x: 132, h: 125 }, { x: 168, h: 98 }, { x: 204, h: 140 }, { x: 240, h: 115 },
			].map((b, i) => (
				<g key={i}>
					<rect x={b.x} y={160 - b.h} width="24" height={b.h} rx="5" fill="url(#fd4b)" />
					<rect x={b.x} y={160 - b.h} width="24" height={b.h * 0.55} rx="5" fill="url(#fd4)" />
				</g>
			))}
			<polyline points="36,130 72,100 108,118 144,55 180,78 216,40 252,52"
				stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
			{[36, 72, 108, 144, 180, 216, 252].map((cx, i) => {
				const cy = [130, 100, 118, 55, 78, 40, 52][i];
				return <circle key={i} cx={cx} cy={cy} r="4" fill="#3b82f6" />;
			})}
		</svg>
	);
}

function IllustrationData() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<rect x="40" y="30" width="200" height="130" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
			<rect x="40" y="30" width="200" height="32" rx="12" fill="#3b82f6" opacity="0.08" />
			{[70, 100, 130, 150].map((y, i) => (
				<g key={i}>
					<rect x="56" y={y} width="80" height="8" rx="4" fill="#e2e8f0" />
					<rect x="160" y={y} width="60" height="8" rx="4" fill={i % 2 === 0 ? '#bfdbfe' : '#c7d2fe'} opacity="0.7" />
				</g>
			))}
			<rect x="56" y="43" width="50" height="8" rx="4" fill="#3b82f6" opacity="0.3" />
			<rect x="120" y="43" width="40" height="8" rx="4" fill="#6366f1" opacity="0.2" />
		</svg>
	);
}

function IllustrationAI() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<defs>
				<linearGradient id="fe5" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#3b82f6" />
					<stop offset="100%" stopColor="#6366f1" />
				</linearGradient>
			</defs>
			<rect x="30" y="40" width="160" height="38" rx="10" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.2" />
			<rect x="44" y="54" width="120" height="10" rx="5" fill="#3b82f6" opacity="0.25" />
			<rect x="90" y="100" width="160" height="38" rx="10" fill="#f5f3ff" stroke="#c4b5fd" strokeWidth="1.2" />
			<rect x="104" y="114" width="100" height="10" rx="5" fill="#6366f1" opacity="0.25" />
			<circle cx="240" cy="130" r="16" fill="url(#fe5)" opacity="0.15" />
			<path d="M232,130 l6,6 l10-12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
		</svg>
	);
}

function IllustrationSync() {
	return (
		<svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
			<defs>
				<linearGradient id="ff6" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#3b82f6" />
					<stop offset="100%" stopColor="#6366f1" />
				</linearGradient>
			</defs>
			{/* Phone */}
			<rect x="100" y="50" width="80" height="120" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
			<rect x="112" y="68" width="56" height="70" rx="5" fill="#eff6ff" />
			<rect x="120" y="76" width="40" height="7" rx="3.5" fill="#bfdbfe" />
			<rect x="120" y="89" width="28" height="7" rx="3.5" fill="#bfdbfe" opacity="0.6" />
			<rect x="120" y="102" width="34" height="7" rx="3.5" fill="#bfdbfe" opacity="0.4" />
			{/* Orbit dots */}
			{[0, 72, 144, 216, 288].map((deg, i) => (
				<circle key={i}
					cx={140 + 80 * Math.cos(deg * Math.PI / 180)}
					cy={110 + 80 * Math.sin(deg * Math.PI / 180)}
					r="5" fill="#3b82f6" opacity={0.15 + i * 0.1} />
			))}
		</svg>
	);
}

const features: Feature[] = [
	{
		icon: BriefcaseBusiness,
		title: 'Multiple accounts',
		desc: 'Track cash, savings, debit, and credit without mixing balances.',
		illustration: <IllustrationAccounts />,
	},
	{
		icon: List,
		title: 'Income and expenses',
		desc: 'Log daily activity quickly, including transfers between accounts.',
		illustration: <IllustrationTransactions />,
	},
	{
		icon: Target,
		title: 'Real budgets',
		desc: 'Draft, publish, and compare planned spending to actual activity.',
		illustration: <IllustrationBudget />,
	},
	{
		icon: RefreshCw,
		title: 'Recurring + Quick Fill',
		desc: 'Save regular bills once, then fill new transactions in seconds.',
		illustration: <IllustrationRecurring />,
	},
	{
		icon: BarChart3,
		title: 'Clear reports',
		desc: 'Spending by category, account, trend, income, and net worth.',
		illustration: <IllustrationReports />,
	},
	{
		icon: FileText,
		title: 'Data tools',
		desc: 'Import and export CSV or JSON. Manage categories and filters.',
		illustration: <IllustrationData />,
	},
	{
		icon: Cpu,
		title: 'AI spending questions',
		desc: 'Ask about patterns, merchants, categories, and account trends.',
		illustration: <IllustrationAI />,
	},
	{
		icon: LayoutGrid,
		title: 'Cloud sync',
		desc: 'Synced across devices with light and dark mode built in.',
		illustration: <IllustrationSync />,
	},
];

const Features: React.FC = () => {
	return (
		<section
			id="features"
			className="bg-gray-50 px-4 py-24 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center mb-16">
					<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-600">
						Features
					</div>
					<h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl mb-4">
						Everything you need. Nothing you don't.
					</h2>
					<p className="text-lg leading-relaxed text-gray-500">
						Built for everyday money decisions. Every feature earns its place.
					</p>
				</div>

				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{features.map((feature, i) => {
						const Icon = feature.icon;
						return (
							<motion.div
								key={feature.title}
								className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.06, duration: 0.45 }}
							>
								{/* Illustration */}
								<div className="w-full h-44 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40">
									{feature.illustration}
								</div>
								{/* Text */}
								<div className="px-6 pb-6 pt-4">
									<div className="mb-3 flex items-center gap-2">
										<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
											<Icon className="h-4 w-4" />
										</div>
										<h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
									</div>
									<p className="text-sm leading-relaxed text-gray-500">{feature.desc}</p>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default Features;