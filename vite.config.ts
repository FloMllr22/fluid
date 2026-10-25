import preact from '@preact/preset-vite';
import {defineConfig, type Plugin} from 'vite';

// The oldest supported engine is Chromium 53 (webOS 4.x).
// Two things matter there:
//  1. Module scripts (`<script type="module">`) are refused when loaded from file://
//     because the sandbox serves them with no MIME type, so the bundle must be a
//     classic script.
//  2. Anything newer than ES2016 syntax (async/await, object spread, `catch {}`, `?.` …)
//     is a SyntaxError, so everything, dependencies included, is compiled down to
//     chrome53. scripts/check-bundle.mjs fails the build if something slips through.
const BROWSER_TARGET = 'chrome53';

/** Rewrites Vite's module entry tag into a classic deferred script tag. */
function classicScriptTag(): Plugin {
	return {
		name: 'classic-script-tag',
		enforce: 'post',
		transformIndexHtml(html) {
			return html
				.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
				.replace(/<link rel="stylesheet" crossorigin href="/g, '<link rel="stylesheet" href="');
		}
	};
}

export default defineConfig({
	base: './', // the app is loaded from a local file path on the TV
	plugins: [preact(), classicScriptTag()],
	build: {
		target: BROWSER_TARGET,
		outDir: 'dist',
		modulePreload: false,
		cssTarget: BROWSER_TARGET,
		// One stylesheet file instead of CSS injected by the script, so styles apply before
		// the script runs and the bundle check can read the CSS directly.
		cssCodeSplit: false,
		rollupOptions: {
			output: {
				format: 'iife',
				inlineDynamicImports: true,
				entryFileNames: 'assets/app.js',
				assetFileNames: 'assets/[name][extname]'
			}
		}
	}
});
