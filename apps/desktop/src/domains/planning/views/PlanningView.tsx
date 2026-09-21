import React, { useMemo, useState } from 'react';
import {
	FiArrowRight,
	FiCheckCircle,
	FiCreditCard,
	FiEdit2,
	FiExternalLink,
	FiGift,
	FiLink,
	FiPlus,
	FiShoppingBag,
	FiTrash2,
} from 'react-icons/fi';
import type {
	PaymentPlan,
	PaymentPlanProgress,
	PlannedExpense,
	PlannedExpensePriority,
	PlannedExpenseStatus,
} from '@cash-flow/shared/planning/PlanningModel';
import { usePlanningContext } from '@/domains/planning/context/PlanningContext';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useAccountsContext } from '@/domains/accounts/context/AccountsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { Button } from '@/components/app/ui/button';
import { Input } from '@/components/app/ui/input';
import { Label } from '@/components/app/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/app/ui/select';
import { Textarea } from '@/components/app/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import {
	DataListRow,
	DataListSurface,
	EmptyState,
	PageHeader,
	PageShell,
	SummaryCard,
	SummaryCardGrid,
} from '@/components/app/page-layout';
import Currency from '@/components/marketing/Currency';
import { SensitiveText, SensitiveValue } from '@/app/privacy/SensitiveValue';
import { useToast } from '@/components/app/ui/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { liquidGlassPanel, liquidGlassSoft } from '@/styles/marketingStyles';

type WizardMode = 'planned' | 'wishlist' | 'payment';

const WISHLIST_CATEGORY = 'Wishlist';

type PlannedFormState = {
	id?: string;
	title: string;
	amount: string;
	targetMonth: string;
	expectedDate: string;
	category: string;
	subcategory: string;
	accountId: string;
	notes: string;
	url: string;
	priority: PlannedExpensePriority;
	status: PlannedExpenseStatus;
};

type PaymentPlanFormState = {
	id?: string;
	itemName: string;
	originalTotal: string;
	basePaidAmount: string;
	expectedPaymentAmount: string;
	startDate: string;
	expectedCompletionDate: string;
	category: string;
	url: string;
	notes: string;
	status: PaymentPlan['status'];
};

const todayDateKey = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => new Date().toISOString().slice(0, 7);
const dateToInput = (date?: Date): string => (date ? date.toISOString().slice(0, 10) : '');

const emptyPlannedForm = (status: PlannedExpenseStatus = 'planned'): PlannedFormState => ({
	title: '',
	amount: '',
	targetMonth: status === 'wishlist' ? '' : currentMonthKey(),
	expectedDate: '',
	category: status === 'wishlist' ? WISHLIST_CATEGORY : '',
	subcategory: '',
	accountId: '__none__',
	notes: '',
	url: '',
	priority: 'medium',
	status,
});

const emptyPaymentPlanForm = (): PaymentPlanFormState => ({
	itemName: '',
	originalTotal: '',
	basePaidAmount: '0',
	expectedPaymentAmount: '',
	startDate: todayDateKey(),
	expectedCompletionDate: '',
	category: '',
	url: '',
	notes: '',
	status: 'active',
});

const statusLabels: Record<PlannedExpenseStatus, string> = {
	wishlist: 'Wishlist',
	planned: 'Planned',
	purchased: 'Purchased',
	cancelled: 'Cancelled',
};

const planStatusLabels: Record<PaymentPlan['status'], string> = {
	active: 'Active',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

const getProgressTone = (percent: number) => {
	if (percent >= 100) return 'bg-emerald-500';
	if (percent >= 50) return 'bg-blue-500';
	return 'bg-amber-500';
};

const PlanningView: React.FC = () => {
	const {
		plannedExpenses,
		paymentPlans,
		addPlannedExpense,
		updatePlannedExpense,
		deletePlannedExpense,
		addPaymentPlan,
		updatePaymentPlan,
		deletePaymentPlan,
		convertPlannedExpense,
		linkPaymentTransaction,
		unlinkPaymentTransaction,
		calculatePlannedExpenseTotal,
		calculatePaymentPlansProgress,
		getRemainingPlannedExpenses,
		getCurrentMonthKey,
	} = usePlanningContext();
	const { transactions, addTransaction } = useTransactionsContext();
	const { accounts } = useAccountsContext();
	const { categories, categoryOptions, getCategoryPathLabel, getCategoryLabel } =
		useCategoriesContext();
	const { toast } = useToast();
	const [plannedForm, setPlannedForm] = useState<PlannedFormState>(emptyPlannedForm);
	const [paymentPlanForm, setPaymentPlanForm] =
		useState<PaymentPlanFormState>(emptyPaymentPlanForm);
	const [wizardMode, setWizardMode] = useState<WizardMode | null>(null);
	const [wizardOpen, setWizardOpen] = useState(false);
	const [wizardStep, setWizardStep] = useState(0);
	const [isSaving, setIsSaving] = useState(false);
	const [linkingPlanId, setLinkingPlanId] = useState<string | null>(null);
	const [selectedLinkTransactionId, setSelectedLinkTransactionId] = useState('');

	const currentMonth = getCurrentMonthKey();
	const remainingPlanned = useMemo(
		() => getRemainingPlannedExpenses(currentMonth),
		[getRemainingPlannedExpenses, currentMonth]
	);
	const plannedRemainingTotal = calculatePlannedExpenseTotal(currentMonth);
	const wishlistItems = plannedExpenses.filter((expense) => expense.status === 'wishlist');
	const activePaymentProgress = calculatePaymentPlansProgress(transactions).filter(
		(item) => item.plan.status === 'active'
	);
	const availableExpenseTransactions = transactions.filter(
		(transaction) => transaction.id && transaction.type === 'expense'
	);
	const selectedPlannedCategory = categories.find(
		(category) => category.value === plannedForm.category
	);
	const wizardTitle =
		wizardMode === 'payment'
			? paymentPlanForm.id
				? 'Edit payment plan'
				: 'New payment plan'
			: wizardMode
				? plannedForm.id
					? 'Edit plan'
					: wizardMode === 'wishlist'
						? 'New wishlist item'
						: 'New planned expense'
				: 'What are you planning?';

	const openChooser = () => {
		setWizardOpen(true);
		setWizardMode(null);
		setWizardStep(0);
	};

	const openPlannedWizard = (
		mode: Extract<WizardMode, 'planned' | 'wishlist'>,
		expense?: PlannedExpense
	) => {
		if (expense) {
			setPlannedForm({
				id: expense.id,
				title: expense.title,
				amount: String(expense.amount),
				targetMonth: expense.status === 'wishlist' ? '' : (expense.targetMonth ?? ''),
				expectedDate: dateToInput(expense.expectedDate),
				category:
					expense.status === 'wishlist' ? WISHLIST_CATEGORY : expense.category,
				subcategory: expense.subcategory ?? '',
				accountId: expense.accountId ?? '__none__',
				notes: expense.notes ?? '',
				url: expense.url ?? '',
				priority: expense.priority ?? 'medium',
				status: expense.status,
			});
		} else {
			setPlannedForm(emptyPlannedForm(mode === 'wishlist' ? 'wishlist' : 'planned'));
		}
		setWizardOpen(true);
		setWizardMode(mode);
		setWizardStep(1);
	};

	const openPaymentWizard = (plan?: PaymentPlan) => {
		if (plan) {
			setPaymentPlanForm({
				id: plan.id,
				itemName: plan.itemName,
				originalTotal: String(plan.originalTotal),
				basePaidAmount: String(plan.basePaidAmount),
				expectedPaymentAmount: plan.expectedPaymentAmount
					? String(plan.expectedPaymentAmount)
					: '',
				startDate: dateToInput(plan.startDate),
				expectedCompletionDate: dateToInput(plan.expectedCompletionDate),
				category: plan.category ?? '',
				url: plan.url ?? '',
				notes: plan.notes ?? '',
				status: plan.status,
			});
		} else {
			setPaymentPlanForm(emptyPaymentPlanForm());
		}
		setWizardOpen(true);
		setWizardMode('payment');
		setWizardStep(1);
	};

	const closeWizard = () => {
		setWizardOpen(false);
		setWizardMode(null);
		setWizardStep(0);
		setPlannedForm(emptyPlannedForm());
		setPaymentPlanForm(emptyPaymentPlanForm());
	};

	const handlePlannedChange = (field: keyof PlannedFormState, value: string) => {
		setPlannedForm((current) => ({
			...current,
			[field]: value,
			...(field === 'category' ? { subcategory: '' } : {}),
		}));
	};

	const handlePaymentPlanChange = (field: keyof PaymentPlanFormState, value: string) => {
		setPaymentPlanForm((current) => ({ ...current, [field]: value }));
	};

	const savePlannedExpense = async () => {
		setIsSaving(true);
		try {
			const isWishlist = wizardMode === 'wishlist';
			const payload = isWishlist
				? {
						title: plannedForm.title,
						amount: Number(plannedForm.amount),
						category: WISHLIST_CATEGORY,
						url: plannedForm.url || undefined,
						status: 'wishlist' as const,
					}
				: {
						title: plannedForm.title,
						amount: Number(plannedForm.amount),
						targetMonth: plannedForm.targetMonth || undefined,
						expectedDate: plannedForm.expectedDate
							? new Date(`${plannedForm.expectedDate}T12:00:00`)
							: undefined,
						category: plannedForm.category,
						subcategory: plannedForm.subcategory || undefined,
						accountId:
							plannedForm.accountId === '__none__' ? undefined : plannedForm.accountId,
						notes: plannedForm.notes || undefined,
						url: plannedForm.url || undefined,
						priority: plannedForm.priority,
						status: plannedForm.status,
					};

			if (plannedForm.id) {
				await updatePlannedExpense(plannedForm.id, payload);
				toast({ title: 'Plan updated', description: 'Planning item saved.' });
			} else {
				await addPlannedExpense(payload);
				toast({ title: 'Plan added', description: 'Planning item saved.' });
			}
			closeWizard();
		} catch (error) {
			toast({
				title: 'Could not save plan',
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const savePaymentPlan = async () => {
		setIsSaving(true);
		try {
			const payload = {
				itemName: paymentPlanForm.itemName,
				originalTotal: Number(paymentPlanForm.originalTotal),
				basePaidAmount: Number(paymentPlanForm.basePaidAmount || 0),
				expectedPaymentAmount: paymentPlanForm.expectedPaymentAmount
					? Number(paymentPlanForm.expectedPaymentAmount)
					: undefined,
				startDate: paymentPlanForm.startDate
					? new Date(`${paymentPlanForm.startDate}T12:00:00`)
					: undefined,
				expectedCompletionDate: paymentPlanForm.expectedCompletionDate
					? new Date(`${paymentPlanForm.expectedCompletionDate}T12:00:00`)
					: undefined,
				category: paymentPlanForm.category || undefined,
				url: paymentPlanForm.url || undefined,
				notes: paymentPlanForm.notes || undefined,
				status: paymentPlanForm.status,
				linkedTransactionIds:
					paymentPlans.find((plan) => plan.id === paymentPlanForm.id)
						?.linkedTransactionIds ?? [],
			};

			if (paymentPlanForm.id) {
				await updatePaymentPlan(paymentPlanForm.id, payload);
				toast({ title: 'Payment plan updated', description: 'Progress tracker saved.' });
			} else {
				await addPaymentPlan(payload);
				toast({ title: 'Payment plan added', description: 'Progress tracker saved.' });
			}
			closeWizard();
		} catch (error) {
			toast({
				title: 'Could not save payment plan',
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleConvert = async (expense: PlannedExpense) => {
		const accountId = expense.accountId ?? accounts[0]?.id;
		if (!accountId) {
			toast({
				title: 'Account needed',
				description: 'Choose an account before converting this plan.',
				variant: 'destructive',
			});
			openPlannedWizard(expense.status === 'wishlist' ? 'wishlist' : 'planned', expense);
			return;
		}

		try {
			const transactionId = await addTransaction({
				type: 'expense',
				accountId,
				title: expense.title,
				amount: expense.amount,
				category: expense.category,
				subcategory: expense.subcategory,
				description: expense.notes,
				date: expense.expectedDate ?? new Date(),
			});
			await convertPlannedExpense(expense, transactionId);
			toast({
				title: 'Plan converted',
				description: `${expense.title} is now a real expense.`,
			});
		} catch (error) {
			toast({
				title: 'Could not convert plan',
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive',
			});
		}
	};

	const handleLinkTransaction = async (plan: PaymentPlan) => {
		if (!selectedLinkTransactionId) return;
		try {
			await linkPaymentTransaction(plan, selectedLinkTransactionId);
			setSelectedLinkTransactionId('');
			setLinkingPlanId(null);
			toast({ title: 'Payment linked', description: 'Progress now includes that expense.' });
		} catch (error) {
			toast({
				title: 'Could not link payment',
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive',
			});
		}
	};

	const canAdvancePlannedStep =
		wizardMode === 'wishlist'
			? Boolean(plannedForm.title && plannedForm.amount)
			: wizardStep === 1
				? Boolean(plannedForm.title && plannedForm.amount)
				: wizardStep === 2
					? Boolean(plannedForm.category)
					: true;
	const canAdvancePaymentStep =
		wizardStep === 1
			? Boolean(paymentPlanForm.itemName && paymentPlanForm.originalTotal)
			: true;
	const isLastStep = wizardMode === 'wishlist' ? wizardStep === 1 : wizardStep === 3;
	const canContinue = wizardMode === 'payment' ? canAdvancePaymentStep : canAdvancePlannedStep;

	const handleWizardNext = () => {
		if (!wizardMode) return;
		if (isLastStep) {
			if (wizardMode === 'payment') void savePaymentPlan();
			else void savePlannedExpense();
			return;
		}
		setWizardStep((current) => current + 1);
	};

	return (
		<PageShell>
			<PageHeader
				title="Planning"
				subtitle="Simple projections, bookmarks, and payment progress."
				actions={
					<Button type="button" variant="marketing" onClick={openChooser}>
						<FiPlus className="h-4 w-4" />
						Add plan
					</Button>
				}
			/>

			<div className="space-y-8">
				<SummaryCardGrid>
					<SummaryCard
						label="Planned this month"
						amount={plannedRemainingTotal}
						note={`${remainingPlanned.length} items still expected`}
					/>
					<SummaryCard label="Wishlist" value={wishlistItems.length} note="Ideas for later" />
					<SummaryCard
						label="Payment plans"
						value={activePaymentProgress.length}
						note="Active progress trackers"
					/>
					<SummaryCard
						label="Still committed"
						amount={activePaymentProgress.reduce((sum, item) => sum + item.remaining, 0)}
						note="Across active plans"
					/>
				</SummaryCardGrid>

				<section
					className={cn(
						'flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between',
						liquidGlassSoft
					)}
				>
					<div>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							Add something without thinking about the model
						</h2>
						<p className="text-sm text-gray-600 dark:text-gray-300">
							Start with intent. Cash Flow will save it as a plan, wishlist item, or payment plan.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" onClick={() => openPlannedWizard('planned')}>
							<FiShoppingBag className="h-4 w-4" />
							Planned expense
						</Button>
						<Button type="button" variant="outline" onClick={() => openPlannedWizard('wishlist')}>
							<FiGift className="h-4 w-4" />
							Wishlist
						</Button>
						<Button type="button" variant="outline" onClick={() => openPaymentWizard()}>
							<FiCreditCard className="h-4 w-4" />
							Payment plan
						</Button>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
					<PlansList
						plannedExpenses={plannedExpenses}
						getCategoryPathLabel={getCategoryPathLabel}
						onEdit={(expense) =>
							openPlannedWizard(expense.status === 'wishlist' ? 'wishlist' : 'planned', expense)
						}
						onConvert={handleConvert}
						onDelete={deletePlannedExpense}
					/>
					<PaymentPlansList
						progress={calculatePaymentPlansProgress(transactions)}
						transactions={transactions}
						availableExpenseTransactions={availableExpenseTransactions}
						linkingPlanId={linkingPlanId}
						selectedLinkTransactionId={selectedLinkTransactionId}
						getCategoryLabel={getCategoryLabel}
						onEdit={openPaymentWizard}
						onDelete={deletePaymentPlan}
						onStartLink={(plan) => {
							setLinkingPlanId(linkingPlanId === plan.id ? null : plan.id);
							setSelectedLinkTransactionId('');
						}}
						onSelectLink={setSelectedLinkTransactionId}
						onLink={handleLinkTransaction}
						onUnlink={unlinkPaymentTransaction}
						onComplete={(plan) => updatePaymentPlan(plan.id, { status: 'completed' })}
					/>
				</section>
			</div>

			<Dialog open={wizardOpen} onOpenChange={(open) => !open && closeWizard()}>
				<DialogContent className={cn('max-w-2xl rounded-[2rem]', liquidGlassPanel)}>
					<DialogHeader>
						<DialogTitle>{wizardTitle}</DialogTitle>
						<DialogDescription>
							{wizardMode === 'wishlist'
								? 'Title, optional link, and estimated price.'
								: wizardMode
									? `Step ${wizardStep} of 3`
									: 'Choose the kind of plan and Cash Flow will guide the rest.'}
						</DialogDescription>
					</DialogHeader>
					<div className={cn('rounded-3xl p-4', liquidGlassSoft)}>
						<WizardContent
							wizardMode={wizardMode}
							wizardStep={wizardStep}
							plannedForm={plannedForm}
							paymentPlanForm={paymentPlanForm}
							selectedPlannedCategory={selectedPlannedCategory}
							categoryOptions={categoryOptions}
							accounts={accounts}
							onChoosePlanned={() => openPlannedWizard('planned')}
							onChooseWishlist={() => openPlannedWizard('wishlist')}
							onChoosePayment={() => openPaymentWizard()}
							onPlannedChange={handlePlannedChange}
							onPaymentChange={handlePaymentPlanChange}
						/>
					</div>
					{wizardMode && (
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									if (wizardStep === 1) {
										setWizardMode(null);
										setWizardStep(0);
									} else {
										setWizardStep((current) => current - 1);
									}
								}}
							>
								Back
							</Button>
							<Button
								type="button"
								variant="marketing"
								onClick={handleWizardNext}
								disabled={!canContinue || isSaving}
							>
								{isLastStep ? 'Save' : 'Continue'}
							</Button>
						</DialogFooter>
					)}
				</DialogContent>
			</Dialog>
		</PageShell>
	);
};

interface WizardContentProps {
	wizardMode: WizardMode | null;
	wizardStep: number;
	plannedForm: PlannedFormState;
	paymentPlanForm: PaymentPlanFormState;
	selectedPlannedCategory?: { subcategories: { value: string; label: string }[] };
	categoryOptions: { value: string; label: string }[];
	accounts: { id?: string; name: string }[];
	onChoosePlanned: () => void;
	onChooseWishlist: () => void;
	onChoosePayment: () => void;
	onPlannedChange: (field: keyof PlannedFormState, value: string) => void;
	onPaymentChange: (field: keyof PaymentPlanFormState, value: string) => void;
}

const WizardContent: React.FC<WizardContentProps> = ({
	wizardMode,
	wizardStep,
	plannedForm,
	paymentPlanForm,
	selectedPlannedCategory,
	categoryOptions,
	accounts,
	onChoosePlanned,
	onChooseWishlist,
	onChoosePayment,
	onPlannedChange,
	onPaymentChange,
}) => {
	if (!wizardMode) {
		return (
			<div className="grid gap-3 sm:grid-cols-3">
				<WizardChoice
					icon={<FiShoppingBag className="h-5 w-5" />}
					title="A planned expense"
					description="Something you expect to buy soon."
					onClick={onChoosePlanned}
				/>
				<WizardChoice
					icon={<FiGift className="h-5 w-5" />}
					title="A wishlist item"
					description="A bookmark for later."
					onClick={onChooseWishlist}
				/>
				<WizardChoice
					icon={<FiCreditCard className="h-5 w-5" />}
					title="A payment plan"
					description="An item paid off over time."
					onClick={onChoosePayment}
				/>
			</div>
		);
	}

	if (wizardMode === 'payment') {
		return (
			<PaymentWizardStep
				step={wizardStep}
				form={paymentPlanForm}
				categoryOptions={categoryOptions}
				onChange={onPaymentChange}
			/>
		);
	}

	if (wizardMode === 'wishlist') {
		return (
			<WishlistFormStep form={plannedForm} onChange={onPlannedChange} />
		);
	}

	return (
		<PlannedWizardStep
			step={wizardStep}
			form={plannedForm}
			selectedCategory={selectedPlannedCategory}
			categoryOptions={categoryOptions}
			accounts={accounts}
			onChange={onPlannedChange}
		/>
	);
};

const WishlistFormStep = ({
	form,
	onChange,
}: {
	form: PlannedFormState;
	onChange: (field: keyof PlannedFormState, value: string) => void;
}) => (
	<div className="grid gap-4">
		<Field label="Title">
			<Input
				value={form.title}
				onChange={(event) => onChange('title', event.target.value)}
				autoFocus
			/>
		</Field>
		<Field label="Estimated price">
			<Input
				type="number"
				min="0"
				step="0.01"
				value={form.amount}
				onChange={(event) => onChange('amount', event.target.value)}
			/>
		</Field>
		<Field label="Link">
			<Input
				type="url"
				value={form.url}
				onChange={(event) => onChange('url', event.target.value)}
				placeholder="https://"
			/>
		</Field>
	</div>
);

const PlannedWizardStep = ({
	step,
	form,
	selectedCategory,
	categoryOptions,
	accounts,
	onChange,
}: {
	step: number;
	form: PlannedFormState;
	selectedCategory?: { subcategories: { value: string; label: string }[] };
	categoryOptions: { value: string; label: string }[];
	accounts: { id?: string; name: string }[];
	onChange: (field: keyof PlannedFormState, value: string) => void;
}) => {
	if (step === 1) {
		return (
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Name" className="sm:col-span-2">
					<Input
						value={form.title}
						onChange={(event) => onChange('title', event.target.value)}
						autoFocus
					/>
				</Field>
				<Field label="Expected amount">
					<Input
						type="number"
						min="0"
						step="0.01"
						value={form.amount}
						onChange={(event) => onChange('amount', event.target.value)}
					/>
				</Field>
				<Field label="Expected date">
					<Input
						type="date"
						value={form.expectedDate}
						onChange={(event) => onChange('expectedDate', event.target.value)}
					/>
				</Field>
				<Field label="Target month">
					<Input
						type="month"
						value={form.targetMonth}
						onChange={(event) => onChange('targetMonth', event.target.value)}
					/>
				</Field>
			</div>
		);
	}

	if (step === 2) {
		return (
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Category">
					<Select value={form.category} onValueChange={(value) => onChange('category', value)}>
						<SelectTrigger>
							<SelectValue placeholder="Select category" />
						</SelectTrigger>
						<SelectContent>
							{categoryOptions.map((category) => (
								<SelectItem key={category.value} value={category.value}>
									{category.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field label="Subcategory">
					<Select
						value={form.subcategory || '__none__'}
						onValueChange={(value) =>
							onChange('subcategory', value === '__none__' ? '' : value)
						}
						disabled={!selectedCategory?.subcategories.length}
					>
						<SelectTrigger>
							<SelectValue placeholder="Optional" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">No subcategory</SelectItem>
							{selectedCategory?.subcategories.map((subcategory) => (
								<SelectItem key={subcategory.value} value={subcategory.value}>
									{subcategory.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field label="Account">
						<Select value={form.accountId} onValueChange={(value) => onChange('accountId', value)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">No account yet</SelectItem>
								{accounts.map((account) => (
									<SelectItem key={account.id} value={account.id!}>
										{account.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				<Field label="Priority">
					<Select
						value={form.priority}
						onValueChange={(value) => onChange('priority', value as PlannedExpensePriority)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="low">Low</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="high">High</SelectItem>
						</SelectContent>
					</Select>
				</Field>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			<Field label="Status">
				<Select
					value={form.status}
					onValueChange={(value) => onChange('status', value as PlannedExpenseStatus)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(statusLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			<Field label="Link">
				<Input
					type="url"
					value={form.url}
					onChange={(event) => onChange('url', event.target.value)}
					placeholder="https://"
				/>
			</Field>
			<Field label="Notes">
				<Textarea value={form.notes} onChange={(event) => onChange('notes', event.target.value)} />
			</Field>
		</div>
	);
};

const PaymentWizardStep = ({
	step,
	form,
	categoryOptions,
	onChange,
}: {
	step: number;
	form: PaymentPlanFormState;
	categoryOptions: { value: string; label: string }[];
	onChange: (field: keyof PaymentPlanFormState, value: string) => void;
}) => {
	if (step === 1) {
		return (
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Item name" className="sm:col-span-2">
					<Input
						value={form.itemName}
						onChange={(event) => onChange('itemName', event.target.value)}
						autoFocus
					/>
				</Field>
				<Field label="Original total">
					<Input
						type="number"
						min="0"
						step="0.01"
						value={form.originalTotal}
						onChange={(event) => onChange('originalTotal', event.target.value)}
					/>
				</Field>
				<Field label="Already paid">
					<Input
						type="number"
						min="0"
						step="0.01"
						value={form.basePaidAmount}
						onChange={(event) => onChange('basePaidAmount', event.target.value)}
					/>
				</Field>
			</div>
		);
	}

	if (step === 2) {
		return (
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Expected payment">
					<Input
						type="number"
						min="0"
						step="0.01"
						value={form.expectedPaymentAmount}
						onChange={(event) => onChange('expectedPaymentAmount', event.target.value)}
					/>
				</Field>
				<Field label="Status">
					<Select
						value={form.status}
						onValueChange={(value) => onChange('status', value as PaymentPlan['status'])}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(planStatusLabels).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field label="Start date">
					<Input
						type="date"
						value={form.startDate}
						onChange={(event) => onChange('startDate', event.target.value)}
					/>
				</Field>
				<Field label="Expected completion">
					<Input
						type="date"
						value={form.expectedCompletionDate}
						onChange={(event) => onChange('expectedCompletionDate', event.target.value)}
					/>
				</Field>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			<Field label="Category">
				<Select
					value={form.category || '__none__'}
					onValueChange={(value) => onChange('category', value === '__none__' ? '' : value)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__none__">No category</SelectItem>
						{categoryOptions.map((category) => (
							<SelectItem key={category.value} value={category.value}>
								{category.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			<Field label="Link">
				<Input
					type="url"
					value={form.url}
					onChange={(event) => onChange('url', event.target.value)}
					placeholder="https://"
				/>
			</Field>
			<Field label="Notes">
				<Textarea value={form.notes} onChange={(event) => onChange('notes', event.target.value)} />
			</Field>
		</div>
	);
};

interface PlansListProps {
	plannedExpenses: PlannedExpense[];
	getCategoryPathLabel: (category: string, subcategory?: string) => string;
	onEdit: (expense: PlannedExpense) => void;
	onConvert: (expense: PlannedExpense) => void;
	onDelete: (id: string) => void;
}

const PlansList: React.FC<PlansListProps> = ({
	plannedExpenses,
	getCategoryPathLabel,
	onEdit,
	onConvert,
	onDelete,
}) => (
	<div className="space-y-4">
		<div>
			<h2 className="text-lg font-semibold text-gray-950 dark:text-white">Plans and wishlist</h2>
			<p className="text-sm text-gray-500 dark:text-gray-400">
				Planned items affect projections. Wishlist items wait quietly.
			</p>
		</div>
		{plannedExpenses.length === 0 ? (
			<EmptyState
				title="No plans yet"
				description="Use the guided flow to add something you expect to buy or save for later."
			/>
		) : (
			<DataListSurface>
				{plannedExpenses.slice(0, 8).map((expense) => (
					<DataListRow
						key={expense.id}
						className="md:grid-cols-[minmax(220px,1fr)_minmax(140px,0.55fr)_minmax(220px,0.9fr)]"
					>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
								<SensitiveText widthClassName="w-36">{expense.title}</SensitiveText>
							</p>
							<p className="truncate text-xs text-gray-500 dark:text-gray-400">
								{expense.status === 'wishlist'
									? 'Wishlist'
									: `${getCategoryPathLabel(expense.category, expense.subcategory)}${
											expense.targetMonth ? ` · ${expense.targetMonth}` : ''
										}`}
							</p>
							{expense.url && (
								<a
									href={expense.url}
									target="_blank"
									rel="noreferrer"
									className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
								>
									Open link <FiExternalLink className="h-3 w-3" />
								</a>
							)}
						</div>
						<div>
							<Currency amount={expense.amount} className="text-sm" />
							<p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
								{statusLabels[expense.status]}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button type="button" variant="outline" onClick={() => onEdit(expense)}>
								<FiEdit2 className="h-4 w-4" />
								Edit
							</Button>
							{expense.status !== 'purchased' && expense.status !== 'cancelled' && (
								<Button type="button" variant="outline" onClick={() => onConvert(expense)}>
									<FiArrowRight className="h-4 w-4" />
									Convert
								</Button>
							)}
							<Button
								type="button"
								variant="ghost"
								onClick={() => onDelete(expense.id)}
								aria-label={`Delete ${expense.title}`}
							>
								<FiTrash2 className="h-4 w-4" />
							</Button>
						</div>
					</DataListRow>
				))}
			</DataListSurface>
		)}
	</div>
);

interface PaymentPlansListProps {
	progress: PaymentPlanProgress[];
	transactions: ReturnType<typeof useTransactionsContext>['transactions'];
	availableExpenseTransactions: ReturnType<typeof useTransactionsContext>['transactions'];
	linkingPlanId: string | null;
	selectedLinkTransactionId: string;
	getCategoryLabel: (category: string) => string;
	onEdit: (plan: PaymentPlan) => void;
	onDelete: (id: string) => void;
	onStartLink: (plan: PaymentPlan) => void;
	onSelectLink: (id: string) => void;
	onLink: (plan: PaymentPlan) => void;
	onUnlink: (plan: PaymentPlan, transactionId: string) => void;
	onComplete: (plan: PaymentPlan) => void;
}

const PaymentPlansList: React.FC<PaymentPlansListProps> = ({
	progress,
	transactions,
	availableExpenseTransactions,
	linkingPlanId,
	selectedLinkTransactionId,
	getCategoryLabel,
	onEdit,
	onDelete,
	onStartLink,
	onSelectLink,
	onLink,
	onUnlink,
	onComplete,
}) => (
	<div className="space-y-4">
		<div>
			<h2 className="text-lg font-semibold text-gray-950 dark:text-white">Payment progress</h2>
			<p className="text-sm text-gray-500 dark:text-gray-400">
				Progress from base paid amount plus linked real expenses.
			</p>
		</div>
		{progress.length === 0 ? (
			<EmptyState
				title="No payment plans yet"
				description="Track a larger purchase once you are paying it off."
			/>
		) : (
			<div className="space-y-3">
				{progress.map((item) => {
					const { plan, paid, remaining, percentComplete, paymentsRemaining } = item;
					const linkedTransactions = transactions.filter(
						(transaction) =>
							transaction.id && plan.linkedTransactionIds.includes(transaction.id)
					);
					const isLinking = linkingPlanId === plan.id;
					return (
						<div
							key={plan.id}
							className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
										<SensitiveText widthClassName="w-40">{plan.itemName}</SensitiveText>
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{plan.category ? getCategoryLabel(plan.category) : 'No category'} ·{' '}
										{planStatusLabels[plan.status]}
									</p>
								</div>
								<div className="flex gap-1">
									<Button type="button" variant="ghost" onClick={() => onEdit(plan)}>
										<FiEdit2 className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										onClick={() => onDelete(plan.id)}
										aria-label={`Delete ${plan.itemName}`}
									>
										<FiTrash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>

							<div className="mt-4">
								<div className="flex items-center justify-between text-sm">
									<SensitiveValue widthClassName="w-32">
										{formatCurrency(paid)} / {formatCurrency(plan.originalTotal)} paid
									</SensitiveValue>
									<span className="font-medium">{Math.round(percentComplete)}%</span>
								</div>
								<div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
									<div
										className={cn('h-full rounded-full', getProgressTone(percentComplete))}
										style={{ width: `${percentComplete}%` }}
									/>
								</div>
								<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
									{formatCurrency(remaining)} remaining · {paymentsRemaining ?? 'N/A'} payments left
								</p>
							</div>

							<div className="mt-3 flex flex-wrap gap-2">
								<Button type="button" variant="outline" onClick={() => onStartLink(plan)}>
									<FiLink className="h-4 w-4" />
									Link payment
								</Button>
								{remaining === 0 && plan.status !== 'completed' && (
									<Button type="button" variant="outline" onClick={() => onComplete(plan)}>
										<FiCheckCircle className="h-4 w-4" />
										Complete
									</Button>
								)}
							</div>

							{isLinking && (
								<div className="mt-3 flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/40">
									<Select value={selectedLinkTransactionId} onValueChange={onSelectLink}>
										<SelectTrigger>
											<SelectValue placeholder="Select expense transaction" />
										</SelectTrigger>
										<SelectContent>
											{availableExpenseTransactions
												.filter(
													(transaction) =>
														transaction.id &&
														!plan.linkedTransactionIds.includes(transaction.id)
												)
												.map((transaction) => (
													<SelectItem key={transaction.id} value={transaction.id!}>
														{transaction.title} · {formatCurrency(transaction.amount)}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									<Button
										type="button"
										variant="marketing"
										onClick={() => onLink(plan)}
										disabled={!selectedLinkTransactionId}
									>
										Link
									</Button>
								</div>
							)}

							{linkedTransactions.length > 0 && (
								<div className="mt-3 space-y-2">
									{linkedTransactions.map((transaction) => (
										<div
											key={transaction.id}
											className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/50"
										>
											<span className="truncate">
												{transaction.title} · {formatCurrency(transaction.amount)}
											</span>
											<Button
												type="button"
												variant="ghost"
												onClick={() => onUnlink(plan, transaction.id!)}
											>
												Unlink
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		)}
	</div>
);

interface FieldProps {
	label: string;
	children: React.ReactNode;
	className?: string;
}

const Field: React.FC<FieldProps> = ({ label, children, className }) => (
	<div className={cn('space-y-2', className)}>
		<Label>{label}</Label>
		{children}
	</div>
);

interface WizardChoiceProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	onClick: () => void;
}

const WizardChoice: React.FC<WizardChoiceProps> = ({ icon, title, description, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		className="flex min-h-40 flex-col justify-between rounded-3xl border border-white/55 bg-white/55 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white/75 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
	>
		<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
			{icon}
		</span>
		<span>
			<span className="block text-sm font-semibold text-gray-950 dark:text-white">{title}</span>
			<span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">{description}</span>
		</span>
	</button>
);

export default PlanningView;
