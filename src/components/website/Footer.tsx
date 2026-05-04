import React from 'react';

const Footer: React.FC = () => {
	return (
		<footer className="relative border-t border-gray-800 bg-gray-950 px-4 sm:px-6 lg:px-8">
			<div className="py-6">
				<div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 text-sm text-gray-500 sm:flex-row">
					<p className="text-center">
						© 2026 CashFlow by Meezaan Davids. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
