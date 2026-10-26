import {afterEach, describe, expect, it, vi} from 'vitest';
import {platform} from '..';
import {MOCK_APPS, MOCK_INPUTS, MOCK_PLACES, MOCK_WEATHER} from './data';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('browser sample data', () => {
	it('uses only reserved example IDs, no real apps', () => {
		for (const app of MOCK_APPS) expect(app.id).toMatch(/^com\.example\./);
	});

	it('draws apps as letter tiles, without image files', () => {
		for (const app of MOCK_APPS) {
			expect(app.iconUrl).toBeUndefined();
			expect(app.color).toMatch(/^#[0-9A-F]{6}$/i);
		}
	});

	it('has places that could come from the place search', () => {
		for (const place of MOCK_PLACES) {
			expect(place.name).not.toBe('');
			expect(place.region).not.toBe(place.name);
			expect(Math.abs(place.latitude)).toBeLessThanOrEqual(90);
			expect(Math.abs(place.longitude)).toBeLessThanOrEqual(180);
		}
	});

	it('has unique input apps', () => {
		const appIds = MOCK_INPUTS.map((input) => input.appId);
		expect(new Set(appIds).size).toBe(appIds.length);
	});
});

describe('outside webOS', () => {
	it('picks the mock platform', () => {
		expect(platform.kind).toBe('mock');
	});

	it('lists the sample apps and inputs', async () => {
		await expect(platform.listApps()).resolves.toEqual({apps: MOCK_APPS, failedIcons: 0});
		await expect(platform.listInputs()).resolves.toEqual(MOCK_INPUTS);
	});

	it('fails the app list on request, to show the error states in a browser', async () => {
		vi.stubGlobal('location', {search: '?apps-error=no-homebrew'});
		await expect(platform.listApps()).rejects.toMatchObject({name: 'PlatformError', code: 'no-homebrew'});
	});

	it('lists more apps on request, to show a long list in a browser', async () => {
		vi.stubGlobal('location', {search: '?apps=20'});
		const {apps} = await platform.listApps();
		expect(apps).toHaveLength(20);
		expect(new Set(apps.map((app) => app.id)).size).toBe(20);
		expect(apps[0]).toEqual(MOCK_APPS[0]);
		expect(apps[MOCK_APPS.length].title).toBe(`${MOCK_APPS[0].title} 2`);
	});

	it('ignores an unknown error code in the address', async () => {
		vi.stubGlobal('location', {search: '?apps-error=reboot'});
		await expect(platform.listApps()).resolves.toEqual({apps: MOCK_APPS, failedIcons: 0});
	});

	it('takes the language from the address, to try each one in a browser', () => {
		vi.stubGlobal('location', {search: '?lang=de-DE'});
		expect(platform.getLocale()).toBe('de-DE');
	});

	it('otherwise uses the language of the browser', () => {
		vi.stubGlobal('location', {search: ''});
		vi.stubGlobal('navigator', {language: 'en-GB'});
		expect(platform.getLocale()).toBe('en-GB');
	});

	it('finds sample places from the start of their name, without going online', async () => {
		vi.stubGlobal('location', {search: ''});
		const found = await platform.searchPlaces('spring', 'en');
		expect(found.map((place) => place.region)).toEqual(['Illinois', 'Missouri', 'Massachusetts']);
		await expect(platform.searchPlaces('Xyzzy', 'en')).resolves.toEqual([]);
		await expect(platform.searchPlaces('B', 'en')).resolves.toEqual([]);
	});

	it('has the same weather everywhere', async () => {
		vi.stubGlobal('location', {search: ''});
		await expect(platform.getWeather(52.52, 13.41)).resolves.toEqual(MOCK_WEATHER);
	});

	it('shows other skies on request', async () => {
		vi.stubGlobal('location', {search: '?weather-code=71&weather-night=1'});
		await expect(platform.getWeather(52.52, 13.41)).resolves.toMatchObject({code: 71, isDay: false});
		vi.stubGlobal('location', {search: '?weather-code=snow'});
		await expect(platform.getWeather(52.52, 13.41)).resolves.toEqual(MOCK_WEATHER);
	});

	it('fails the place search and the weather on request', async () => {
		vi.stubGlobal('location', {search: '?weather-error=offline'});
		await expect(platform.searchPlaces('Berlin', 'en')).rejects.toMatchObject({code: 'offline'});
		await expect(platform.getWeather(52.52, 13.41)).rejects.toMatchObject({code: 'offline'});
	});

	it('only logs what it would launch', async () => {
		const log = vi.spyOn(console, 'info').mockImplementation(() => {});
		await platform.launch('com.example.movies');
		expect(log).toHaveBeenCalledWith('[mock] would launch com.example.movies');
	});
});
