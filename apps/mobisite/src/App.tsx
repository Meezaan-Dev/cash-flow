import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, List, LogOut, PlusCircle } from 'lucide-react';
import {
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
	User,
} from 'firebase/auth';
import {
	auth,
	formatCurrency,
	getTransactionDateOrEpoch,
	mergeCategoryOptions,
	Transaction,
	useAccounts,
	useCategoryOptions,
	useMainAccountPreference,
	useTransactions,
} from '@cash-flow/shared';

type MobileTab = 'add' | 'list';
type MobileTransactionType = 'income' | 'expense';

const formatDateKey = (transaction: Transaction) =>
	getTransactionDateOrEpoch(transaction.date, transaction.createdAt).toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

const AuthPanel = () => {
	const [mode, setMode] = useState<'login' | 'register'>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError('');
		setLoading(true);

		try {
			if (mode === 'register') {
				await createUserWithEmailAndPassword(auth, email, password);
			} else {
				await signInWithEmailAndPassword(auth, email, password);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not sign in.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="min-h-screen-safe bg-background py-6 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:px-4">
			<div className="mx-auto flex min-h-[calc(var(--vh-screen)-3rem)] w-full max-w-sm flex-col justify-center">
				<div className="mb-8">
					<p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						CashFlow mobile
					</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">
						Quick capture
					</h1>
				</div>
				<form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
					{error && (
						<div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</div>
					)}
					<label className="block space-y-1.5 text-sm font-medium">
						<span>Email</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="h-11 w-full rounded-md border bg-background px-3"
							required
						/>
					</label>
					<label className="block space-y-1.5 text-sm font-medium">
						<span>Password</span>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="h-11 w-full rounded-md border bg-background px-3"
							required
						/>
					</label>
					<button
						type="submit"
						disabled={loading}
						className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
					>
						{loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
					</button>
					<button
						type="button"
						onClick={() => {
							setMode((current) => (current === 'login' ? 'register' : 'login'));
							setError('');
						}}
						className="h-10 w-full text-sm font-medium text-primary"
					>
						{mode === 'login' ? 'Create an account' : 'I already have an account'}
					</button>
				</form>
			</div>
		</main>
	);
};

const AddTransactionView = () => {
	const { accounts, loading: accountsLoading } = useAccounts();
	const { addTransaction } = useTransactions();
	const { categories, categoryOptions } = useCategoryOptions();
	const { mainAccountId } = useMainAccountPreference();
	const [type, setType] = useState<MobileTransactionType>('expense');
	const [accountId, setAccountId] = useState('');
	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const defaultAccountId = useMemo(() => {
		const mainAccount = accounts.find((account) => account.id === mainAccountId);
		return mainAccount?.id ?? accounts[0]?.id ?? '';
	}, [accounts, mainAccountId]);

	useEffect(() => {
		if (!accountId && defaultAccountId) {
			setAccountId(defaultAccountId);
		}
	}, [accountId, defaultAccountId]);

	useEffect(() => {
		if (!category && categoryOptions[0]?.value) {
			setCategory(categoryOptions[0].value);
		}
	}, [category, categoryOptions]);

	const availableCategories = useMemo(
		() => mergeCategoryOptions(categoryOptions, category ? [category] : []),
		[category, categoryOptions]
	);

	const selectedCategory = categories.find((item) => item.value === category);
	const availableSubcategories = selectedCategory?.subcategories ?? [];
	const [subcategory, setSubcategory] = useState('');

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError('');

		if (!accountId) {
			setError('Create an account in desktop admin first.');
			return;
		}
		if (!category) {
			setError('Choose a category.');
			return;
		}

		setSaving(true);
		try {
			await addTransaction({
				type,
				accountId,
				title,
				amount: Number(amount),
				category,
				subcategory: subcategory || undefined,
				date: date ? new Date(date) : new Date(),
			});
			setTitle('');
			setAmount('');
			setSubcategory('');
			setDate(new Date().toISOString().split('T')[0]);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save transaction.');
		} finally {
			setSaving(false);
		}
	};

	if (!accountsLoading && accounts.length === 0) {
		return (
			<section className="py-4 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:p-4">
				<div className="rounded-lg border border-dashed p-5">
					<h2 className="text-lg font-semibold">No accounts yet</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Create your first account in desktop admin, then mobile capture is ready.
					</p>
					<a
						href="/dashboard/accounts"
						className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
					>
						Open admin
					</a>
				</div>
			</section>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4 py-4 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:p-4">
			{error && (
				<div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</div>
			)}
			<div className="grid grid-cols-2 gap-2">
				{(['expense', 'income'] as const).map((item) => (
					<button
						key={item}
						type="button"
						onClick={() => setType(item)}
						className={`flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-semibold ${
							type === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'
						}`}
					>
						{item === 'expense' ? (
							<ArrowDownCircle className="h-4 w-4" />
						) : (
							<ArrowUpCircle className="h-4 w-4" />
						)}
						{item}
					</button>
				))}
			</div>
			<label className="block space-y-1.5 text-sm font-medium">
				<span>Title</span>
				<input
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					className="h-12 w-full rounded-md border bg-background px-3"
					required
				/>
			</label>
			<label className="block space-y-1.5 text-sm font-medium">
				<span>Amount</span>
				<input
					type="number"
					min="0.01"
					step="0.01"
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
					className="h-12 w-full rounded-md border bg-background px-3"
					required
				/>
			</label>
			<label className="block space-y-1.5 text-sm font-medium">
				<span>Account</span>
				<select
					value={accountId}
					onChange={(event) => setAccountId(event.target.value)}
					className="h-12 w-full rounded-md border bg-background px-3"
				>
					{accounts.map((account) => (
						<option key={account.id} value={account.id}>
							{account.name} - {formatCurrency(account.balance)}
						</option>
					))}
				</select>
			</label>
			<label className="block space-y-1.5 text-sm font-medium">
				<span>Category</span>
				<select
					value={category}
					onChange={(event) => {
						setCategory(event.target.value);
						setSubcategory('');
					}}
					className="h-12 w-full rounded-md border bg-background px-3"
				>
					{availableCategories.map((item) => (
						<option key={item.value} value={item.value}>
							{item.label}
						</option>
					))}
				</select>
			</label>
			{availableSubcategories.length > 0 && (
				<label className="block space-y-1.5 text-sm font-medium">
					<span>Subcategory</span>
					<select
						value={subcategory}
						onChange={(event) => setSubcategory(event.target.value)}
						className="h-12 w-full rounded-md border bg-background px-3"
					>
						<option value="">No subcategory</option>
						{availableSubcategories.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</label>
			)}
			<label className="block space-y-1.5 text-sm font-medium">
				<span>Date</span>
				<input
					type="date"
					value={date}
					onChange={(event) => setDate(event.target.value)}
					className="h-12 w-full rounded-md border bg-background px-3"
				/>
			</label>
			<button
				type="submit"
				disabled={saving}
				className="h-12 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
			>
				{saving ? 'Saving...' : 'Add transaction'}
			</button>
		</form>
	);
};

const TransactionListView = () => {
	const { transactions } = useTransactions();
	const { getCategoryPathLabel } = useCategoryOptions();

	const grouped = useMemo(() => {
		const sorted = [...transactions].sort(
			(left, right) =>
				getTransactionDateOrEpoch(right.date, right.createdAt).getTime() -
				getTransactionDateOrEpoch(left.date, left.createdAt).getTime()
		);

		return sorted.reduce<Record<string, Transaction[]>>((groups, transaction) => {
			const dateKey = formatDateKey(transaction);
			if (!groups[dateKey]) groups[dateKey] = [];
			groups[dateKey].push(transaction);
			return groups;
		}, {});
	}, [transactions]);

	return (
		<section className="space-y-5 py-4 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:p-4">
			{transactions.length === 0 && (
				<div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
					Add your first transaction and it will show up here.
				</div>
			)}
			{Object.entries(grouped).map(([date, items]) => (
				<div key={date} className="space-y-2">
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{date}
					</h2>
					<div className="divide-y rounded-lg border bg-card">
						{items.map((transaction) => (
							<div key={transaction.id} className="flex items-center justify-between gap-3 p-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold">{transaction.title}</p>
									<p className="truncate text-xs text-muted-foreground">
										{getCategoryPathLabel(transaction.category, transaction.subcategory)}
									</p>
								</div>
								<p
									className={`shrink-0 text-sm font-semibold ${
										transaction.type === 'income'
											? 'text-green-600 dark:text-green-400'
											: transaction.type === 'expense'
												? 'text-red-600 dark:text-red-400'
												: 'text-blue-600 dark:text-blue-400'
									}`}
								>
									{transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
									{formatCurrency(transaction.amount)}
								</p>
							</div>
						))}
					</div>
				</div>
			))}
		</section>
	);
};

const MobileApp = ({ user }: { user: User }) => {
	const [tab, setTab] = useState<MobileTab>('add');

	return (
		<div className="flex min-h-screen-safe flex-col overflow-x-hidden bg-background text-foreground">
			<header className="sticky top-0 z-20 border-b bg-background/95 py-3 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] backdrop-blur md:px-4">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							CashFlow mobile
						</p>
						<h1 className="truncate text-lg font-semibold">
							{tab === 'add' ? 'Add transaction' : 'Transactions'}
						</h1>
					</div>
					<button
						type="button"
						onClick={() => void signOut(auth)}
						className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
						aria-label={`Sign out ${user.email ?? ''}`}
					>
						<LogOut className="h-4 w-4" />
					</button>
				</div>
			</header>
			<div className="flex-1">
				{tab === 'add' ? <AddTransactionView /> : <TransactionListView />}
			</div>
			<nav className="sticky bottom-0 z-30 border-t bg-background/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] pt-2 backdrop-blur md:px-4 md:pb-3">
				<div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setTab('add')}
						className={`flex h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
							tab === 'add' ? 'bg-primary text-primary-foreground' : 'border bg-card'
						}`}
					>
						<PlusCircle className="h-4 w-4" />
						Add
					</button>
					<button
						type="button"
						onClick={() => setTab('list')}
						className={`flex h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
							tab === 'list' ? 'bg-primary text-primary-foreground' : 'border bg-card'
						}`}
					>
						<List className="h-4 w-4" />
						List
					</button>
				</div>
			</nav>
		</div>
	);
};

export function MobisiteApp() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	if (loading) {
		return (
			<div className="flex min-h-screen-safe items-center justify-center bg-background text-sm text-muted-foreground">
				Loading mobile capture...
			</div>
		);
	}

	return user ? <MobileApp user={user} /> : <AuthPanel />;
}

export default MobisiteApp;
