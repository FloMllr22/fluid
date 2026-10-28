// The user's settings: one versioned object in localStorage (private to fluid on the TV).
// Every setting lives here with its default. Changing the shape of the settings means a
// new SETTINGS_VERSION and a migration in MIGRATIONS, so an update of fluid always keeps
// what the user set. Stored data is untrusted: each field is checked on loading and falls
// back to its default on its own. Callers always get fresh objects and arrays.

import {LANGUAGES, type Language} from '../i18n';
import type {Place} from '../platform';

/** The colours fluid offers as a background; dark is the gradient fluid always had,
 *  duskMoving the dusk with its lights slowly moving. A colour added later needs no new
 *  version: an older fluid reads it as the default. */
export const BACKGROUND_COLORS = ['dark', 'black', 'blue', 'dusk', 'duskMoving'] as const;
export type BackgroundColor = (typeof BACKGROUND_COLORS)[number];

/** What is behind the screens: a colour, one of the photos that come with fluid (by its
 *  ID), or a slideshow of all of them. A photo that a later fluid no longer ships is
 *  stored as it is; whoever draws the background falls back to the default. */
export type Background = {kind: 'color'; color: BackgroundColor} | {kind: 'photo'; id: string} | {kind: 'slideshow'};

/** The language fluid speaks: the TV's ("tv"), or one fluid has. */
export type LanguageChoice = 'tv' | Language;

/** The choices, as offered: the TV's first, then each language by its code. */
export const LANGUAGE_CHOICES: LanguageChoice[] = ['tv' as LanguageChoice].concat(LANGUAGES.slice().sort());

/** The weather on Home. Off, fluid makes no network connection at all. */
export interface WeatherSettings {
	enabled: boolean;
	/** the place picked in the place search, named as it was found; only its coordinates
	 *  are sent for the weather. null → none picked yet */
	place: Place | null;
}

export interface Settings {
	/** ordered app IDs for the Apps row; null → every app, in the order of LG's launcher */
	appIds: string[] | null;
	/** the apps there when the list was last read; one not among them is new, and joins the
	 *  Apps row. null → not read yet (a first start, or settings of fluid before version 6) */
	knownAppIds: string[] | null;
	/** ordered input appIds (com.webos.app.hdmiN) for the Sources row; null → all inputs */
	sourceIds: string[] | null;
	/** apps marked as favourites; they lead the Apps row */
	favoriteIds: string[];
	background: Background;
	weather: WeatherSettings;
	language: LanguageChoice;
}

export const SETTINGS_VERSION = 6;

/** Holds {version, settings}. */
export const SETTINGS_KEY = 'fluid-settings';

/** Where fluid 0.1 kept its choices, before settings had a version (version 0). */
export const LEGACY_KEY = 'fluid-config-v1';

type Data = Record<string, unknown>;

/** MIGRATIONS[n] turns the data of version n - 1 into that of version n. */
export const MIGRATIONS: Record<number, (data: Data) => Data> = {
	// fluid 0.1 → 1: the same choices; the Homebrew option went when root became a requirement
	1: (data) => ({appIds: data.appIds, sourceIds: data.sourceIds}),
	// 2: favourites, none yet
	2: (data) => ({...data, favoriteIds: []}),
	// 3: a choice of background; the one fluid had until then
	3: (data) => ({...data, background: defaultBackground()}),
	// 4: the weather, off until the user turns it on
	4: (data) => ({...data, weather: defaultWeather()}),
	// 5: a language of fluid's own; until then it always spoke the TV's
	5: (data) => ({...data, language: 'tv'}),
	// 6: new apps join the Apps row; which apps there are is learnt at the next reading
	6: (data) => ({...data, knownAppIds: null})
};

export function defaultBackground(): Background {
	return {kind: 'color', color: 'dark'};
}

export function defaultWeather(): WeatherSettings {
	return {enabled: false, place: null};
}

export function defaultSettings(): Settings {
	return {
		appIds: null,
		knownAppIds: null,
		sourceIds: null,
		favoriteIds: [],
		background: defaultBackground(),
		weather: defaultWeather(),
		language: 'tv'
	};
}

export interface LoadedSettings {
	settings: Settings;
	/** stored settings existed but could not be read; the defaults are used instead */
	unreadable: boolean;
	/** the settings were migrated from an older version and should be saved */
	migrated: boolean;
	/** nothing was stored: fluid starts for the first time (or its storage was cleared) */
	firstStart: boolean;
}

/** Reads the settings, migrating older ones. Never throws. */
export function loadSettings(): LoadedSettings {
	let raw: string | null;
	let legacy: string | null = null;
	try {
		raw = localStorage.getItem(SETTINGS_KEY);
		if (raw === null) legacy = localStorage.getItem(LEGACY_KEY);
	} catch {
		return {settings: defaultSettings(), unreadable: true, migrated: false, firstStart: false};
	}
	if (raw === null && legacy === null)
		return {settings: defaultSettings(), unreadable: false, migrated: false, firstStart: true};

	let version: number;
	let data: Data;
	try {
		if (raw !== null) {
			const stored = JSON.parse(raw) as {version?: unknown; settings?: unknown};
			if (typeof stored.version !== 'number' || !isObject(stored.settings)) throw new Error('no settings');
			version = stored.version;
			data = stored.settings;
		} else {
			version = 0;
			data = JSON.parse(legacy as string);
			if (!isObject(data)) throw new Error('no settings');
		}
	} catch {
		return {settings: defaultSettings(), unreadable: true, migrated: false, firstStart: false};
	}

	// A version newer than this fluid (after a downgrade) is read as far as the fields are
	// known; saving then writes the current version.
	for (let next = version + 1; next <= SETTINGS_VERSION; next++) data = MIGRATIONS[next](data);
	return {settings: sanitize(data), unreadable: false, migrated: version < SETTINGS_VERSION, firstStart: false};
}

/** Writes the settings. Returns false when the TV's storage refuses them. */
export function saveSettings(settings: Settings): boolean {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify({version: SETTINGS_VERSION, settings}));
		localStorage.removeItem(LEGACY_KEY);
		return true;
	} catch {
		return false;
	}
}

function sanitize(data: Data): Settings {
	return {
		appIds: idList(data.appIds),
		knownAppIds: idList(data.knownAppIds),
		sourceIds: idList(data.sourceIds),
		favoriteIds: idList(data.favoriteIds) || [],
		background: backgroundOf(data.background) || defaultBackground(),
		weather: weatherOf(data.weather),
		language: languageOf(data.language)
	};
}

/** A stored language choice; anything fluid does not speak (any more) means the TV's. */
function languageOf(value: unknown): LanguageChoice {
	return LANGUAGES.find((language) => language === value) || 'tv';
}

/** A copy of the stored weather settings; each field falls back on its own. */
function weatherOf(value: unknown): WeatherSettings {
	if (!isObject(value)) return defaultWeather();
	return {enabled: value.enabled === true, place: placeOf(value.place)};
}

/** A copy of a stored place, or null for anything that is not one. */
function placeOf(value: unknown): Place | null {
	if (!isObject(value)) return null;
	const {name, region, country, latitude, longitude} = value;
	if (typeof name !== 'string' || name === '') return null;
	if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) return null;
	return {
		name,
		region: typeof region === 'string' ? region : '',
		country: typeof country === 'string' ? country : '',
		latitude,
		longitude
	};
}

function isCoordinate(value: unknown, limit: number): value is number {
	return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** A copy of a stored background, or null for anything that is not one. */
function backgroundOf(value: unknown): Background | null {
	if (!isObject(value)) return null;
	const {kind, color, id} = value;
	if (kind === 'color' && BACKGROUND_COLORS.indexOf(color as BackgroundColor) !== -1)
		return {kind, color: color as BackgroundColor};
	if (kind === 'photo' && typeof id === 'string' && id !== '') return {kind, id};
	if (kind === 'slideshow') return {kind};
	return null;
}

/** A copy of a list of IDs, or null for anything else. */
function idList(value: unknown): string[] | null {
	if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) return null;
	return value.slice();
}

function isObject(value: unknown): value is Data {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
