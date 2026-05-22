import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import AIChatbot from '@/features/ai/components/AIChatbot';
import Home from '@/features/marketing/pages/Home';

interface ProtectedRouteProps {
	children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const location = useLocation();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const shouldRenderFloatingAssistant =
		location.pathname.startsWith('/dashboard') && location.pathname !== '/dashboard';

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

	return (
		<>
			{children}
			{shouldRenderFloatingAssistant && <AIChatbot />}
		</>
	);
}
