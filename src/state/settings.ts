// The user's settings: one versioned object in localStorage (private to fluid on the TV).
// Every setting lives here with its default. Changing the shape of the settings means a
// new SETTINGS_VERSION and a migration in MIGRATIONS, so an update of fluid always keeps
// what the user set. Stored data is untrusted: each field is checked on loading and falls
// back to its default on its own. Callers always get fresh objects and arrays.

export interface Settings {
	/** ordered app IDs for the Apps row; null → every app, in the order of LG's launcher */
	appIds: string[] | null;
	/** ordered input appIds (com.webos.app.hdmiN) for the Sources row; null → all inputs */
	sourceIds: string[] | null;
}

export const SETTINGS_VERSION = 1;

/** Holds {version, settings}. */
export const SETTINGS_KEY = 'fluid-settings';

/** Where fluid 0.1 kept its choices, before settings had a version (version 0). */
export const LEGACY_KEY = 'fluid-config-v1';

type Data = Record<string, unknown>;

/** MIGRATIONS[n] turns the data of version n - 1 into that of version n. */
export const MIGRATIONS: Record<number, (data: Data) => Data> = {
	// fluid 0.1 → 1: the same choices; the Homebrew option went when root became a requirement
	1: (data) => ({appIds: data.appIds, sourceIds: data.sourceIds})
};

export function defaultSettings(): Settings {
	return {appIds: null, sourceIds: null};
}

export interface LoadedSettings {
	settings: Settings;
	/** stored settings existed but could not be read; the defaults are used instead */
	unreadable: boolean;
	/** the settings were migrated from an older version and should be saved */
	migrated: boolean;
}

/** Reads the settings, migrating older ones. Never throws. */
export function loadSettings(): LoadedSettings {
	let raw: string | null;
	let legacy: string | null = null;
	try {
		raw = localStorage.getItem(SETTINGS_KEY);
		if (raw === null) legacy = localStorage.getItem(LEGACY_KEY);
	} catch {
		return {settings: defaultSettings(), unreadable: true, migrated: false};
	}
	if (raw === null && legacy === null) return {settings: defaultSettings(), unreadable: false, migrated: false};

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
		return {settings: defaultSettings(), unreadable: true, migrated: false};
	}

	// A version newer than this fluid (after a downgrade) is read as far as the fields are
	// known; saving then writes the current version.
	for (let next = version + 1; next <= SETTINGS_VERSION; next++) data = MIGRATIONS[next](data);
	return {settings: sanitize(data), unreadable: false, migrated: version < SETTINGS_VERSION};
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
	return {appIds: idList(data.appIds), sourceIds: idList(data.sourceIds)};
}

/** A copy of a list of IDs, or null for anything else. */
function idList(value: unknown): string[] | null {
	if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) return null;
	return value.slice();
}

function isObject(value: unknown): value is Data {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
