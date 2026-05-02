import React, { useState, useEffect } from 'react';
import { useBudgetsContext } from '../../context/BudgetsContext';
import { useCategoriesContext } from '../../context/CategoriesContext';
import { Budget } from '../../types';
import { Button } from '../../components/app/ui/button';
import { Input } from '../../components/app/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../../components/app/ui/select';
import { mergeCategoryOptions } from '../../utils/categories';

const getCurrentMonthRange = () => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	return {
		startDate: start.toISOString().split('T')[0],
		endDate: end.toISOString().split('T')[0],
	};
};

interface BudgetFormProps {
	onClose: () => void;
	budget?: Budget;
}

const BudgetForm: React.FC<BudgetFormProps> = ({ onClose, budget }) => {
	const { addDraftBudget, updateBudget } = useBudgetsContext();
	const { categoryOptions } = useCategoriesContext();

	const [category, setCategory] = useState('');
	const [amount, setAmount] = useState(0);
	const [plannedStartDate, setPlannedStartDate] = useState(getCurrentMonthRange().startDate);
	const [plannedEndDate, setPlannedEndDate] = useState(getCurrentMonthRange().endDate);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const availableCategories = React.useMemo(
		() => mergeCategoryOptions(categoryOptions, category ? [category] : []),
		[categoryOptions, category]
	);

	useEffect(() => {
		if (budget) {
			setCategory(budget.category);
			setAmount(budget.amount);
			setPlannedStartDate(budget.plannedStartDate);
			setPlannedEndDate(budget.plannedEndDate);
		} else {
			const defaultRange = getCurrentMonthRange();
			setCategory('');
			setAmount(0);
			setPlannedStartDate(defaultRange.startDate);
			setPlannedEndDate(defaultRange.endDate);
		}
	}, [budget]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!category) {
			setError('Please select a category.');
			return;
		}
		if (Number(amount) <= 0) {
			setError('Budget amount must be greater than zero.');
			return;
		}
		if (!plannedStartDate || !plannedEndDate) {
			setError('Please choose both a planned start and end date.');
			return;
		}
		if (plannedStartDate > plannedEndDate) {
			setError('Planned end date must be on or after the planned start date.');
			return;
		}
		setError('');
		setLoading(true);
		try {
			const data = {
				category,
				amount: Number(amount),
				period: 'monthly' as const,
				plannedStartDate,
				plannedEndDate,
			};
			if (budget?.id) {
				await updateBudget(budget.id, data);
			} else {
				await addDraftBudget(data);
			}
			onClose();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to save budget. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
				<div className="mb-8 border-b pb-6">
					<h2 className="text-3xl font-bold tracking-tight">
						{budget ? 'Edit Budget' : 'New Draft Budget'}
					</h2>
					<p className="mt-1.5 text-sm text-muted-foreground">
						{budget
							? 'Update your planned budget amount and date range'
							: 'Plan an amount and date range before publishing it'}
					</p>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-1.5">
						<label className="text-sm font-medium">Category</label>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger className="h-11">
								<SelectValue placeholder="Select a category" />
							</SelectTrigger>
							<SelectContent>
								{availableCategories.map((c) => (
									<SelectItem key={c.value} value={c.value}>
										{c.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium">Planned Amount (ZAR)</label>
						<Input
							type="number"
							step="0.01"
							min="0.01"
							value={amount}
							onChange={(e) => setAmount(Number(e.target.value))}
							placeholder="e.g. 2000"
							required
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Planned Start Date</label>
							<Input
								type="date"
								value={plannedStartDate}
								onChange={(e) => setPlannedStartDate(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Planned End Date</label>
							<Input
								type="date"
								value={plannedEndDate}
								onChange={(e) => setPlannedEndDate(e.target.value)}
								required
							/>
						</div>
					</div>

					<div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
						Draft budgets show live spend for this planned period. Publish when
						you are ready to make the period active.
					</div>

					<div className="flex gap-3 pt-2">
						<Button type="submit" className="flex-1 h-12" disabled={loading}>
							{loading
								? 'Saving...'
								: budget
									? 'Update Budget'
									: 'Create Draft'}
						</Button>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default BudgetForm;
