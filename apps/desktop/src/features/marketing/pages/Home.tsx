import React, { useState } from 'react';
import AuthModals from '@/features/auth/components/AuthModals';
import Navbar from '@/features/marketing/components/Navbar';
import Hero from '@/features/marketing/components/Hero';
import Features from '@/features/marketing/components/Features';
import ProblemSolution from '@/features/marketing/components/ProblemSolution';
import FAQ from '@/features/marketing/components/FAQ';
import Footer from '@/features/marketing/components/Footer';

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
