// Fails the build if dist/ contains something Chromium 53 (webOS 4.x) cannot run.
//
//  - index.html must load the bundle as a classic script: module scripts are refused
//    when the TV loads the app from file://.
//  - Every script must parse as ES2016, the newest edition Chromium 53 fully supports.
//    Newer syntax (async/await, object spread, `catch {}`, `?.`, trailing commas in
//    parameter lists …) is a SyntaxError on the TV, so esbuild must have lowered it.
//  - Stylesheets must not use CSS features Chromium 53 lacks and that have no fallback
//    (FORBIDDEN_CSS below).
//
//   node scripts/check-bundle.mjs [dist-dir]
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'acorn';

const ES_VERSION = 2016;

/** [pattern, what it is] — matched against minified CSS. */
const FORBIDDEN_CSS = [
	[/display:\s*(inline-)?grid/, 'CSS Grid (Chromium 57)'],
	[/(^|[{;\s])(grid-)?(row-|column-)?gap:/, '`gap` (flexbox gap: Chromium 84)'],
	[/(^|[{;\s])inset:/, '`inset` (Chromium 87)'],
	[/(^|[{;\s])aspect-ratio:/, '`aspect-ratio` (Chromium 88)'],
	[/backdrop-filter:/, '`backdrop-filter` (Chromium 76)'],
	[/:focus-visible/, '`:focus-visible` (Chromium 86)']
];

const dist = process.argv[2] || 'dist';
const problems = [];

const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (/<script[^>]*type="module"/.test(html))
	problems.push('index.html: loads a module script; it must be a classic script');

const assetsDir = join(dist, 'assets');
const assets = readdirSync(assetsDir);
const scripts = assets.filter((f) => f.endsWith('.js'));
const styles = assets.filter((f) => f.endsWith('.css'));
if (!scripts.length) problems.push(`${assetsDir}: no script found`);

for (const file of scripts) {
	const code = readFileSync(join(assetsDir, file), 'utf8');
	try {
		parse(code, {ecmaVersion: ES_VERSION, sourceType: 'script'});
	} catch (error) {
		const at = typeof error.pos === 'number' ? error.pos : 0;
		const excerpt = code.slice(Math.max(0, at - 40), at + 40).replace(/\s+/g, ' ');
		problems.push(`${file}: not valid ES${ES_VERSION} (${error.message})\n    near: …${excerpt}…`);
	}
}

for (const file of styles) {
	const css = readFileSync(join(assetsDir, file), 'utf8');
	for (const [pattern, what] of FORBIDDEN_CSS) {
		const match = pattern.exec(css);
		if (!match) continue;
		const excerpt = css.slice(Math.max(0, match.index - 40), match.index + 40);
		problems.push(`${file}: uses ${what}\n    near: …${excerpt}…`);
	}
}

if (problems.length) {
	console.error(`Bundle check failed: Chromium 53 (webOS 4) cannot run this build.\n`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}
console.log(`Bundle check passed: ${scripts.concat(styles).join(', ')} run on Chromium 53.`);
