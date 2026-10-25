import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {APP_ID} from '../../config/constants';
import {PlatformError} from '../errors';
import {listApps} from './apps';
import {LUNA} from './constants';
import {lunaCall} from './luna';

vi.mock('./luna', () => ({lunaCall: vi.fn()}));

/** What the fake TV answers. */
interface FakeTv {
	/** the launch points, or the error the Homebrew Channel's shell fails with */
	launchPoints: {id: string; title: string; largeIcon?: string}[] | PlatformError | string;
	homebrewInstalled: boolean;
	/** getConfiguration's `root`, or an error */
	root: boolean | PlatformError;
	/** icon files on the TV: path → base64 */
	files: Record<string, string>;
}

let tv: FakeTv;

function answer(uri: string, params: {command?: string; appId?: string} = {}): Promise<object> {
	if (uri === LUNA.appLoadStatus) return Promise.resolve({returnValue: true, exist: tv.homebrewInstalled});
	if (uri === LUNA.homebrewConfig) {
		return tv.root instanceof PlatformError ? Promise.reject(tv.root) : Promise.resolve({root: tv.root});
	}
	if (uri !== LUNA.homebrewExec || !params.command) return Promise.reject(new Error(`unexpected call ${uri}`));

	const command = params.command;
	if (command.indexOf('listLaunchPoints') !== -1) {
		const points = tv.launchPoints;
		if (points instanceof PlatformError) return Promise.reject(points);
		const out = typeof points === 'string' ? points : JSON.stringify({returnValue: true, launchPoints: points});
		return Promise.resolve({stdoutString: out});
	}
	// the icons script: "printf '%d ' <i>; base64 '<path>' …" per file
	const lines: string[] = [];
	const icon = /printf '%d ' (\d+); base64 '([^']+)'/g;
	for (let match = icon.exec(command); match; match = icon.exec(command)) {
		lines.push(`${match[1]} ${tv.files[match[2]] || ''}`);
	}
	return Promise.resolve({stdoutString: `${lines.join('\n')}\n`});
}

beforeEach(() => {
	tv = {launchPoints: [], homebrewInstalled: true, root: true, files: {}};
	vi.mocked(lunaCall).mockImplementation(answer as typeof lunaCall);
	const data: Record<string, string> = {};
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => (key in data ? data[key] : null),
		setItem: (key: string, value: string) => {
			data[key] = value;
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

	it('reads the icons as data URIs', async () => {
		tv.launchPoints = [{id: 'com.example.a', title: 'Alpha', largeIcon: '/apps/a/icon.png'}];
		tv.files['/apps/a/icon.png'] = 'iVBORw0KGgo=';
		const {apps} = await listApps();
		expect(apps[0].iconUrl).toBe('data:image/png;base64,iVBORw0KGgo=');
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
