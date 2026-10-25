import {afterEach, describe, expect, it, vi} from 'vitest';
import {platform} from '..';
import {MOCK_APPS, MOCK_INPUTS} from './data';

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

	it('only logs what it would launch', async () => {
		const log = vi.spyOn(console, 'info').mockImplementation(() => {});
		await platform.launch('com.example.movies');
		expect(log).toHaveBeenCalledWith('[mock] would launch com.example.movies');
	});
});
