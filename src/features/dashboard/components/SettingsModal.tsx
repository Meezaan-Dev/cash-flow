import React, { useState, useEffect } from 'react';
import {
	FiChevronDown,
	FiChevronRight,
	FiDatabase,
	FiEdit2,
	FiFilter,
	FiPlus,
	FiSettings,
	FiTag,
	FiTrash2,
} from 'react-icons/fi';
import { useTheme } from '@/features/theme/context/ThemeContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { Button } from '@/components/app/ui/button';
import { Switch } from '@/components/app/ui/switch';
import { Label } from '@/components/app/ui/label';
import { Input } from '@/components/app/ui/input';
import { useTransactionsContext } from '@/features/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/features/categories/context/CategoriesContext';
import { useFilterPreferences, FilterPreferences } from '@/features/filters/context/FilterPreferencesContext';

interface SettingsModalProps {
	open: boolean;
	onClose: () => void;
	onImport?: (file: File) => Promise<void> | void;
	onExportCSV?: () => void;
	onExportJSON?: () => void;
	initialTab?: 'general' | 'data' | 'filters' | 'categories';
}

const SettingsModal: React.FC<SettingsModalProps> = ({
	open,
	onClose,
	onImport,
	onExportCSV,
	onExportJSON,
	initialTab,
}) => {
	const { deleteAllTransactions } = useTransactionsContext();
	const {
		categories,
		loading: categoriesLoading,
		addCategory,
		renameCategory,
		deleteCategory,
		addSubcategory,
		renameSubcategory,
		deleteSubcategory,
	} = useCategoriesContext();
	const { theme, setTheme } = useTheme();
	const { prefs, setFilterVisible } = useFilterPreferences();
	const [localTheme, setLocalTheme] = useState(theme);
	const { currentUser } = useAuth();
	const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
	const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<'general' | 'data' | 'filters' | 'categories'>(
		initialTab ?? 'general'
	);
	const [newCategoryLabel, setNewCategoryLabel] = useState('');
	const [newSubcategoryLabels, setNewSubcategoryLabels] = useState<Record<string, string>>({});
	const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
	const [editingCategoryLabel, setEditingCategoryLabel] = useState('');
	const [editingSubcategory, setEditingSubcategory] = useState<{
		categoryId: string;
		value: string;
	} | null>(null);
	const [editingSubcategoryLabel, setEditingSubcategoryLabel] = useState('');
	const [categoryError, setCategoryError] = useState('');
	const [categoryBusy, setCategoryBusy] = useState(false);

	useEffect(() => {
		setLocalTheme(theme);
	}, [theme]);

	useEffect(() => {
		if (open) setActiveTab(initialTab ?? 'general');
	}, [open, initialTab]);

	useEffect(() => {
		if (!open) {
			setNewCategoryLabel('');
			setNewSubcategoryLabels({});
			setExpandedCategoryIds([]);
			setEditingCategoryId(null);
			setEditingCategoryLabel('');
			setEditingSubcategory(null);
			setEditingSubcategoryLabel('');
			setCategoryError('');
			setCategoryBusy(false);
		}
	}, [open]);

	const handleApply = () => {
		if (localTheme !== theme) setTheme(localTheme);
		onClose();
	};

	const handleSignOut = async () => {
		setLogoutConfirmOpen(true);
	};

	const confirmLogout = async () => {
		await signOut(auth);
		localStorage.removeItem('token');
		setLogoutConfirmOpen(false);
		onClose();
	};

	const handleDeleteAllClick = () => {
		setDeleteAllConfirmOpen(true);
	};

	const confirmDeleteAllTransactions = async () => {
		await deleteAllTransactions();
		setDeleteAllConfirmOpen(false);
		onClose();
	};

	const handleAddCategory = async () => {
		setCategoryError('');
		setCategoryBusy(true);
		try {
			await addCategory(newCategoryLabel);
			setNewCategoryLabel('');
		} catch (error) {
			setCategoryError(
				error instanceof Error
					? error.message
					: 'Unable to add category right now.'
			);
		} finally {
			setCategoryBusy(false);
		}
	};

	const handleAddSubcategory = async (categoryId: string) => {
		const label = newSubcategoryLabels[categoryId] ?? '';
		setCategoryError('');
		setCategoryBusy(true);
		setExpandedCategoryIds((current) =>
			current.includes(categoryId) ? current : [...current, categoryId]
		);
		try {
			await addSubcategory(categoryId, label);
			setNewSubcategoryLabels((current) => ({ ...current, [categoryId]: '' }));
		} catch (error) {
			setCategoryError(
				error instanceof Error
					? error.message
					: 'Unable to add subcategory right now.'
			);
		} finally {
			setCategoryBusy(false);
		}
	};

	const handleStartRename = (id: string, label: string) => {
		setEditingCategoryId(id);
		setEditingCategoryLabel(label);
		setCategoryError('');
	};

	const handleSaveRename = async () => {
		if (!editingCategoryId) return;
		setCategoryError('');
		setCategoryBusy(true);
		try {
			await renameCategory(editingCategoryId, editingCategoryLabel);
			setEditingCategoryId(null);
			setEditingCategoryLabel('');
		} catch (error) {
			setCategoryError(
				error instanceof Error
					? error.message
					: 'Unable to rename category right now.'
			);
		} finally {
			setCategoryBusy(false);
		}
	};

	const handleStartRenameSubcategory = (
		categoryId: string,
		value: string,
		label: string
	) => {
		setEditingSubcategory({ categoryId, value });
		setEditingSubcategoryLabel(label);
		setExpandedCategoryIds((current) =>
			current.includes(categoryId) ? current : [...current, categoryId]
		);
		setCategoryError('');
	};

	const toggleCategoryExpanded = (categoryId: string) => {
		setExpandedCategoryIds((current) =>
			current.includes(categoryId)
				? current.filter((id) => id !== categoryId)
				: [...current, categoryId]
		);
	};

	const handleSaveRenameSubcategory = async () => {
		if (!editingSubcategory) return;
		setCategoryError('');
		setCategoryBusy(true);
		try {
			await renameSubcategory(
				editingSubcategory.categoryId,
				editingSubcategory.value,
				editingSubcategoryLabel
			);
			setEditingSubcategory(null);
			setEditingSubcategoryLabel('');
		} catch (error) {
			setCategoryError(
				error instanceof Error
					? error.message
					: 'Unable to rename subcategory right now.'
			);
		} finally {
			setCategoryBusy(false);
		}
	};

	const handleDeleteCategory = async (id: string) => {
		setCategoryError('');
		setCategoryBusy(true);
		try {
			await deleteCategory(id);
		} catch (error) {
			setCategoryError(
				error instanceof Error
					? error.message
					: 'Unable to delete category right now.'
			);
		} finally {
			setCategoryBusy(false);
		}
	};

	const handleDeleteSubcategory = async (categoryId: string, value: string) => {
		setCategoryError('');
		setCategoryBusy(true);
		try {
			await deleteSubcategory(categoryId, value);
		} catch (error) {
			setCategoryError(
				error instanceof Error
					? error.message
					: 'Unable to delete subcategory right now.'
			);
		} finally {
			setCategoryBusy(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-3xl max-h-modal overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>Manage your app preferences and data</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 sm:flex-row overflow-y-auto flex-1 min-h-0">
						<div className="w-full sm:w-56">
							<div
								role="tablist"
								aria-label="Settings sections"
								className="flex gap-1 rounded-lg border p-1 sm:flex-col"
							>
								<button
									role="tab"
									aria-selected={activeTab === 'general'}
									aria-controls="settings-tab-general"
									onClick={() => setActiveTab('general')}
									className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'general'
										? 'bg-accent text-accent-foreground'
										: 'text-muted-foreground hover:bg-muted'
										}`}
								>
									<FiSettings className="h-4 w-4" />
									General
								</button>
								<button
									role="tab"
									aria-selected={activeTab === 'data'}
									aria-controls="settings-tab-data"
									onClick={() => setActiveTab('data')}
									className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'data'
										? 'bg-accent text-accent-foreground'
										: 'text-muted-foreground hover:bg-muted'
										}`}
								>
									<FiDatabase className="h-4 w-4" />
									Data
								</button>
								<button
									role="tab"
									aria-selected={activeTab === 'categories'}
									aria-controls="settings-tab-categories"
									onClick={() => setActiveTab('categories')}
									className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'categories'
										? 'bg-accent text-accent-foreground'
										: 'text-muted-foreground hover:bg-muted'
										}`}
								>
									<FiTag className="h-4 w-4" />
									Categories
								</button>
								<button
									role="tab"
									aria-selected={activeTab === 'filters'}
									aria-controls="settings-tab-filters"
									onClick={() => setActiveTab('filters')}
									className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'filters'
										? 'bg-accent text-accent-foreground'
										: 'text-muted-foreground hover:bg-muted'
										}`}
								>
									<FiFilter className="h-4 w-4" />
									Filters
								</button>
							</div>
						</div>

						<div className="flex-1 space-y-4">
							{activeTab === 'general' && (
								<div className="space-y-4" id="settings-tab-general" role="tabpanel">
									<div>
										<h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											General
										</h3>
										<div className="space-y-4 rounded-lg border p-4 sm:p-5">
											<div className="flex items-center justify-between">
												<Label
													htmlFor="dark-mode"
													className="cursor-pointer"
												>
													Dark Mode
												</Label>
												<Switch
													id="dark-mode"
													checked={localTheme === 'dark'}
													onCheckedChange={(checked: boolean) =>
														setLocalTheme(checked ? 'dark' : 'light')
													}
												/>
											</div>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'data' && (
								<div className="space-y-4" id="settings-tab-data" role="tabpanel">
									<div>
										<h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Data
										</h3>
										<div className="space-y-4 rounded-lg border p-4 sm:p-5">
											<p className="text-sm text-muted-foreground">
												Import transactions from CSV/JSON. Duplicates are
												automatically skipped.
											</p>
											<div className="flex flex-col gap-2 sm:flex-row">
												<input
													type="file"
													accept=".csv,.json,application/json,text/csv"
													id="settings-import-input"
													className="hidden"
													onChange={async (e) => {
														const file = e.target.files?.[0];
														if (file && onImport) await onImport(file);
														e.currentTarget.value = '';
													}}
												/>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														document
															.getElementById('settings-import-input')
															?.click()
													}
													className="w-full sm:w-auto"
												>
													Import
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={onExportCSV}
													className="w-full sm:w-auto"
												>
													Export CSV
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={onExportJSON}
													className="w-full sm:w-auto"
												>
													Export JSON
												</Button>
											</div>
											<p className="text-sm text-muted-foreground">
												Delete all transactions from your account. This
												action cannot be undone.
											</p>
											<Button
												variant="outline"
												size="sm"
												onClick={handleDeleteAllClick}
												className="w-full sm:w-auto"
											>
												Delete All Transactions
											</Button>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'filters' && (
								<div className="space-y-6" id="settings-tab-filters" role="tabpanel">
									<p className="text-sm text-muted-foreground">
										Choose which filters to show in each section. Hidden filters can always be re-enabled here.
									</p>

									{/* Recurring Transactions */}
									<div>
										<h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Recurring Transactions
										</h3>
										<div className="space-y-3 rounded-lg border p-4 sm:p-5">
											{(
												[
													['frequency', 'Frequency filter'],
													['category', 'Category filter'],
													['type', 'Type filter (Income / Expense)'],
													['date', 'Expected date filter'],
													['sortBy', 'Sort by'],
												] as [keyof FilterPreferences['recurring'], string][]
											).map(([key, label]) => (
												<div key={key} className="flex items-center justify-between">
													<Label htmlFor={`rec-${key}`} className="cursor-pointer">
														{label}
													</Label>
													<Switch
														id={`rec-${key}`}
														checked={prefs.recurring[key]}
														onCheckedChange={(checked: boolean) =>
															setFilterVisible('recurring', key, checked)
														}
													/>
												</div>
											))}
										</div>
									</div>

									{/* Transaction History (table) */}
									<div>
										<h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Transaction History
										</h3>
										<div className="space-y-3 rounded-lg border p-4 sm:p-5">
											{(
												[
													['search', 'Search bar'],
													['type', 'Type filter (Income / Expense)'],
													['category', 'Category filter'],
													['month', 'Month filter'],
													['dateRange', 'Date range filter'],
												] as [keyof FilterPreferences['transactionsTable'], string][]
											).map(([key, label]) => (
												<div key={key} className="flex items-center justify-between">
													<Label htmlFor={`tt-${key}`} className="cursor-pointer">
														{label}
													</Label>
													<Switch
														id={`tt-${key}`}
														checked={prefs.transactionsTable[key]}
														onCheckedChange={(checked: boolean) =>
															setFilterVisible('transactionsTable', key, checked)
														}
													/>
												</div>
											))}
										</div>
									</div>

									{/* Transaction List */}
									<div>
										<h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Transaction List
										</h3>
										<div className="space-y-3 rounded-lg border p-4 sm:p-5">
											<div className="flex items-center justify-between">
												<Label htmlFor="tl-search" className="cursor-pointer">
													Search bar
												</Label>
												<Switch
													id="tl-search"
													checked={prefs.transactionsList.search}
													onCheckedChange={(checked: boolean) =>
														setFilterVisible('transactionsList', 'search', checked)
													}
												/>
											</div>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'categories' && (
								<div className="space-y-4" id="settings-tab-categories" role="tabpanel">
									<p className="text-sm text-muted-foreground">
										Manage the categories used by transactions, recurring transactions,
										budgets, and category filters. Changes save immediately.
									</p>

									<div className="space-y-4 rounded-lg border p-4 sm:p-5">
										<div className="flex flex-col gap-2 sm:flex-row">
											<Input
												value={newCategoryLabel}
												onChange={(e) => setNewCategoryLabel(e.target.value)}
												placeholder="Add a new category"
												className="flex-1"
											/>
											<Button
												type="button"
												onClick={handleAddCategory}
												disabled={categoryBusy || !newCategoryLabel.trim()}
											>
												<FiPlus className="mr-2 h-4 w-4" />
												Add Category
											</Button>
										</div>

										{categoryError && (
											<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
												{categoryError}
											</div>
										)}

										{categoriesLoading ? (
											<p className="text-sm text-muted-foreground">
												Loading categories...
											</p>
										) : (
											<div className="space-y-2">
												{categories.map((category) => {
													const isEditing = editingCategoryId === category.id;
													const newSubcategoryLabel =
														newSubcategoryLabels[category.id] ?? '';
													const isExpanded = expandedCategoryIds.includes(category.id);

													return (
														<div
															key={category.id}
															className="rounded-lg border p-3"
														>
															<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
																<div className="flex min-w-0 flex-1 items-start gap-2">
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		onClick={() => toggleCategoryExpanded(category.id)}
																		aria-label={
																			isExpanded
																				? `Hide ${category.label} subcategories`
																				: `Show ${category.label} subcategories`
																		}
																		aria-expanded={isExpanded}
																		className="h-8 w-8 shrink-0"
																	>
																		{isExpanded ? (
																			<FiChevronDown className="h-4 w-4" />
																		) : (
																			<FiChevronRight className="h-4 w-4" />
																		)}
																	</Button>

																	{isEditing ? (
																		<Input
																			value={editingCategoryLabel}
																			onChange={(e) =>
																				setEditingCategoryLabel(e.target.value)
																			}
																			className="flex-1"
																		/>
																	) : (
																		<button
																			type="button"
																			onClick={() => toggleCategoryExpanded(category.id)}
																			className="min-w-0 flex-1 text-left"
																		>
																			<p className="font-medium">{category.label}</p>
																			<p className="text-xs text-muted-foreground">
																				{category.value}
																				{` • ${category.subcategories.length} ${
																					category.subcategories.length === 1
																						? 'subcategory'
																						: 'subcategories'
																				}`}
																			</p>
																		</button>
																	)}
																</div>

																<div className="flex items-center gap-2">
																	{isEditing ? (
																		<>
																			<Button
																				type="button"
																				size="sm"
																				onClick={handleSaveRename}
																				disabled={
																					categoryBusy ||
																					!editingCategoryLabel.trim()
																				}
																			>
																				Save
																			</Button>
																			<Button
																				type="button"
																				size="sm"
																				variant="outline"
																				onClick={() => {
																					setEditingCategoryId(null);
																					setEditingCategoryLabel('');
																					setCategoryError('');
																				}}
																			>
																				Cancel
																			</Button>
																		</>
																	) : (
																		<>
																			<Button
																				type="button"
																				size="icon"
																				variant="ghost"
																				onClick={() =>
																					handleStartRename(category.id, category.label)
																				}
																				aria-label={`Edit ${category.label}`}
																			>
																				<FiEdit2 className="h-4 w-4" />
																			</Button>
																			<Button
																				type="button"
																				size="icon"
																				variant="ghost"
																				onClick={() => handleDeleteCategory(category.id)}
																				aria-label={`Delete ${category.label}`}
																				className="text-destructive hover:text-destructive"
																			>
																				<FiTrash2 className="h-4 w-4" />
																			</Button>
																		</>
																	)}
																</div>
															</div>

															{isExpanded && (
															<div className="mt-3 space-y-2 border-t pt-3">
																<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
																	Subcategories
																</p>
																{category.subcategories.length > 0 ? (
																	<div className="space-y-2">
																		{category.subcategories.map((subcategory) => {
																			const isEditingSubcategory =
																				editingSubcategory?.categoryId === category.id &&
																				editingSubcategory.value === subcategory.value;

																			return (
																				<div
																					key={subcategory.value}
																					className="flex flex-col gap-2 rounded-md bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between"
																				>
																					{isEditingSubcategory ? (
																						<Input
																							value={editingSubcategoryLabel}
																							onChange={(e) =>
																								setEditingSubcategoryLabel(e.target.value)
																							}
																							className="flex-1"
																						/>
																					) : (
																						<div>
																							<p className="text-sm font-medium">
																								{subcategory.label}
																							</p>
																							<p className="text-xs text-muted-foreground">
																								{subcategory.value}
																							</p>
																						</div>
																					)}
																					<div className="flex items-center gap-2">
																						{isEditingSubcategory ? (
																							<>
																								<Button
																									type="button"
																									size="sm"
																									onClick={handleSaveRenameSubcategory}
																									disabled={
																										categoryBusy ||
																										!editingSubcategoryLabel.trim()
																									}
																								>
																									Save
																								</Button>
																								<Button
																									type="button"
																									size="sm"
																									variant="outline"
																									onClick={() => {
																										setEditingSubcategory(null);
																										setEditingSubcategoryLabel('');
																										setCategoryError('');
																									}}
																								>
																									Cancel
																								</Button>
																							</>
																						) : (
																							<>
																								<Button
																									type="button"
																									size="icon"
																									variant="ghost"
																									onClick={() =>
																										handleStartRenameSubcategory(
																											category.id,
																											subcategory.value,
																											subcategory.label
																										)
																									}
																									aria-label={`Edit ${subcategory.label}`}
																								>
																									<FiEdit2 className="h-4 w-4" />
																								</Button>
																								<Button
																									type="button"
																									size="icon"
																									variant="ghost"
																									onClick={() =>
																										handleDeleteSubcategory(
																											category.id,
																											subcategory.value
																										)
																									}
																									aria-label={`Delete ${subcategory.label}`}
																									className="text-destructive hover:text-destructive"
																								>
																									<FiTrash2 className="h-4 w-4" />
																								</Button>
																							</>
																						)}
																					</div>
																				</div>
																			);
																		})}
																	</div>
																) : (
																	<p className="text-sm text-muted-foreground">
																		No subcategories yet.
																	</p>
																)}

																<div className="flex flex-col gap-2 sm:flex-row">
																	<Input
																		value={newSubcategoryLabel}
																		onChange={(e) =>
																			setNewSubcategoryLabels((current) => ({
																				...current,
																				[category.id]: e.target.value,
																			}))
																		}
																		placeholder={`Add subcategory under ${category.label}`}
																		className="flex-1"
																	/>
																	<Button
																		type="button"
																		variant="outline"
																		onClick={() => handleAddSubcategory(category.id)}
																		disabled={categoryBusy || !newSubcategoryLabel.trim()}
																	>
																		<FiPlus className="mr-2 h-4 w-4" />
																		Add
																	</Button>
																</div>
															</div>
															)}
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>
							)}

						</div>
					</div>

					<DialogFooter className="flex-col gap-2 sm:flex-row">
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
							{currentUser ? (
								<Button
									variant="outline"
									onClick={handleSignOut}
									className="w-full sm:w-auto"
								>
									Sign Out
								</Button>
							) : (
								<Button
									variant="outline"
									onClick={onClose}
									className="w-full sm:w-auto"
								>
									Close
								</Button>
							)}
							<Button
								variant="outline"
								onClick={onClose}
								className="w-full sm:w-auto"
							>
								Close
							</Button>
						</div>
						<Button onClick={handleApply} className="w-full sm:w-auto">
							Apply
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Logout</DialogTitle>
						<DialogDescription>Are you sure you want to log out?</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmLogout}>
							Logout
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Delete All Transactions</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete all transactions? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteAllConfirmOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDeleteAllTransactions}>
							Delete All
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SettingsModal;
