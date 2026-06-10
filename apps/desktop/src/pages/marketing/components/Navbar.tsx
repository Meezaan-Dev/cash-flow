import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, UserPlus, ArrowRight } from 'lucide-react';

interface NavbarProps {
	onAuthClick: (mode: 'login' | 'register') => void;
}

const navLinks = [
	{ label: 'Features', href: '#features' },
	{ label: 'How it helps', href: '#how-it-helps' },
	{ label: 'FAQ', href: '#faq' },
];

const Navbar: React.FC<NavbarProps> = ({ onAuthClick }) => {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 24);
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
		return () => { document.body.style.overflow = 'unset'; };
	}, [mobileMenuOpen]);

	useEffect(() => {
		if (!mobileMenuOpen) return;
		const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
		const handleClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
		};
		document.addEventListener('keydown', handleKey);
		document.addEventListener('mousedown', handleClick);
		return () => {
			document.removeEventListener('keydown', handleKey);
			document.removeEventListener('mousedown', handleClick);
		};
	}, [mobileMenuOpen]);

	return (
		<div className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-[padding] duration-300 ease-in-out ${scrolled ? 'px-6 pt-3' : 'px-0 pt-0'}`}>
			<motion.nav
				className="w-full flex items-center justify-between overflow-hidden"
				animate={{
					borderRadius: scrolled ? 9999 : 0,
					backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0)',
					boxShadow: scrolled
						? '0 4px 24px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)'
						: 'none',
					paddingLeft: scrolled ? 20 : 32,
					paddingRight: scrolled ? 20 : 32,
					height: scrolled ? 52 : 68,
					borderColor: scrolled ? 'rgba(226,232,240,0.8)' : 'rgba(226,232,240,0)',
				}}
				transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
				style={{
					backdropFilter: 'blur(16px)',
					WebkitBackdropFilter: 'blur(16px)',
					borderWidth: 1,
					borderStyle: 'solid',
					maxWidth: scrolled ? 860 : '100%',
				}}
			>
				{/* Logo */}
				<a href="#home" className="flex items-center gap-2 shrink-0">
					<span className="text-lg font-semibold tracking-tight text-gray-900">CashFlow</span>
				</a>

				{/* Desktop nav links */}
				<div className="hidden md:flex items-center gap-7">
					{navLinks.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap"
						>
							{link.label}
						</a>
					))}
				</div>

				{/* Desktop auth */}
				<div className="hidden md:flex items-center gap-2 shrink-0">
					<button
						onClick={() => onAuthClick('login')}
						className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
					>
						Log in
					</button>
					<button
						onClick={() => onAuthClick('register')}
						className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm hover:shadow-md"
					>
						Get Started <ArrowRight className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* Mobile toggle */}
				<button
					className="rounded-lg p-2 hover:bg-gray-100 transition-colors md:hidden"
					aria-label="Toggle navigation"
					aria-expanded={mobileMenuOpen}
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					{mobileMenuOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
				</button>
			</motion.nav>

			{/* Mobile menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						ref={menuRef}
						className="absolute top-full left-4 right-4 mt-2 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
						initial={{ opacity: 0, y: -8, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.98 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
					>
						<div className="p-4 space-y-1">
							{navLinks.map((link) => (
								<a
									key={link.label}
									href={link.href}
									className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.label}
								</a>
							))}
							<div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
								<button
									onClick={() => { onAuthClick('login'); setMobileMenuOpen(false); }}
									className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
								>
									<LogIn size={15} className="text-blue-500" /> Log in / Demo
								</button>
								<button
									onClick={() => { onAuthClick('register'); setMobileMenuOpen(false); }}
									className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
								>
									<UserPlus size={15} /> Get Started Free
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Navbar;