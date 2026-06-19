import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, sendEmailVerification, signOut, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import AIChatbot from '@/domains/ai/components/AIChatbot';
import Home from '@/pages/marketing/Home';

const MOBILE_DASHBOARD_QUERY = '(max-width: 767px)';

interface ProtectedRouteProps {
	children: ReactNode;
}

const getIsMobileDashboardViewport = () => {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia(MOBILE_DASHBOARD_QUERY).matches;
};

const useIsMobileDashboardViewport = () => {
	const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileDashboardViewport);

	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return;

		const mediaQuery = window.matchMedia(MOBILE_DASHBOARD_QUERY);
		const handleChange = (event: MediaQueryListEvent) => {
			setIsMobileViewport(event.matches);
		};

		setIsMobileViewport(mediaQuery.matches);
		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	}, []);

	return isMobileViewport;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const location = useLocation();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const isMobileViewport = useIsMobileDashboardViewport();
	const isDashboardRoute =
		location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');
	const shouldRenderFloatingAssistant =
		isDashboardRoute && location.pathname !== '/dashboard';

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
				<div className="text-center space-y-6">
					{/* Animated Spinner */}
					<div className="flex items-center justify-center h-full w-full">
						<div className="relative">
							<div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin"></div>
							<div className="w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin absolute top-0 left-0"></div>
						</div>
					</div>

					{/* Loading Text with Animation */}
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-foreground">
							Securing your session
						</h3>
						<p className="text-sm text-muted-foreground max-w-xs">
							Just a moment while we verify your authentication...
						</p>
					</div>

					{/* Progress Bar */}
					<div className="w-48 h-1 bg-muted rounded-full overflow-hidden mx-auto">
						<div className="h-full bg-primary rounded-full animate-pulse"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Home />;
	}

	if (!user.emailVerified) {
		return (
			<main className="min-h-screen bg-background px-6 py-20">
				<section className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
					<h1 className="text-2xl font-semibold">Verify your email</h1>
					<p className="mt-3 text-sm text-muted-foreground">
						We sent a verification link to {user.email ?? 'your email address'}. Financial data stays locked until verification is complete.
					</p>
					<div className="mt-6 grid gap-3">
						<button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={() => window.location.reload()}>
							I have verified my email
						</button>
						<button className="rounded-lg border px-4 py-2" onClick={() => void sendEmailVerification(user)}>
							Resend verification email
						</button>
						<button className="px-4 py-2 text-sm text-muted-foreground" onClick={() => void signOut(auth)}>
							Sign out
						</button>
					</div>
				</section>
			</main>
		);
	}

	if (isMobileViewport && (location.pathname === '/' || isDashboardRoute)) {
		return <Navigate to="/mobisite" replace />;
	}

	return (
		<>
			{children}
			{shouldRenderFloatingAssistant && <AIChatbot />}
		</>
	);
}
