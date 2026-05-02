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
	| 'recurring';

// Category
export interface Category {
	value: string;
	label: string;
}

export interface CategoryDefinition {
	id: string;
	value: string;
	label: string;
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
	description?: string;
	date?: Date | { toDate: () => Date };
	createdAt?: Date | { toDate: () => Date };
	transferAccountId?: string;
}

// Budget
export type BudgetStatus = 'draft' | 'published';

export interface Budget {
	id?: string;
	userId?: string;
	category: string;
	amount: number;
	period: 'monthly';
	status: BudgetStatus;
	plannedStartDate: string;
	plannedEndDate: string;
	actualStartDate?: string;
	actualEndDate?: string;
	createdAt?: Date | { toDate: () => Date };
}

export interface BudgetProgress {
	budget: Budget;
	status: BudgetStatus;
	isDraft: boolean;
	plannedAmount: number;
	plannedStartDate: string;
	plannedEndDate: string;
	actualStartDate?: string;
	actualEndDate?: string;
	comparisonStartDate: string;
	comparisonEndDate: string;
	started: boolean;
	calculating: boolean;
	actualSpent: number;
	remaining: number;
	overBudget: number;
	percent: number;
}

// Report types
export interface CategoryReport {
	category: string;
	amount: number;
	color: string;
}

export interface AccountReport {
	accountId: string;
	accountName: string;
	color: string;
	income: number;
	expense: number;
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
}

export interface AskAIResponse {
	answer: string;
}
