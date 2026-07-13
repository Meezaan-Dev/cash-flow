// Theme
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

// ViewType
export type ViewType =
	| 'dashboard'
	| 'reports'
	| 'transaction'
	| 'table'
	| 'list'
	| 'accounts'
	| 'budgets'
	| 'transfer'
	| 'reconcile'
	| 'recurring'
	| 'random'
	| 'assistant';

// Category
export interface Category {
	value: string;
	label: string;
}

export interface CategoryDefinition {
	id: string;
	value: string;
	label: string;
	subcategories: Category[];
	createdAt?: Date | { toDate: () => Date };
	updatedAt?: Date | { toDate: () => Date };
}

// Account
export type AccountType = 'debit' | 'credit' | 'savings' | 'cash';

export interface Account {
	id?: string;
	userId?: string;
	name: string;
	bank?: string;
	type: AccountType;
	currency?: string;
	balance: number;
	creditLimit?: number;
	color?: string;
	icon?: string;
	createdAt?: Date | { toDate: () => Date };
}

// Transaction
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
	id?: string;
	userId?: string;
	accountId: string;
	title: string;
	amount: number;
	type: TransactionType;
	category: string;
	subcategory?: string;
	description?: string;
	date?: Date | { toDate: () => Date };
	createdAt?: Date | { toDate: () => Date };
	transferAccountId?: string;
	transferId?: string;
	transferDirection?: 'out' | 'in';
	recurringTransactionId?: string;
	recurringOccurrenceDate?: string;
}

export interface Budget {
	id: string;
	userId: string;
	accountId?: string;
	categoryId: string;
	subCategoryId?: string;
	amount: number;
	period: 'monthly' | 'custom';
	month?: string;
	cycleDay?: number;
	startDay?: number;
	endDay?: number;
	startDate: string;
	endDate: string;
	lifecycleStatus: 'draft' | 'published';
	displayOrder?: number;
	createdAt?: Date | { toDate: () => Date };
	updatedAt?: Date | { toDate: () => Date };
}

export type BudgetStatus = 'safe' | 'warning' | 'over';

export interface BudgetProgress {
	budget: Budget;
	spent: number;
	remaining: number;
	usedPercentage: number;
	status: BudgetStatus;
}

// Report types
export interface CategoryReport {
	category: string;
	amount: number;
	color: string;
}

export interface SubcategoryReport {
	category: string;
	subcategory?: string;
	amount: number;
	color: string;
}

export interface CategoryBreakdownSubcategory {
	category: string;
	subcategory?: string;
	amount: number;
	percentage: number;
}

export interface CategoryBreakdownReport {
	category: string;
	amount: number;
	color: string;
	subcategories: CategoryBreakdownSubcategory[];
}

export interface MonthlySubcategorySummary {
	category: string;
	subcategory?: string;
	amount: number;
	percentage: number;
	transactionCount: number;
	previousAmount: number;
	deltaAmount: number;
}

export interface MonthlyCategorySummary {
	category: string;
	amount: number;
	percentage: number;
	transactionCount: number;
	previousAmount: number;
	deltaAmount: number;
	color: string;
	subcategories: MonthlySubcategorySummary[];
}

export interface AccountReport {
	accountId: string;
	accountName: string;
	color: string;
	income: number;
	expense: number;
}

export interface MonthlyAccountSummary {
	accountId: string;
	accountName: string;
	color: string;
	income: number;
	expense: number;
	net: number;
	transactionCount: number;
}

export interface MonthlyTrend {
	month: string;
	income: number;
	expense: number;
}

export interface NetWorthData {
	assets: number;
	liabilities: number;
	netWorth: number;
}

// Global filters
export interface GlobalFilters {
	accountId: string | null;
	category: string | null;
	dateRange: DateRange;
	type: TransactionType | null;
}

// DateRange
export interface DateRange {
	startDate: string;
	endDate: string;
}

// SidebarProps
export interface SidebarProps {
	toggleSidebar: () => void;
	transactions: Transaction[];
	onCreate: () => void;
	onSelect: (tx: Transaction | null) => void;
	onDelete: (id: string) => void;
	selectedId: string | null;
	collapsed: boolean;
	activeView: ViewType;
	onViewChange: (view: ViewType) => void;
}

// TransactionFormProps
export interface TransactionFormProps {
	onSubmit: (data: Omit<Transaction, 'id' | 'date' | 'createdAt'>) => Promise<void> | void;
	onClose: () => void;
	transaction?: Transaction;
}

// PieChart
export interface PieChartData {
	name: string;
	value: number;
	color: string;
}

export interface PieChartComponentProps {
	data: PieChartData[];
	onClose: () => void;
	dateRange?: DateRange;
	onDateRangeChange?: (range: DateRange) => void;
}

// TransactionsTable
export interface TransactionsTableProps {
	transactions: Transaction[];
	onDelete: (id: string) => void;
	onSelect: (tx: Transaction) => void;
	selectedId: string | null;
}

export interface ImportResult {
	importedCount: number;
	skippedDuplicates: number;
	errors: string[];
}

export interface SerializableTransaction {
	title: string;
	amount: number;
	type: TransactionType;
	category: string;
	subcategory?: string;
	description?: string;
	date?: string;
	accountId?: string;
}

// AI Chatbot
export type ChatMessageRole = 'user' | 'assistant';

export interface AIChatMessage {
	id: string;
	role: ChatMessageRole;
	content: string;
	isError?: boolean;
	createdAt: number;
}

export interface AskAIRequest {
	question: string;
	userId: string;
	history?: Array<Pick<AIChatMessage, 'role' | 'content'>>;
}

export interface AskAIResponse {
	answer: string;
}
