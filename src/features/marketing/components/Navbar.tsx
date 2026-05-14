import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, LogIn, UserPlus } from 'lucide-react';
import logo from '@/assets/images/logos/cflow-transparent-light.png';

interface NavbarProps {
	onAuthClick: (mode: 'login' | 'register') => void;
}

const navLinks = [
	{ label: 'Features', href: '#features' },
	{ label: 'How it helps', href: '#how-it-helps' },
	{ label: 'Reports', href: '#reports' },
	{ label: 'FAQ', href: '#faq' },
	{ label: 'Developer', href: '#developer' },
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
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
				scrolled ? 'py-4' : 'py-6'
			}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="relative rounded-xl border border-gray-800 bg-gray-900/90 backdrop-blur-xl transition-all duration-500">
					<div className="px-6 lg:px-8">
						<div className="flex items-center justify-between h-16">
							{/* Logo */}
							<div className="flex-shrink-0">
								<a href="#home" className="flex items-center">
									<img className="w-24" src={logo} alt="CashFlow Logo" />
								</a>
							</div>

							{/* Desktop Navigation */}
							<div className="hidden md:flex items-center space-x-1">
								{navLinks.map((link) => (
									<a
										key={link.label}
										href={link.href}
										className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800/70 hover:text-white"
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
										className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
									>
										Get Started
										<ChevronDown
											size={16}
											className={`transition-transform duration-200 ${authDropdownOpen ? 'rotate-180' : ''}`}
										/>
									</button>

									{authDropdownOpen && (
										<div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
											<button
												onClick={() => {
													onAuthClick('login');
													setAuthDropdownOpen(false);
												}}
												className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
											>
													<LogIn size={16} className="text-blue-400" />
												Login / Demo
											</button>
											<button
												onClick={() => {
													onAuthClick('register');
													setAuthDropdownOpen(false);
												}}
												className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
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
								className="rounded-lg p-2.5 transition-colors hover:bg-gray-800/70 md:hidden"
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
							className="md:hidden border-t border-gray-800 backdrop-blur-xl"
						>
							<div className="px-6 py-4 space-y-2">
								{navLinks.map((link) => (
									<a
										key={link.label}
										href={link.href}
										className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800/70"
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
										className="flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800/70"
									>
										<LogIn size={16} className="text-blue-400" />
										Login / Demo
									</button>
									<button
										onClick={() => {
											onAuthClick('register');
											setMobileMenuOpen(false);
										}}
										className="flex w-full items-center gap-2.5 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
