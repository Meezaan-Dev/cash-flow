import { fireEvent, render, screen } from '@testing-library/react';
import Currency from '@/components/marketing/Currency';
import { PrivacyModeProvider } from '@/app/privacy/PrivacyModeContext';
import PrivacyModeButton from '@/pages/dashboard/components/PrivacyModeButton';

describe('Currency privacy mode', () => {
	it('shows formatted money normally', () => {
		const { container } = render(<Currency amount={1234.56} />);

		expect(container.querySelector('span')?.textContent?.replace(/\s/g, ' ')).toBe(
			'R 1 234,56'
		);
	});

	it('hides money behind a skeleton in privacy mode', () => {
		render(
			<PrivacyModeProvider>
				<PrivacyModeButton />
				<Currency amount={1234.56} />
			</PrivacyModeProvider>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Hide data' }));

		expect(screen.getByTestId('privacy-skeleton')).toBeInTheDocument();
		expect(
			screen.queryByText((_, element) =>
				Boolean(element?.textContent?.replace(/\s/g, ' ').match(/^R 1 234,56$/))
			)
		).not.toBeInTheDocument();
	});
});
