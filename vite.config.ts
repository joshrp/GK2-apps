import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static export for GitHub Pages. 404.html doubles as the SPA fallback.
			adapter: adapter({ fallback: '404.html' }),

			// GitHub Pages serves project sites from /<repo>; the deploy workflow sets BASE_PATH.
			paths: {
				base: (process.env.BASE_PATH ?? '') as '' | `/${string}`
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
