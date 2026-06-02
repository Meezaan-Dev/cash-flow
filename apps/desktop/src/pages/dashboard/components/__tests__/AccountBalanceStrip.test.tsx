import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountBalanceStrip from '@/pages/dashboard/components/AccountBalanceStrip';
import { Account } from '@/types';

describe('AccountBalanceStrip', () => {
	const accounts: Account[] = [
		{
			id: 'cheque',
			name: 'FNB Cheque',
			bank: 'FNB',
			type: 'debit',
			balance: 2410,
			color: '#3b82f6',
		},
		{
			id: 'savings',
			name: 'Emergency Savings',
			type: 'savings',
			balance: 1872,
			color: '#22c55e',
		},
		{
			id: 'cash',
			name: 'Cash',
			type: 'cash',
			balance: 700,
			color: '#71717a',
		},
		{
			id: 'credit',
			name: 'Credit Card',
			type: 'credit',
			balance: -350,
			color: '#ef4444',
		},
		{
			id: 'travel',
			name: 'Travel Wallet',
			type: 'debit',
			balance: 120,
			color: '#8b5cf6',
		},
	];

	it('renders compact account cards, total context, and overflow affordance', () => {
		render(<AccountBalanceStrip accounts={accounts} onOpenAccounts={jest.fn()} />);

		expect(
			screen.getByRole('region', { name: /account balances/i })
		).toBeInTheDocument();
		expect(screen.getByText('Accounts')).toBeInTheDocument();
		expect(screen.getByText('5 linked accounts')).toBeInTheDocument();
		expect(screen.getByText(/R.*4.*752/)).toBeInTheDocument();
		expect(screen.getByText('FNB Cheque')).toBeInTheDocument();
		expect(screen.getByText('FNB - Debit')).toBeInTheDocument();
		expect(screen.getByText('2 more accounts')).toBeInTheDocument();
		expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
	});

	it('opens the accounts view from the strip actions', async () => {
		const user = userEvent.setup();
		const onOpenAccounts = jest.fn();

		render(<AccountBalanceStrip accounts={accounts} onOpenAccounts={onOpenAccounts} />);

		await user.click(screen.getByRole('button', { name: /view all/i }));

		expect(onOpenAccounts).toHaveBeenCalledTimes(1);
	});

	it('does not mark a positive credit balance as owing', () => {
		render(
			<AccountBalanceStrip
				accounts={[
					{
						id: 'credit-positive',
						name: 'Credit Card',
						type: 'credit',
						balance: 3500,
					},
				]}
				onOpenAccounts={jest.fn()}
			/>
		);

		expect(screen.getByText('Available')).toBeInTheDocument();
		expect(screen.queryByText('Owing')).not.toBeInTheDocument();
		expect(screen.getByText('1 linked account')).toBeInTheDocument();
		expect(screen.getAllByText(/R.*3.*500/).length).toBeGreaterThan(0);
	});

	it('renders an empty state that opens account creation', async () => {
		const user = userEvent.setup();
		const onOpenAccounts = jest.fn();

		render(<AccountBalanceStrip accounts={[]} onOpenAccounts={onOpenAccounts} />);

		await user.click(
			screen.getByRole('button', { name: /create your first account/i })
		);

		expect(onOpenAccounts).toHaveBeenCalledTimes(1);
	});
});
