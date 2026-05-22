import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
	root: __dirname,
	envDir: path.resolve(__dirname, '../..'),
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@mobisite': path.resolve(__dirname, '../mobisite/src'),
			'@cash-flow/shared': path.resolve(__dirname, '../../packages/shared/src'),
			'@cash-flow/ui': path.resolve(__dirname, '../../packages/ui/src'),
		},
	},
	build: {
		outDir: '../../dist',
		emptyOutDir: true,
	},
});
