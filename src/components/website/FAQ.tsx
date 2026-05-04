import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

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
			className="relative bg-gray-950 px-4 py-24 sm:px-6 lg:px-8"
		>
			<div className="max-w-3xl mx-auto">
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<span className="mb-4 inline-block rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400">
						FAQ
					</span>
					<h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
						Frequently Asked Questions
					</h2>
					<p className="text-lg text-gray-400">
						Everything you need to know before getting started.
					</p>
				</motion.div>

				<div className="space-y-3">
					{faqs.map((faq, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.07 }}
							className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50"
						>
							<button
								onClick={() => toggle(i)}
								aria-expanded={openIndex === i}
								className="flex w-full items-center justify-between px-6 py-5 text-left font-semibold text-white transition-colors duration-200 hover:bg-gray-800/40"
							>
								<span>{faq.question}</span>
								<ChevronDown
									size={20}
									className={`flex-shrink-0 ml-4 text-blue-400 transition-transform duration-300 ${
										openIndex === i ? 'rotate-180' : ''
									}`}
								/>
							</button>

							<AnimatePresence initial={false}>
								{openIndex === i && (
									<motion.div
										key="content"
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3, ease: 'easeInOut' }}
									>
										<p className="px-6 pb-5 text-gray-400 leading-relaxed">
											{faq.answer}
										</p>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};

export default FAQ;
