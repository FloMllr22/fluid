// The user's choices: which apps and which inputs appear on the home rows, in order.
// Persisted in localStorage (private to this app on the TV).

import {STORAGE_KEY} from '../config/constants';

export interface UserConfig {
	/** ordered app IDs for the Apps row; null → every app, in the order of LG's launcher */
	appIds: string[] | null;
	/** ordered input appIds (com.webos.app.hdmiN) for the Sources row; null → all inputs */
	sourceIds: string[] | null;
}

export const DEFAULT_CONFIG: UserConfig = {
	appIds: null,
	sourceIds: null
};

/** Reads the stored choices. Fields of the wrong type fall back to their defaults, and
 *  fields fluid no longer has (such as the Homebrew option before root was required) are
 *  dropped. */
export function loadConfig(): UserConfig {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {...DEFAULT_CONFIG};
		const parsed = JSON.parse(raw) as Partial<UserConfig>;
		return {
			appIds: Array.isArray(parsed.appIds) ? parsed.appIds : null,
			sourceIds: Array.isArray(parsed.sourceIds) ? parsed.sourceIds : null
		};
	} catch {
		return {...DEFAULT_CONFIG};
	}
}

export function saveConfig(config: UserConfig): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	} catch {
		/* nothing sensible to do on a TV */
	}
}

/** Toggle an ID in an ordered list: remove if present, else append. */
export function toggleId(ids: string[], id: string): string[] {
	return ids.indexOf(id) === -1 ? ids.concat(id) : ids.filter((x) => x !== id);
}
