import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, LogIn, UserPlus } from 'lucide-react';

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
	const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const authDropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [mobileMenuOpen]);

	useEffect(() => {
		if (!mobileMenuOpen && !authDropdownOpen) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setMobileMenuOpen(false);
				setAuthDropdownOpen(false);
			}
		};
		const handleClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMobileMenuOpen(false);
			}
			if (authDropdownRef.current && !authDropdownRef.current.contains(e.target as Node)) {
				setAuthDropdownOpen(false);
			}
		};
		document.addEventListener('keydown', handleKey);
		document.addEventListener('mousedown', handleClick);
		return () => {
			document.removeEventListener('keydown', handleKey);
			document.removeEventListener('mousedown', handleClick);
		};
	}, [mobileMenuOpen, authDropdownOpen]);

	return (
		<nav
			className={`fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl transition-all duration-300 ${
				scrolled ? 'py-2' : 'py-3'
			}`}
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="relative">
					<div>
						<div className="flex h-12 items-center justify-between">
							{/* Logo */}
							<div className="flex-shrink-0">
								<a href="#home" className="flex items-center">
									<span className="text-base font-bold tracking-tight text-white">
										CashFlow
									</span>
								</a>
							</div>

							{/* Desktop Navigation */}
							<div className="hidden md:flex items-center space-x-1">
								{navLinks.map((link) => (
									<a
										key={link.label}
										href={link.href}
										className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-200"
									>
										{link.label}
									</a>
								))}
							</div>

							{/* Desktop Auth Dropdown */}
							<div className="hidden md:flex items-center" ref={authDropdownRef}>
								<div className="relative">
									<button
										onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
										aria-expanded={authDropdownOpen}
										aria-haspopup="true"
										className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
									>
										Get Started
										<ChevronDown
											size={14}
											className={`transition-transform duration-200 ${authDropdownOpen ? 'rotate-180' : ''}`}
										/>
									</button>

									{authDropdownOpen && (
										<div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#080808] shadow-2xl">
											<button
												onClick={() => {
													onAuthClick('login');
													setAuthDropdownOpen(false);
												}}
												className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
											>
													<LogIn size={16} className="text-blue-400" />
												Login / Demo
											</button>
											<button
												onClick={() => {
													onAuthClick('register');
													setAuthDropdownOpen(false);
												}}
												className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
											>
												<UserPlus size={16} className="text-blue-400" />
												Register
											</button>
										</div>
									)}
								</div>
							</div>

							{/* Mobile Menu Button */}
							<button
								className="rounded-md p-2 transition-colors hover:bg-white/[0.04] md:hidden"
								aria-label="Toggle navigation menu"
								aria-expanded={mobileMenuOpen}
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							>
								{mobileMenuOpen ? (
									<X className="h-5 w-5 text-gray-300" />
								) : (
									<Menu className="h-5 w-5 text-gray-300" />
								)}
							</button>
						</div>
					</div>

					{/* Mobile Menu */}
					{mobileMenuOpen && (
						<div
							ref={menuRef}
							className="border-t border-white/[0.06] md:hidden"
						>
							<div className="px-6 py-4 space-y-2">
								{navLinks.map((link) => (
									<a
										key={link.label}
										href={link.href}
										className="block rounded-md px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
										onClick={() => setMobileMenuOpen(false)}
									>
										{link.label}
									</a>
								))}
								<div className="pt-2 space-y-2">
									<button
										onClick={() => {
											onAuthClick('login');
											setMobileMenuOpen(false);
										}}
										className="flex w-full items-center gap-2.5 rounded-md px-4 py-3 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
									>
										<LogIn size={16} className="text-blue-400" />
										Login / Demo
									</button>
									<button
										onClick={() => {
											onAuthClick('register');
											setMobileMenuOpen(false);
										}}
										className="flex w-full items-center gap-2.5 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
									>
										<UserPlus size={16} />
										Register
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
