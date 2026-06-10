import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import {
	balanceNegative,
	balancePositive,
	currencyBase,
	currencyExpense,
	currencyIncome,
	currencyNegative,
	currencyPositive,
} from '@/styles/marketingStyles';

export type CurrencyTone =
	| 'default'
	| 'positive'
	| 'negative'
	| 'income'
	| 'expense'
	| 'balance-positive'
	| 'balance-negative';

const toneClasses: Record<CurrencyTone, string> = {
	default: '',
	positive: currencyPositive,
	negative: currencyNegative,
	income: currencyIncome,
	expense: currencyExpense,
	'balance-positive': balancePositive,
	'balance-negative': balanceNegative,
};

interface CurrencyProps {
	amount: number | string;
	tone?: CurrencyTone;
	className?: string;
	showSign?: boolean;
}

const Currency: React.FC<CurrencyProps> = ({
	amount,
	tone = 'default',
	className,
	showSign = false,
}) => {
	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	let display = formatCurrency(amount);
	if (showSign && numAmount > 0) {
		display = `+${display}`;
	}

	return (
		<span className={cn(currencyBase, toneClasses[tone], className)}>{display}</span>
	);
};

export default Currency;
