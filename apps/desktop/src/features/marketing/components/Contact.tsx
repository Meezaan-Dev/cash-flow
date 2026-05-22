import React from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Globe, Mail } from 'lucide-react';
import profile from '@/assets/images/profile-photo.jpeg';

const Contact: React.FC = () => {
	return (
		<section
			id="developer"
			className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gray-950"
		>
			<div className="relative max-w-4xl mx-auto">
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<span className="inline-block px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-medium mb-4">
						Meet the Developer
					</span>
					<h2 className="text-4xl md:text-5xl font-bold text-white">Meet The Developer</h2>
				</motion.div>

				<motion.div
					className="relative bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-12"
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.1 }}
				>
					<div className="flex flex-col items-center text-center space-y-8">
						<div className="relative w-32 h-32 rounded-full bg-blue-500/10 p-1">
							<img
								src={profile}
								alt="Meezaan Davids"
								className="w-full h-full rounded-full object-cover"
								loading="lazy"
							/>
						</div>

						<div className="space-y-4 max-w-2xl">
							<h3 className="text-3xl font-bold text-white">Meezaan Davids</h3>
							<p className="text-xl text-gray-400">Software Developer</p>
						</div>

						<div className="flex flex-col-reverse md:flex-row gap-3 justify-center">
							{[
								{
									href: 'https://github.com/MeezaanD',
									icon: <Github size={20} />,
									label: 'GitHub',
								},
								{
									href: 'https://www.linkedin.com/in/meezaan-davids',
									icon: <Linkedin size={20} />,
									label: 'LinkedIn',
								},
								{
									href: 'https://meezaan.dev/',
									icon: <Globe size={20} />,
									label: 'Portfolio',
								},
								{
									href: 'mailto:meezaandavids365@gmail.com',
									icon: <Mail size={20} />,
									label: 'Email',
								},
							].map((link) => (
								<motion.a
									key={link.label}
									href={link.href}
									target={link.href.startsWith('mailto') ? undefined : '_blank'}
									rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
									whileHover={{ y: -4, scale: 1.05 }}
									transition={{ duration: 0.2 }}
									className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800 hover:bg-gray-800/80 transition-all duration-300"
								>
									<span className="text-gray-400 group-hover/link:text-blue-400 transition-colors">
										{link.icon}
									</span>
									<span className="text-sm font-medium text-gray-300 group-hover/link:text-white">
										{link.label}
									</span>
								</motion.a>
							))}
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default Contact;
