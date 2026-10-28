import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Place} from '../platform';
import {
	ACCENTS,
	type Appearance,
	type Background,
	defaultAppearance,
	defaultSettings,
	GLOW_LEVELS,
	ICON_SIZES,
	LANGUAGE_CHOICES,
	LEGACY_KEY,
	loadSettings,
	MIGRATIONS,
	SETTINGS_KEY,
	SETTINGS_VERSION,
	saveSettings,
	THEMES,
	type WeatherSettings
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

/** the weather until the user turns it on */
const off: WeatherSettings = {enabled: false, place: null};

/** how fluid looked before there was a choice */
const plain: Appearance = {theme: 'dark', accent: 'ice', glow: 0, iconSize: 100, reduceMotion: false};

const berlin: Place = {name: 'Berlin', region: 'Land Berlin', country: 'Germany', latitude: 52.52, longitude: 13.41};

beforeEach(() => {
	vi.unstubAllGlobals();
	useStorage();
});

describe('loadSettings', () => {
	it('gives the defaults on a first start, with nothing to report or save', () => {
		expect(loadSettings()).toEqual({settings: defaultSettings(), unreadable: false, migrated: false, firstStart: true});
	});

	it('reads back what was saved', () => {
		const settings = {
			appIds: ['b', 'a'],
			knownAppIds: ['a', 'b', 'c'],
			sourceIds: ['com.webos.app.hdmi2'],
			favoriteIds: ['a'],
			background: {kind: 'photo', id: 'lake'} as Background,
			weather: {enabled: true, place: berlin},
			language: 'de' as const,
			appearance: {theme: 'light', accent: 'app', glow: 30, iconSize: 115, reduceMotion: true} as Appearance
		};
		expect(saveSettings(settings)).toBe(true);
		expect(loadSettings()).toEqual({settings, unreadable: false, migrated: false, firstStart: false});
	});

	it('replaces each field of the wrong type with its default', () => {
		useStorage(
			stored(SETTINGS_VERSION, {
				appIds: 'x',
				knownAppIds: ['a', 1],
				sourceIds: ['ok', 5],
				favoriteIds: null,
				background: 'dark'
			})
		);
		expect(loadSettings().settings).toEqual(defaultSettings());
		useStorage(stored(SETTINGS_VERSION, {appIds: ['a'], knownAppIds: {}, sourceIds: {}}));
		expect(loadSettings().settings).toEqual({
			appIds: ['a'],
			knownAppIds: null,
			sourceIds: null,
			favoriteIds: [],
			background: dark,
			weather: off,
			language: 'tv',
			appearance: plain
		});
	});

	it('reports settings that are not readable, and uses the defaults', () => {
		for (const raw of ['{broken', '"text"', '{"version":1}', '{"settings":{}}']) {
			useStorage({[SETTINGS_KEY]: raw});
			expect(loadSettings(), raw).toEqual({
				settings: defaultSettings(),
				unreadable: true,
				migrated: false,
				firstStart: false
			});
		}
	});

	it('reports storage that cannot be read at all', () => {
		useStorage({}, true);
		expect(loadSettings()).toMatchObject({settings: defaultSettings(), unreadable: true, firstStart: false});
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
			settings: {
				appIds: ['a'],
				knownAppIds: null,
				sourceIds: null,
				favoriteIds: ['a'],
				background: {kind: 'slideshow'},
				weather: off,
				language: 'tv',
				appearance: plain
			},
			unreadable: false,
			migrated: false,
			firstStart: false
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
			settings: {
				appIds: ['b', 'a'],
				knownAppIds: null,
				sourceIds: null,
				favoriteIds: [],
				background: dark,
				weather: off,
				language: 'tv',
				appearance: plain
			},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});

	it('moves the settings to the new key once saved', () => {
		useStorage(legacy);
		saveSettings(loadSettings().settings);
		expect(data[LEGACY_KEY]).toBeUndefined();
		expect(JSON.parse(data[SETTINGS_KEY])).toEqual({
			version: SETTINGS_VERSION,
			settings: {
				appIds: ['b', 'a'],
				knownAppIds: null,
				sourceIds: null,
				favoriteIds: [],
				background: dark,
				weather: off,
				language: 'tv',
				appearance: plain
			}
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
			settings: {
				appIds: ['a'],
				knownAppIds: null,
				sourceIds: null,
				favoriteIds: [],
				background: dark,
				weather: off,
				language: 'tv',
				appearance: plain
			},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});
});

describe('migration from version 2', () => {
	it('keeps the choices and favourites, with the background fluid had', () => {
		useStorage(stored(2, {appIds: ['a', 'b'], sourceIds: null, favoriteIds: ['b']}));
		expect(loadSettings()).toEqual({
			settings: {
				appIds: ['a', 'b'],
				knownAppIds: null,
				sourceIds: null,
				favoriteIds: ['b'],
				background: dark,
				weather: off,
				language: 'tv',
				appearance: plain
			},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});
});

describe('migration from version 3', () => {
	it('keeps every choice, with the weather off', () => {
		const photo: Background = {kind: 'photo', id: 'lake'};
		useStorage(stored(3, {appIds: ['a'], sourceIds: ['x'], favoriteIds: ['a'], background: photo}));
		expect(loadSettings()).toEqual({
			settings: {
				appIds: ['a'],
				knownAppIds: null,
				sourceIds: ['x'],
				favoriteIds: ['a'],
				background: photo,
				weather: off,
				language: 'tv',
				appearance: plain
			},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});
});

describe('migration from version 4', () => {
	it('keeps every choice, and speaks the TV language as before', () => {
		const weather = {enabled: true, place: berlin};
		useStorage(stored(4, {appIds: null, sourceIds: null, favoriteIds: [], background: dark, weather}));
		expect(loadSettings()).toEqual({
			settings: {
				appIds: null,
				knownAppIds: null,
				sourceIds: null,
				favoriteIds: [],
				background: dark,
				weather,
				language: 'tv',
				appearance: plain
			},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});
});

describe('migration from version 5', () => {
	it('keeps every choice, and learns which apps there are at the next reading', () => {
		const settings = {
			appIds: ['b', 'a'],
			sourceIds: null,
			favoriteIds: ['a'],
			background: dark,
			weather: off,
			language: 'de'
		};
		useStorage(stored(5, settings));
		expect(loadSettings()).toEqual({
			settings: {...settings, knownAppIds: null, appearance: plain},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});
});

describe('migration from version 6', () => {
	it('keeps every choice, and looks as fluid did until then', () => {
		const settings = {
			appIds: ['b', 'a'],
			knownAppIds: ['a', 'b'],
			sourceIds: null,
			favoriteIds: ['a'],
			background: {kind: 'color', color: 'duskMoving'},
			weather: {enabled: true, place: berlin},
			language: 'en'
		};
		useStorage(stored(6, settings));
		expect(loadSettings()).toEqual({
			settings: {...settings, appearance: plain},
			unreadable: false,
			migrated: true,
			firstStart: false
		});
	});
});

describe('appearance', () => {
	const read = (appearance: unknown) => {
		useStorage(stored(SETTINGS_VERSION, {...defaultSettings(), appearance}));
		return loadSettings().settings.appearance;
	};

	it('looks as fluid always did at first', () => {
		expect(defaultAppearance()).toEqual(plain);
		expect(defaultSettings().appearance).toEqual(plain);
	});

	it('offers the themes as the mockup orders them', () => {
		expect(THEMES).toEqual(['black', 'dark', 'light']);
	});

	it('reads back every value of every field', () => {
		for (const theme of THEMES) expect(read({...plain, theme}).theme).toBe(theme);
		for (const accent of ACCENTS) expect(read({...plain, accent}).accent).toBe(accent);
		for (const glow of GLOW_LEVELS) expect(read({...plain, glow}).glow).toBe(glow);
		for (const iconSize of ICON_SIZES) expect(read({...plain, iconSize}).iconSize).toBe(iconSize);
		expect(read({...plain, reduceMotion: true}).reduceMotion).toBe(true);
	});

	it('falls back field by field, also for a value of a later fluid', () => {
		expect(read({...plain, theme: 'sepia', glow: 30})).toEqual({...plain, glow: 30});
		expect(read({...plain, accent: 'teal', iconSize: 85})).toEqual({...plain, iconSize: 85});
		expect(read({...plain, glow: '30', iconSize: 120})).toEqual(plain);
		expect(read({...plain, reduceMotion: 'true'}).reduceMotion).toBe(false);
	});

	it('falls back as a whole for anything else', () => {
		for (const appearance of [undefined, null, 'light', [], 3]) expect(read(appearance)).toEqual(plain);
	});

	it('keeps only its own fields', () => {
		expect(read({...plain, extra: 1})).toEqual(plain);
	});
});

describe('language', () => {
	const read = (language: unknown) => {
		useStorage(stored(SETTINGS_VERSION, {...defaultSettings(), language}));
		return loadSettings().settings.language;
	};

	it('offers the TV first, then each language', () => {
		expect(LANGUAGE_CHOICES).toEqual(['tv', 'de', 'en']);
	});

	it('follows the TV at first', () => {
		expect(defaultSettings().language).toBe('tv');
	});

	it('reads back each language fluid speaks, and the TV choice', () => {
		for (const language of ['tv', 'de', 'en']) expect(read(language)).toBe(language);
	});

	it('follows the TV for a language fluid does not speak, or anything else', () => {
		for (const language of ['fr', 'DE', 'de-DE', '', null, 1, undefined])
			expect(read(language), String(language)).toBe('tv');
	});
});

describe('first start', () => {
	it('is told only when nothing is stored', () => {
		expect(loadSettings().firstStart).toBe(true);
		saveSettings(defaultSettings());
		expect(loadSettings().firstStart).toBe(false);
	});

	it('is not told for settings of fluid 0.1, nor for unreadable ones', () => {
		useStorage({[LEGACY_KEY]: '{"appIds":null}'});
		expect(loadSettings().firstStart).toBe(false);
		useStorage({[SETTINGS_KEY]: '{broken'});
		expect(loadSettings().firstStart).toBe(false);
		useStorage({}, true);
		expect(loadSettings().firstStart).toBe(false);
	});
});

describe('weather', () => {
	const read = (weather: unknown) => {
		useStorage(stored(SETTINGS_VERSION, {appIds: null, sourceIds: null, favoriteIds: [], background: dark, weather}));
		return loadSettings().settings.weather;
	};

	it('starts off, with no place', () => {
		expect(defaultSettings().weather).toEqual(off);
	});

	it('reads back whether it is on, and the place', () => {
		expect(read({enabled: true, place: berlin})).toEqual({enabled: true, place: berlin});
		expect(read({enabled: false, place: berlin})).toEqual({enabled: false, place: berlin});
		expect(read({enabled: true, place: null})).toEqual({enabled: true, place: null});
	});

	it('is off for anything but true', () => {
		for (const enabled of [undefined, 'true', 1, null]) expect(read({enabled, place: berlin}).enabled).toBe(false);
	});

	it('drops a place that is not one', () => {
		for (const place of [
			'Berlin',
			[],
			{...berlin, name: ''},
			{...berlin, name: 5},
			{...berlin, latitude: '52.52'},
			{...berlin, latitude: 90.5},
			{...berlin, longitude: -181},
			{...berlin, longitude: null}
		])
			expect(read({enabled: true, place}), JSON.stringify(place)).toEqual({enabled: true, place: null});
	});

	it('keeps a place without region or country, and only its own fields', () => {
		const bare = {name: 'Somewhere', latitude: 1, longitude: 2, population: 5};
		expect(read({enabled: true, place: bare}).place).toEqual({
			name: 'Somewhere',
			region: '',
			country: '',
			latitude: 1,
			longitude: 2
		});
	});

	it('falls back to off for anything else', () => {
		for (const weather of [undefined, true, 'on', []]) expect(read(weather), JSON.stringify(weather)).toEqual(off);
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
			{kind: 'color', color: 'dusk'},
			{kind: 'color', color: 'duskMoving'},
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
