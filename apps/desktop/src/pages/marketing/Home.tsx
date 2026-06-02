import React, { useState } from 'react';
import AuthModals from '@/domains/auth/components/AuthModals';
import Navbar from '@/pages/marketing/components/Navbar';
import Hero from '@/pages/marketing/components/Hero';
import Features from '@/pages/marketing/components/Features';
import ProblemSolution from '@/pages/marketing/components/ProblemSolution';
import FAQ from '@/pages/marketing/components/FAQ';
import Footer from '@/pages/marketing/components/Footer';

const Home: React.FC = () => {
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

	const handleAuthClick = (mode: 'login' | 'register') => {
		setAuthMode(mode);
		setAuthModalOpen(true);
	};

	const handleAuthClose = () => {
		setAuthModalOpen(false);
	};

	const handleAuthModeChange = (newMode: 'login' | 'register') => {
		setAuthMode(newMode);
	};

	return (
		<div className="min-h-screen overflow-x-hidden bg-black">
			<Navbar onAuthClick={handleAuthClick} />
			<Hero onAuthClick={handleAuthClick} />
			<Features />
			<ProblemSolution />
			<FAQ />
			<Footer />

			{/* Auth Modals */}
			<AuthModals
				open={authModalOpen}
				onClose={handleAuthClose}
				mode={authMode}
				onModeChange={handleAuthModeChange}
			/>
		</div>
	);
};

export default Home;
