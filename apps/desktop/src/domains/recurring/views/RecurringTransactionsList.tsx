import React, { useState } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiDollarSign } from 'react-icons/fi';
import { useTransactionsContext } from '@/domains/transactions/context/TransactionsContext';
import { useCategoriesContext } from '@/domains/categories/context/CategoriesContext';
import { RecurringTransaction } from '@/domains/recurring/models/RecurringTransactionModel';
import { Button } from '@/components/app/ui/button';
import RecurringTransactionForm from './RecurringTransactionForm';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/app/ui/dialog';
import { formatCurrency } from '@/utils/formatCurrency';

const RecurringTransactionsList: React.FC = () => {
	const { recurringTransactions, deleteRecurringTransaction, recurringTransactionsLoading } =
		useTransactionsContext();
	const { getCategoryPathLabel } = useCategoriesContext();
	const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | undefined>(undefined);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

	const handleEdit = (transaction: RecurringTransaction) => {
		setEditingTransaction(transaction);
		setIsFormOpen(true);
	};

	const handleDelete = (id: string) => {
		setTransactionToDelete(id);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (transactionToDelete) {
			try {
				await deleteRecurringTransaction(transactionToDelete);
				setDeleteDialogOpen(false);
				setTransactionToDelete(null);
			} catch (error) {
				console.error('Error deleting recurring transaction:', error);
			}
		}
	};

	const handleAddNew = () => {
		setEditingTransaction(undefined);
		setIsFormOpen(true);
	};

	const handleCloseForm = () => {
		setIsFormOpen(false);
		setEditingTransaction(undefined);
	};

	const getFrequencyLabel = (frequency?: string) => {
		switch (frequency) {
			case 'daily':
				return 'Daily';
			case 'weekly':
				return 'Weekly';
			case 'monthly':
				return 'Monthly';
			case 'yearly':
				return 'Yearly';
			default:
				return 'Monthly';
		}
	};

	if (recurringTransactionsLoading) {
		return (
			<div className="flex items-center justify-center py-8" aria-live="polite">
				<div className="text-sm text-muted-foreground">Loading recurring transactions...</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 max-h-modal-list overflow-y-auto">
			<div className="sticky top-0 z-10 bg-card pb-2">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<h3 className="text-lg font-semibold">Recurring Transactions</h3>
					<Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto">
						<FiPlus className="mr-2 h-4 w-4" />
						Add New
					</Button>
				</div>
			</div>

			<Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
				<DialogContent className="sm:max-w-lg">
					<RecurringTransactionForm transaction={editingTransaction} onClose={handleCloseForm} />
				</DialogContent>
			</Dialog>

			{recurringTransactions.length === 0 ? (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<FiDollarSign className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						No recurring transactions yet. Add one to get started.
					</p>
				</div>
			) : (
				<div role="list" className="space-y-2">
					{recurringTransactions.map((transaction) => (
						<div
							key={transaction.id}
							role="listitem"
							className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<h4 className="font-medium">{transaction.title}</h4>
									<span className="text-xs text-muted-foreground">
										({getFrequencyLabel(transaction.frequency)})
									</span>
								</div>
								<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
									<span>{formatCurrency(transaction.amount)}</span>
									<span className="hidden sm:inline">•</span>
									<span>
										{getCategoryPathLabel(
											transaction.category,
											transaction.subcategory
										)}
									</span>
									{transaction.description && (
										<>
											<span className="hidden sm:inline">•</span>
											<span className="truncate">{transaction.description}</span>
										</>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2 sm:justify-end">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleEdit(transaction)}
									className="h-9 w-9"
									aria-label="Edit recurring transaction"
								>
									<FiEdit className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDelete(transaction.id!)}
									className="h-9 w-9 text-destructive hover:text-destructive"
									aria-label="Delete recurring transaction"
								>
									<FiTrash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Deletion</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this recurring transaction? This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default RecurringTransactionsList;
