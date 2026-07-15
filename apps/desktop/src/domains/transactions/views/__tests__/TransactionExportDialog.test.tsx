import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionExportDialog from '../TransactionExportDialog';
import { Transaction } from '@/types';

const accounts = [
	{ id: 'a', name: 'Main', type: 'debit' as const, balance: 0 },
	{ id: 'b', name: 'Savings', type: 'savings' as const, balance: 0 },
];

const categories = [
	{ id: 'food', value: 'food', label: 'Food', subcategories: [] },
	{ id: 'salary', value: 'salary', label: 'Salary', subcategories: [] },
];

const transactions: Transaction[] = [
	{ id: '1', accountId: 'a', title: 'Lunch', amount: 10, type: 'expense', category: 'food', date: new Date(2026, 5, 1) },
	{ id: '2', accountId: 'b', title: 'Pay', amount: 100, type: 'income', category: 'salary', date: new Date(2026, 5, 30) },
	{ id: '3', accountId: 'a', title: 'Transfer', amount: 50, type: 'transfer', category: 'transfer', date: new Date(2026, 6, 1) },
];

describe('TransactionExportDialog', () => {
	it('filters the live count and exports the selected format', async () => {
		const user = userEvent.setup();
		const onExport = jest.fn();
		render(
			<TransactionExportDialog
				open
				onOpenChange={jest.fn()}
				accounts={accounts}
				categories={categories}
				transactions={transactions.slice(0, 2)}
				onExport={onExport}
			/>
		);

		expect(screen.getByText('2 matching transactions')).toBeInTheDocument();
		await user.click(screen.getByLabelText('Main'));
		expect(screen.getByText('1 matching transaction')).toBeInTheDocument();
		await user.selectOptions(screen.getByLabelText('Format'), 'json');
		await user.click(screen.getByRole('button', { name: 'Export JSON' }));
		expect(onExport).toHaveBeenCalledWith('json', [expect.objectContaining({ id: '1' })]);
	});

	it('exports all records when optional filters are unset', async () => {
		const user = userEvent.setup();
		const onExport = jest.fn();
		render(
			<TransactionExportDialog
				open
				onOpenChange={jest.fn()}
				accounts={accounts}
				categories={categories}
				transactions={transactions}
				onExport={onExport}
			/>
		);

		expect(screen.getByText('3 matching transactions')).toBeInTheDocument();
		expect(screen.getByText(/Leaving a filter unset includes all values/i)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Export CSV' }));

		expect(onExport).toHaveBeenCalledWith('csv', transactions);
	});

	it('narrows matches independently by type, category, and inclusive custom dates', async () => {
		const user = userEvent.setup();
		render(
			<TransactionExportDialog
				open
				onOpenChange={jest.fn()}
				accounts={accounts}
				categories={categories}
				transactions={transactions}
				onExport={jest.fn()}
			/>
		);

		await user.selectOptions(screen.getByLabelText('Transaction data'), 'expense');
		expect(screen.getByText('1 matching transaction')).toBeInTheDocument();

		await user.selectOptions(screen.getByLabelText('Transaction data'), 'overall');
		await user.click(screen.getByLabelText('Salary'));
		expect(screen.getByText('1 matching transaction')).toBeInTheDocument();

		await user.click(screen.getByLabelText('Salary'));
		await user.selectOptions(screen.getByLabelText('Date range'), 'custom');
		await user.type(screen.getByLabelText('Start date'), '2026-06-01');
		await user.type(screen.getByLabelText('End date'), '2026-06-30');
		expect(screen.getByText('2 matching transactions')).toBeInTheDocument();
	});

	it('resets filters from the reset and close actions', async () => {
		const user = userEvent.setup();
		const onOpenChange = jest.fn();
		render(
			<TransactionExportDialog
				open
				onOpenChange={onOpenChange}
				accounts={accounts}
				categories={categories}
				transactions={transactions}
				onExport={jest.fn()}
			/>
		);

		await user.click(screen.getByLabelText('Main'));
		expect(screen.getByText('2 matching transactions')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Reset filters' }));
		expect(screen.getByText('3 matching transactions')).toBeInTheDocument();

		await user.click(screen.getByLabelText('Food'));
		expect(screen.getByText('1 matching transaction')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.getByText('3 matching transactions')).toBeInTheDocument();
	});
});
