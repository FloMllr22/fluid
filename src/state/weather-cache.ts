// The last weather fluid read, so that Home shows it at once at the next start, also
// without a network (cache-first). A cache, not a setting: it may be lost at any time,
// and the weather is then read again. Stored data is untrusted and checked on loading.

import type {Place, Weather} from '../platform';

export const WEATHER_CACHE_KEY = 'fluid-weather-cache-v1';

export interface CachedWeather {
	/** the place it is for */
	latitude: number;
	longitude: number;
	weather: Weather;
	/** when it was read, in ms since 1970 */
	readAt: number;
}

/** The cached weather for `place`, or null when there is none for it. Never throws. */
export function loadCachedWeather(place: Place): CachedWeather | null {
	let entry: unknown;
	try {
		entry = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
	} catch {
		return null;
	}
	if (!isObject(entry) || !isObject(entry.weather)) return null;
	const {latitude, longitude, readAt} = entry;
	if (latitude !== place.latitude || longitude !== place.longitude) return null;
	const {temperature, code, isDay} = entry.weather;
	if (typeof readAt !== 'number' || !Number.isFinite(readAt)) return null;
	if (typeof temperature !== 'number' || !Number.isFinite(temperature)) return null;
	if (!Number.isInteger(code) || typeof isDay !== 'boolean') return null;
	return {latitude, longitude, weather: {temperature, code: code as number, isDay}, readAt};
}

/** Keeps the weather just read, replacing what was cached for any place. */
export function saveCachedWeather(entry: CachedWeather): void {
	try {
		localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry));
	} catch {
		/* storage full: only the cache is lost, and the next start waits for the network */
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
