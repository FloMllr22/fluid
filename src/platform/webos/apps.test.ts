import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {APP_ID} from '../../config/constants';
import {PlatformError} from '../errors';
import {batchIcons, ICON_BATCH_BYTES, listApps} from './apps';
import {LUNA} from './constants';
import {lunaCall} from './luna';

vi.mock('./luna', () => ({lunaCall: vi.fn()}));

interface LaunchPoint {
	id: string;
	title: string;
	largeIcon?: string;
}

/** What the fake TV answers. */
interface FakeTv {
	/** the launch points, or the error the Homebrew Channel's shell fails with */
	launchPoints: LaunchPoint[] | PlatformError | string;
	homebrewInstalled: boolean;
	/** getConfiguration's `root`, or an error */
	root: boolean | PlatformError;
	/** icon files on the TV: path → size in bytes */
	files: Record<string, number>;
	sizesFail: boolean;
	iconReadsFail: boolean;
}

/** The Homebrew Channel's limit: Node 8's default maxBuffer for child_process.exec. */
const EXEC_OUTPUT_LIMIT = 200 * 1024;

let tv: FakeTv;
/** Every shell command fluid ran, in order. */
let commands: string[];
let storage: Record<string, string>;

/** The base64 the fake TV returns for a file of `size` bytes. */
const base64Of = (size: number) => 'A'.repeat(4 * Math.ceil(size / 3));
const quotedPaths = (command: string) => (command.match(/'\/[^']+'/g) || []).map((quoted) => quoted.slice(1, -1));

function shell(command: string): string | PlatformError {
	if (command.indexOf('listLaunchPoints') !== -1) {
		const points = tv.launchPoints;
		if (typeof points === 'string' || points instanceof PlatformError) return points;
		return JSON.stringify({returnValue: true, launchPoints: points});
	}
	if (command.indexOf('wc -c ') === 0) {
		if (tv.sizesFail) return new PlatformError('timeout', 'No answer');
		const present = quotedPaths(command).filter((path) => path in tv.files);
		const lines = present.map((path) => `     ${tv.files[path]} ${path}`);
		if (present.length > 1) lines.push(`     ${present.reduce((sum, path) => sum + tv.files[path], 0)} total`);
		return `${lines.join('\n')}\n`;
	}
	if (tv.iconReadsFail) return new PlatformError('rejected', 'Command failed');
	// the icons script: "printf '%d ' <i>; base64 '<path>' …" per file
	const lines = quotedPaths(command).map((path, i) => `${i} ${path in tv.files ? base64Of(tv.files[path]) : ''}`);
	return `${lines.join('\n')}\n`;
}

function answer(uri: string, params: {command?: string; appId?: string} = {}): Promise<object> {
	if (uri === LUNA.appLoadStatus) return Promise.resolve({returnValue: true, exist: tv.homebrewInstalled});
	if (uri === LUNA.homebrewConfig) {
		return tv.root instanceof PlatformError ? Promise.reject(tv.root) : Promise.resolve({root: tv.root});
	}
	if (uri !== LUNA.homebrewExec || !params.command) return Promise.reject(new Error(`unexpected call ${uri}`));
	commands.push(params.command);
	const out = shell(params.command);
	if (out instanceof PlatformError) return Promise.reject(out);
	if (out.length > EXEC_OUTPUT_LIMIT) return Promise.reject(new PlatformError('rejected', 'stdout maxBuffer exceeded'));
	return Promise.resolve({stdoutString: out});
}

/** `count` apps with an icon file of `size` bytes each. */
function appsWithIcons(count: number, size: number): LaunchPoint[] {
	const points: LaunchPoint[] = [];
	for (let i = 0; i < count; i++) {
		const path = `/apps/app${i}/icon.png`;
		tv.files[path] = size;
		points.push({id: `com.example.app${i}`, title: `App ${i}`, largeIcon: path});
	}
	return points;
}

const iconReads = () => commands.filter((command) => command.indexOf('base64') !== -1);
const sizeReads = () => commands.filter((command) => command.indexOf('wc -c') === 0);
const cachedPaths = () => Object.keys(JSON.parse(storage['fluid-icon-cache-v1'] || '{}'));

beforeEach(() => {
	tv = {launchPoints: [], homebrewInstalled: true, root: true, files: {}, sizesFail: false, iconReadsFail: false};
	commands = [];
	storage = {};
	vi.mocked(lunaCall).mockImplementation(answer as typeof lunaCall);
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => (key in storage ? storage[key] : null),
		setItem: (key: string, value: string) => {
			storage[key] = value;
		}
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('listApps', () => {
	it("lists the launcher's apps in its order, with LG's titles, leaving out fluid itself", async () => {
		tv.launchPoints = [
			{id: 'com.example.b', title: 'Bravo'},
			{id: APP_ID, title: 'fluid'},
			{id: 'com.example.a', title: 'Alpha'}
		];
		await expect(listApps()).resolves.toEqual({
			apps: [
				{id: 'com.example.b', title: 'Bravo', iconUrl: undefined},
				{id: 'com.example.a', title: 'Alpha', iconUrl: undefined}
			],
			failedIcons: 0
		});
	});

	it('says so when the Homebrew Channel is not installed', async () => {
		tv.launchPoints = new PlatformError('rejected', 'Service does not exist');
		tv.homebrewInstalled = false;
		await expect(listApps()).rejects.toMatchObject({code: 'no-homebrew'});
	});

	it('says so when the Homebrew Channel has no root', async () => {
		tv.launchPoints = new PlatformError('rejected', 'Command failed');
		tv.root = false;
		await expect(listApps()).rejects.toMatchObject({code: 'no-root'});
	});

	it('passes the error on when the Homebrew Channel is there and has root', async () => {
		tv.launchPoints = new PlatformError('timeout', 'No answer');
		await expect(listApps()).rejects.toMatchObject({code: 'timeout'});
	});

	it('passes the error on when the Homebrew Channel cannot tell whether it has root', async () => {
		tv.launchPoints = new PlatformError('timeout', 'No answer');
		tv.root = new PlatformError('rejected', 'Unknown method');
		await expect(listApps()).rejects.toMatchObject({code: 'timeout'});
	});

	it('rejects an unreadable list', async () => {
		tv.launchPoints = 'luna-send: not found';
		await expect(listApps()).rejects.toMatchObject({code: 'invalid-reply'});
	});

	it('rejects an empty list', async () => {
		tv.launchPoints = [{id: APP_ID, title: 'fluid'}];
		await expect(listApps()).rejects.toMatchObject({code: 'invalid-reply'});
	});
});

describe('app icons', () => {
	it('are read as data URIs', async () => {
		tv.launchPoints = appsWithIcons(1, 9);
		const {apps, failedIcons} = await listApps();
		expect(apps[0].iconUrl).toBe(`data:image/png;base64,${base64Of(9)}`);
		expect(failedIcons).toBe(0);
	});

	it('are read in batches below the output limit of the Homebrew Channel', async () => {
		// 40 icons of 12 KB: 640 KB of base64, far more than one call may return
		tv.launchPoints = appsWithIcons(40, 12 * 1024);
		const {apps, failedIcons} = await listApps();
		expect(failedIcons).toBe(0);
		for (const app of apps) expect(app.iconUrl).toMatch(/^data:image\/png;base64,A+$/);
		expect(iconReads().length).toBeGreaterThanOrEqual(5);
		for (const command of iconReads()) {
			const bytes = quotedPaths(command).reduce((sum, path) => sum + base64Of(tv.files[path]).length, 0);
			expect(bytes).toBeLessThanOrEqual(ICON_BATCH_BYTES);
		}
	});

	it('come from the cache the next time', async () => {
		tv.launchPoints = appsWithIcons(3, 900);
		await listApps();
		commands = [];
		const {apps} = await listApps();
		expect(apps[2].iconUrl).toBe(`data:image/png;base64,${base64Of(900)}`);
		expect(commands).toHaveLength(1); // the launch points only
	});

	it('that cannot be read are reported, and read again next time', async () => {
		tv.launchPoints = appsWithIcons(3, 900);
		tv.iconReadsFail = true;
		const first = await listApps();
		expect(first.failedIcons).toBe(3);
		expect(first.apps[0].iconUrl).toBeUndefined();

		tv.iconReadsFail = false;
		const second = await listApps();
		expect(second.failedIcons).toBe(0);
		expect(second.apps[0].iconUrl).toBeDefined();
	});

	it('are all reported when their sizes cannot be read', async () => {
		tv.launchPoints = appsWithIcons(4, 900);
		tv.sizesFail = true;
		await expect(listApps()).resolves.toMatchObject({failedIcons: 4});
		expect(iconReads()).toEqual([]);
	});

	it('are not asked for again when the file does not exist', async () => {
		tv.launchPoints = [{id: 'com.example.a', title: 'Alpha', largeIcon: '/apps/a/gone.png'}];
		await expect(listApps()).resolves.toMatchObject({failedIcons: 0});
		commands = [];
		await listApps();
		expect(sizeReads()).toEqual([]);
	});

	it('too large for any batch are left out, without counting as failed', async () => {
		tv.launchPoints = appsWithIcons(1, 160 * 1024);
		const {apps, failedIcons} = await listApps();
		expect(apps[0].iconUrl).toBeUndefined();
		expect(failedIcons).toBe(0);
		expect(iconReads()).toEqual([]);
	});

	it('of removed apps are dropped from the cache', async () => {
		const points = appsWithIcons(2, 900);
		tv.launchPoints = points;
		await listApps();
		expect(cachedPaths()).toEqual(['/apps/app0/icon.png', '/apps/app1/icon.png']);

		tv.launchPoints = points.slice(0, 1);
		await listApps();
		expect(cachedPaths()).toEqual(['/apps/app0/icon.png']);
	});
});

describe('batchIcons', () => {
	// a 30-byte file is 40 bytes of base64 plus 8 for its line: 48 bytes of output
	const icon = (name: string, size = 30) => ({name, size});

	it('fills each batch up to the budget, in order', () => {
		const {batches, tooLarge} = batchIcons([icon('a'), icon('b'), icon('c')], 100);
		expect(batches.map((batch) => batch.map((i) => i.name))).toEqual([['a', 'b'], ['c']]);
		expect(tooLarge).toEqual([]);
	});

	it('leaves out an icon larger than the budget', () => {
		const {batches, tooLarge} = batchIcons([icon('a'), icon('huge', 300), icon('b')], 100);
		expect(batches.map((batch) => batch.map((i) => i.name))).toEqual([['a', 'b']]);
		expect(tooLarge.map((i) => i.name)).toEqual(['huge']);
	});

	it('makes no batch from nothing', () => {
		expect(batchIcons([], 100)).toEqual({batches: [], tooLarge: []});
	});
});
