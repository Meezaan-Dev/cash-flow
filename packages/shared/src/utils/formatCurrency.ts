export const formatCurrency = (amount: number | string) => {
	// Handle invalid inputs
	if (isNaN(Number(amount)) || !isFinite(Number(amount))) {
		return 'R0.00';
	}

	let numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

	// Handle negative zero by converting to positive zero
	if (Object.is(numAmount, -0)) {
		numAmount = 0;
	}

	return numAmount.toLocaleString('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};
