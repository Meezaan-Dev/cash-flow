/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/apps/desktop/src/setupTests.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/apps/desktop/src/$1',
		'^@mobisite/(.*)$': '<rootDir>/apps/mobisite/src/$1',
		'^@cash-flow/shared$': '<rootDir>/packages/shared/src/index.ts',
		'^@cash-flow/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
		'^@cash-flow/ui$': '<rootDir>/packages/ui/src/index.ts',
		'^@cash-flow/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
			'<rootDir>/apps/desktop/src/__mocks__/fileMock.js',
		'^import\\.meta\\.env$': '<rootDir>/apps/desktop/src/__mocks__/envMock.js',
	},
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: 'apps/desktop/tsconfig.test.json',
				useESM: true,
			},
		],
	},
	testMatch: [
		'<rootDir>/apps/**/src/**/__tests__/**/*.{ts,tsx}',
		'<rootDir>/apps/**/src/**/*.{test,spec}.{ts,tsx}',
		'<rootDir>/packages/**/src/**/__tests__/**/*.{ts,tsx}',
		'<rootDir>/packages/**/src/**/*.{test,spec}.{ts,tsx}',
	],
	collectCoverageFrom: [
		'apps/**/src/**/*.{ts,tsx}',
		'packages/**/src/**/*.{ts,tsx}',
		'!**/*.d.ts',
		'!**/main.tsx',
		'!**/vite-env.d.ts',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
