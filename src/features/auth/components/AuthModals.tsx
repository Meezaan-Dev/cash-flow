import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '@/services/firebase';
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	GoogleAuthProvider,
	signInWithPopup,
} from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import { Alert, AlertDescription } from '@/components/app/ui/alert';
import { Separator } from '@/components/app/ui/separator';
import { Loader2 } from 'lucide-react';

interface AuthModalsProps {
	open: boolean;
	onClose: () => void;
	mode: 'login' | 'register';
	onModeChange?: (mode: 'login' | 'register') => void;
}

const AuthModals: React.FC<AuthModalsProps> = ({ open, onClose, mode, onModeChange }) => {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);

	const handleSuccessfulAuth = () => {
		onClose();
		navigate('/dashboard');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			if (mode === 'register') {
				await createUserWithEmailAndPassword(auth, email, password);
			} else {
				await signInWithEmailAndPassword(auth, email, password);
			}
			handleSuccessfulAuth();
			setEmail('');
			setPassword('');
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'Something went wrong');
		} finally {
			setLoading(false);
		}
	};

	const handleDemoAutofill = () => {
		setEmail('demo@demo.com');
		setPassword('demo123');
		setError('');
	};

	const handleGoogleSignIn = async () => {
		setError('');
		setGoogleLoading(true);

		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			handleSuccessfulAuth();
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'Something went wrong');
		} finally {
			setGoogleLoading(false);
		}
	};

	const handleClose = () => {
		setEmail('');
		setPassword('');
		setError('');
		setShowPassword(false);
		onClose();
	};

	const handleModeToggle = () => {
		const newMode = mode === 'login' ? 'register' : 'login';
		onModeChange?.(newMode);
		setError('');
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-2xl font-semibold">
						{mode === 'login' ? 'Welcome Back' : 'Create Account'}
					</DialogTitle>
					<DialogDescription>
						{mode === 'login'
							? 'Sign in to your account to continue'
							: 'Create a new account to get started'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={handleGoogleSignIn}
						disabled={googleLoading || loading}
					>
						{googleLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<FcGoogle className="mr-2 h-5 w-5" />
						)}
						{googleLoading ? 'Signing in...' : 'Continue with Google'}
					</Button>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<Separator />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								or continue with email
							</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							placeholder="name@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={loading || googleLoading}
							required
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<div className="relative">
							<Input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading || googleLoading}
								required
								autoComplete={
									mode === 'login' ? 'current-password' : 'new-password'
								}
								className="pr-10"
							/>
							<button
								type="button"
								aria-label="Toggle password visibility"
								onClick={() => setShowPassword(!showPassword)}
								disabled={loading || googleLoading}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
							>
								{showPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>

					{mode === 'login' && (
						<Button
							type="button"
							variant="secondary"
							className="w-full"
							onClick={handleDemoAutofill}
							disabled={loading || googleLoading}
						>
							Use demo account
						</Button>
					)}

					<Button type="submit" className="w-full" disabled={loading || googleLoading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{loading
							? 'Signing in...'
							: mode === 'login'
								? 'Sign In'
								: 'Create Account'}
					</Button>

					<div className="text-center text-sm">
						<span className="text-muted-foreground">
							{mode === 'login'
								? "Don't have an account? "
								: 'Already have an account? '}
						</span>
						<button
							type="button"
							onClick={handleModeToggle}
							disabled={loading || googleLoading}
							className="font-semibold text-primary hover:underline disabled:opacity-50"
						>
							{mode === 'login' ? 'Sign up' : 'Sign in'}
						</button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default AuthModals;
