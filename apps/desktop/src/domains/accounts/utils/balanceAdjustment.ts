export const getBalanceAdjustment = (currentBalance: number, realBalance: number) => {
	const difference = Number((realBalance - currentBalance).toFixed(2));
	return {
		difference,
		amount: Math.abs(difference),
		type: difference >= 0 ? 'income' as const : 'expense' as const,
	};
};
