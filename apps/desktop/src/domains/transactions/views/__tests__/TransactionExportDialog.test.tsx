import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionExportDialog from '../TransactionExportDialog';

describe('TransactionExportDialog', () => {
	it('filters the live count and exports the selected format', async () => {
		const user = userEvent.setup();
		const onExport = jest.fn();
		render(
			<TransactionExportDialog
				open
				onOpenChange={jest.fn()}
				accounts={[
					{ id: 'a', name: 'Main', type: 'debit', balance: 0 },
					{ id: 'b', name: 'Savings', type: 'savings', balance: 0 },
				]}
				categories={[
					{ id: 'food', value: 'food', label: 'Food', subcategories: [] },
					{ id: 'salary', value: 'salary', label: 'Salary', subcategories: [] },
				]}
				transactions={[
					{ id: '1', accountId: 'a', title: 'Lunch', amount: 10, type: 'expense', category: 'food' },
					{ id: '2', accountId: 'b', title: 'Pay', amount: 100, type: 'income', category: 'salary' },
				]}
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
});
