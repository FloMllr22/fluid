import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Place} from '../platform';
import {type CachedWeather, loadCachedWeather, saveCachedWeather, WEATHER_CACHE_KEY} from './weather-cache';

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
		}
	});
}

const berlin: Place = {name: 'Berlin', region: '', country: 'Germany', latitude: 52.52437, longitude: 13.41053};
const vienna: Place = {name: 'Vienna', region: '', country: 'Austria', latitude: 48.20849, longitude: 16.37208};

const entry: CachedWeather = {
	latitude: berlin.latitude,
	longitude: berlin.longitude,
	weather: {temperature: -2.5, code: 71, isDay: false},
	readAt: 1793000000000
};

const cached = (value: unknown) => ({[WEATHER_CACHE_KEY]: JSON.stringify(value)});

beforeEach(() => {
	vi.unstubAllGlobals();
	useStorage();
});

describe('weather cache', () => {
	it('is empty at first', () => {
		expect(loadCachedWeather(berlin)).toBeNull();
	});

	it('gives back the weather for the place it was read for', () => {
		saveCachedWeather(entry);
		expect(loadCachedWeather(berlin)).toEqual(entry);
		expect(loadCachedWeather(vienna)).toBeNull();
	});

	it('keeps one place only', () => {
		saveCachedWeather(entry);
		saveCachedWeather({...entry, latitude: vienna.latitude, longitude: vienna.longitude});
		expect(loadCachedWeather(berlin)).toBeNull();
		expect(loadCachedWeather(vienna)).not.toBeNull();
	});

	it('ignores what it cannot read', () => {
		useStorage({[WEATHER_CACHE_KEY]: '{broken'});
		expect(loadCachedWeather(berlin)).toBeNull();
		for (const value of [
			null,
			[],
			'text',
			{...entry, weather: null},
			{...entry, readAt: '1793000000000'},
			{...entry, weather: {...entry.weather, temperature: null}},
			{...entry, weather: {...entry.weather, code: 'snow'}},
			{...entry, weather: {...entry.weather, isDay: 0}}
		]) {
			useStorage(cached(value));
			expect(loadCachedWeather(berlin), JSON.stringify(value)).toBeNull();
		}
	});

	it('copes with storage that cannot be used', () => {
		useStorage({}, true);
		expect(() => saveCachedWeather(entry)).not.toThrow();
		expect(loadCachedWeather(berlin)).toBeNull();
	});
});
