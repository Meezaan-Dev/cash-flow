import React, { useState } from 'react';
import AuthModals from '../components/app/AuthModals';
import Navbar from '../components/website/Navbar';
import Hero from '../components/website/Hero';
import Features from '../components/website/Features';
import ProblemSolution from '../components/website/ProblemSolution';
import FAQ from '../components/website/FAQ';
import Contact from '../components/website/Contact';
import Footer from '../components/website/Footer';

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
		<div className="min-h-screen bg-gray-950">
			<Navbar onAuthClick={handleAuthClick} />
			<Hero onAuthClick={handleAuthClick} />
			<Features />
			<ProblemSolution />
			<FAQ />
			<Contact />
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
