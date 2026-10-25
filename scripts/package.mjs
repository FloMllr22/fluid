// Packages dist/ into build/<app-id>_<version>_all.ipk with the webOS CLI (ares-package).
//
// ares-package's script is run with this Node directly, so no shell is involved and it
// works the same on Windows, Linux and macOS. `--no-minify` because ares' legacy
// minifier cannot parse modern bundler output.
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {ipkName, ROOT, readAppInfo} from './lib/tv.mjs';

const DIST = join(ROOT, 'dist');
const BUILD = join(ROOT, 'build');
const ARES_PACKAGE = join(ROOT, 'node_modules', '@webos-tools', 'cli', 'bin', 'ares-package.js');

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!existsSync(join(DIST, 'index.html'))) fail('dist/ is missing. Run `npm run build` first.');
if (!existsSync(ARES_PACKAGE)) fail('The webOS CLI (@webos-tools/cli) is missing. Run `npm install` first.');

// Ship this project's own licence next to the third-party ones (public/licenses/).
mkdirSync(join(DIST, 'licenses'), {recursive: true});
copyFileSync(join(ROOT, 'LICENSE'), join(DIST, 'licenses', 'LICENSE.txt'));

// ares-package refuses to overwrite an existing package.
mkdirSync(BUILD, {recursive: true});
for (const file of readdirSync(BUILD)) {
	if (file.endsWith('.ipk')) rmSync(join(BUILD, file));
}

const result = spawnSync(process.execPath, [ARES_PACKAGE, DIST, '--no-minify', '-o', BUILD], {stdio: 'inherit'});
if (result.error) fail(`Could not run ares-package: ${result.error.message}`);
if (result.status !== 0) fail(`ares-package failed (exit code ${result.status}).`);

const expected = ipkName(readAppInfo());
if (!existsSync(join(BUILD, expected))) fail(`ares-package finished, but build/${expected} is missing.`);
console.log(`Packaged build/${expected}`);
