import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
	{
		question: 'Is CashFlow free to use?',
		answer: 'Yes. You can register and start tracking your accounts, transactions, budgets, and reports without a credit card.',
	},
	{
		question: 'How is my financial data stored?',
		answer: 'Your records are stored securely and scoped to your own account, so your transactions, accounts, budgets, and recurring payments stay private to you.',
	},
	{
		question: 'Can I import my existing transactions?',
		answer: 'Absolutely. CashFlow supports CSV and JSON import/export so you can bring in data from other tools or back up your records at any time.',
	},
	{
		question: 'Does CashFlow support recurring expenses?',
		answer: 'Yes. Save regular bills or income as recurring items, then use Quick Fill to create new transactions faster when they come up.',
	},
	{
		question: 'Can CashFlow help me understand my spending?',
		answer: 'Yes. Reports show income, expenses, categories, accounts, monthly trends, and net worth. The AI assistant can also answer simple questions about your own spending data.',
	},
	{
		question: 'Can I access my data from multiple devices?',
		answer: 'Yes. Your account syncs in the cloud so you can use CashFlow from desktop, tablet, or mobile.',
	},
];

const FAQ: React.FC = () => {
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

	return (
		<section
			id="faq"
			className="bg-gray-50 px-4 py-24 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-2xl">
				<div className="text-center mb-12">
					<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-600">
						FAQ
					</div>
					<h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl mb-4">
						Frequently asked questions
					</h2>
					<p className="text-base text-gray-500">
						Everything you need to know before getting started.
					</p>
				</div>

				<div className="space-y-2">
					{faqs.map((faq, i) => (
						<div
							key={faq.question}
							className="rounded-xl border border-gray-200 bg-white overflow-hidden"
						>
							<button
								onClick={() => toggle(i)}
								aria-expanded={openIndex === i}
								className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
							>
								<span>{faq.question}</span>
								<ChevronDown
									size={16}
									className={`flex-shrink-0 text-blue-500 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
								/>
							</button>

							<AnimatePresence initial={false}>
								{openIndex === i && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2, ease: 'easeOut' }}
										className="overflow-hidden"
									>
										<p className="px-6 pb-5 text-sm leading-relaxed text-gray-500">
											{faq.answer}
										</p>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default FAQ;