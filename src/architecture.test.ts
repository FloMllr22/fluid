// Enforces the layering: only src/platform/ talks to the TV, everything else goes
// through the `platform` object from src/platform/index.ts, and the TV and browser
// implementations stay independent of each other.

import {describe, expect, it} from 'vitest';

/** Every source file except tests, as text. */
const sources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
	query: '?raw',
	import: 'default',
	eager: true
});
const files = Object.keys(sources).map((path): [string, string] => [path, sources[path]]);
const inside = (dir: string) => files.filter(([path]) => path.startsWith(dir));
const outside = (dir: string) => files.filter(([path]) => !path.startsWith(dir));
const offenders = (list: [string, string][], pattern: RegExp) =>
	list.filter(([, text]) => pattern.test(text)).map(([path]) => path);

/** Things only a webOS TV has: the service bridge, Luna URIs, system objects and events. */
const TV_ACCESS = /PalmServiceBridge|luna:\/\/|webOSSystem|PalmSystem|webOSRelaunch/;

describe('architecture', () => {
	it('sees the source files', () => {
		expect(outside('./platform/').length).toBeGreaterThan(10);
		expect(inside('./platform/webos/').length).toBeGreaterThan(3);
	});

	it('keeps TV access inside src/platform/', () => {
		expect(offenders(outside('./platform/'), TV_ACCESS)).toEqual([]);
	});

	it('reaches the platform only through its index', () => {
		expect(offenders(outside('./platform/'), /from '[./]*platform\/(webos|mock)/)).toEqual([]);
	});

	it('keeps the TV and the browser mock apart', () => {
		expect(offenders(inside('./platform/mock/'), /from '[./]*webos/)).toEqual([]);
		expect(offenders(inside('./platform/webos/'), /from '[./]*mock/)).toEqual([]);
	});
});
