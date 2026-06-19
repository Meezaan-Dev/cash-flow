module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/firestore.rules.test.ts'],
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', target: 'es2020', esModuleInterop: true } }],
	},
};
