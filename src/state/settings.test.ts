import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
	type Background,
	defaultSettings,
	LEGACY_KEY,
	loadSettings,
	MIGRATIONS,
	SETTINGS_KEY,
	SETTINGS_VERSION,
	saveSettings
} from './settings';

let data: Record<string, string>;

/** Stand-in for the TV's localStorage; `failing` makes every access throw. */
function useStorage(initial: Record<string, string> = {}, failing = false) {
	data = {...initial};
	const check = () => {
		if (failing) throw new Error('QuotaExceededError');
	};
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => {
			check();
			return key in data ? data[key] : null;
		},
		setItem: (key: string, value: string) => {
			check();
			data[key] = value;
		},
		removeItem: (key: string) => {
			check();
			delete data[key];
		}
	});
}

const stored = (version: number, settings: unknown) => ({[SETTINGS_KEY]: JSON.stringify({version, settings})});

/** the background fluid had before there was a choice */
const dark: Background = {kind: 'color', color: 'dark'};

beforeEach(() => {
	vi.unstubAllGlobals();
	useStorage();
});

describe('loadSettings', () => {
	it('gives the defaults on a first start, with nothing to report or save', () => {
		expect(loadSettings()).toEqual({settings: defaultSettings(), unreadable: false, migrated: false});
	});

	it('reads back what was saved', () => {
		const settings = {
			appIds: ['b', 'a'],
			sourceIds: ['com.webos.app.hdmi2'],
			favoriteIds: ['a'],
			background: {kind: 'photo', id: 'lake'} as Background
		};
		expect(saveSettings(settings)).toBe(true);
		expect(loadSettings()).toEqual({settings, unreadable: false, migrated: false});
	});

	it('replaces each field of the wrong type with its default', () => {
		useStorage(stored(SETTINGS_VERSION, {appIds: 'x', sourceIds: ['ok', 5], favoriteIds: null, background: 'dark'}));
		expect(loadSettings().settings).toEqual(defaultSettings());
		useStorage(stored(SETTINGS_VERSION, {appIds: ['a'], sourceIds: {}}));
		expect(loadSettings().settings).toEqual({appIds: ['a'], sourceIds: null, favoriteIds: [], background: dark});
	});

	it('reports settings that are not readable, and uses the defaults', () => {
		for (const raw of ['{broken', '"text"', '{"version":1}', '{"settings":{}}']) {
			useStorage({[SETTINGS_KEY]: raw});
			expect(loadSettings(), raw).toEqual({settings: defaultSettings(), unreadable: true, migrated: false});
		}
	});

	it('reports storage that cannot be read at all', () => {
		useStorage({}, true);
		expect(loadSettings()).toMatchObject({settings: defaultSettings(), unreadable: true});
	});

	it('reads what it knows from settings of a newer fluid', () => {
		useStorage(
			stored(SETTINGS_VERSION + 1, {
				appIds: ['a'],
				sourceIds: null,
				favoriteIds: ['a'],
				background: {kind: 'slideshow'},
				futureOption: true
			})
		);
		expect(loadSettings()).toEqual({
			settings: {appIds: ['a'], sourceIds: null, favoriteIds: ['a'], background: {kind: 'slideshow'}},
			unreadable: false,
			migrated: false
		});
	});

	it('hands out fresh objects and arrays', () => {
		useStorage(stored(SETTINGS_VERSION, {appIds: ['a'], sourceIds: null, favoriteIds: []}));
		const first = loadSettings().settings;
		first.appIds?.push('changed');
		expect(loadSettings().settings.appIds).toEqual(['a']);
		expect(defaultSettings()).not.toBe(defaultSettings());
	});
});

describe('migration from fluid 0.1', () => {
	const legacy = {[LEGACY_KEY]: '{"appIds":["b","a"],"sourceIds":null,"useHomebrew":true}'};

	it('keeps the chosen apps and sources, and drops the Homebrew option', () => {
		useStorage(legacy);
		expect(loadSettings()).toEqual({
			settings: {appIds: ['b', 'a'], sourceIds: null, favoriteIds: [], background: dark},
			unreadable: false,
			migrated: true
		});
	});

	it('moves the settings to the new key once saved', () => {
		useStorage(legacy);
		saveSettings(loadSettings().settings);
		expect(data[LEGACY_KEY]).toBeUndefined();
		expect(JSON.parse(data[SETTINGS_KEY])).toEqual({
			version: SETTINGS_VERSION,
			settings: {appIds: ['b', 'a'], sourceIds: null, favoriteIds: [], background: dark}
		});
		expect(loadSettings().migrated).toBe(false);
	});

	it('reports old settings that are not readable', () => {
		useStorage({[LEGACY_KEY]: '{broken'});
		expect(loadSettings()).toMatchObject({unreadable: true, migrated: false});
	});
});

describe('migration from version 1', () => {
	it('keeps the choices and starts without favourites', () => {
		useStorage(stored(1, {appIds: ['a'], sourceIds: null}));
		expect(loadSettings()).toEqual({
			settings: {appIds: ['a'], sourceIds: null, favoriteIds: [], background: dark},
			unreadable: false,
			migrated: true
		});
	});
});

describe('migration from version 2', () => {
	it('keeps the choices and favourites, with the background fluid had', () => {
		useStorage(stored(2, {appIds: ['a', 'b'], sourceIds: null, favoriteIds: ['b']}));
		expect(loadSettings()).toEqual({
			settings: {appIds: ['a', 'b'], sourceIds: null, favoriteIds: ['b'], background: dark},
			unreadable: false,
			migrated: true
		});
	});
});

describe('background', () => {
	const read = (background: unknown) => {
		useStorage(stored(SETTINGS_VERSION, {appIds: null, sourceIds: null, favoriteIds: [], background}));
		return loadSettings().settings.background;
	};

	it('reads back each kind of background', () => {
		for (const background of [
			{kind: 'color', color: 'black'},
			{kind: 'color', color: 'blue'},
			{kind: 'photo', id: 'lake'},
			{kind: 'slideshow'}
		])
			expect(read(background)).toEqual(background);
	});

	it('falls back to the default for anything else', () => {
		for (const background of [
			undefined,
			'blue',
			[],
			{kind: 'color', color: 'pink'},
			{kind: 'photo'},
			{kind: 'photo', id: ''},
			{kind: 'video', id: 'x'}
		])
			expect(read(background), JSON.stringify(background)).toEqual(dark);
	});

	it('keeps only the fields of its kind', () => {
		expect(read({kind: 'slideshow', color: 'blue', id: 'x'})).toEqual({kind: 'slideshow'});
	});
});

describe('saveSettings', () => {
	it('says when the storage refuses the settings', () => {
		useStorage({}, true);
		expect(saveSettings(defaultSettings())).toBe(false);
	});
});

describe('MIGRATIONS', () => {
	it('has one step for every version', () => {
		for (let version = 1; version <= SETTINGS_VERSION; version++) expect(typeof MIGRATIONS[version]).toBe('function');
		expect(Object.keys(MIGRATIONS)).toHaveLength(SETTINGS_VERSION);
	});
});
