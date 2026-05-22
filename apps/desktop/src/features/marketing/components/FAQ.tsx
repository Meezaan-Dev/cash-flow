import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
	{
		question: 'Is CashFlow free to use?',
		answer:
			'Yes. You can register and start tracking your accounts, transactions, budgets, and reports without a credit card.',
	},
	{
		question: 'How is my financial data stored?',
		answer:
			'Your records are stored securely and scoped to your own account, so your transactions, accounts, budgets, and recurring payments stay private to you.',
	},
	{
		question: 'Can I import my existing transactions?',
		answer:
			'Absolutely. CashFlow supports CSV and JSON import/export so you can bring in data from other tools or back up your records at any time.',
	},
	{
		question: 'Does CashFlow support recurring expenses?',
		answer:
			'Yes. Save regular bills or income as recurring items, then use Quick Fill to create new transactions faster when they come up.',
	},
	{
		question: 'Can CashFlow help me understand my spending?',
		answer:
			'Yes. Reports show income, expenses, categories, accounts, monthly trends, and net worth. The AI assistant can also answer simple questions about your own spending data.',
	},
	{
		question: 'Can I access my data from multiple devices?',
		answer:
			'Yes. Your account syncs in the cloud so you can use CashFlow from desktop, tablet, or mobile.',
	},
];

const FAQ: React.FC = () => {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

	return (
		<section
			id="faq"
			className="border-t border-white/[0.06] bg-black px-4 py-14 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-xl">
				<div className="text-center">
					<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 px-3 py-1 text-xs font-medium text-blue-300">
						<HelpCircle className="h-3.5 w-3.5" />
						FAQ
					</div>
					<h2 className="mb-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
						Frequently asked questions
					</h2>
					<p className="text-sm text-gray-500">
						Everything you need to know before getting started.
					</p>
				</div>

				<div className="mt-7">
					{faqs.map((faq, i) => (
						<div
							key={faq.question}
							className="border-b border-white/[0.06] py-4"
						>
							<button
								onClick={() => toggle(i)}
								aria-expanded={openIndex === i}
								className="flex w-full items-center justify-between gap-4 text-left text-sm font-medium text-gray-300 transition-colors hover:text-white"
							>
								<span>{faq.question}</span>
								<ChevronDown
									size={16}
									className={`flex-shrink-0 text-blue-400 transition-transform duration-200 ${
										openIndex === i ? 'rotate-180' : ''
									}`}
								/>
							</button>

							{openIndex === i ? (
								<p className="mt-3 text-sm leading-relaxed text-gray-600">
									{faq.answer}
								</p>
							) : null}
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default FAQ;
