import {afterEach, describe, expect, it, vi} from 'vitest';
import {APP_CATALOG} from '../../config/catalog';
import {DEFAULT_CONFIG} from '../../lib/storage';
import {platform} from '..';
import {MOCK_APPS, MOCK_DEFAULT_APP_IDS, MOCK_INPUTS} from './data';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('browser sample data', () => {
	it('uses only reserved example IDs, no real apps', () => {
		const catalogIds = APP_CATALOG.map((app) => app.id);
		for (const app of MOCK_APPS) {
			expect(app.id).toMatch(/^com\.example\./);
			expect(catalogIds).not.toContain(app.id);
		}
	});

	it('draws apps as letter tiles, without image files', () => {
		for (const app of MOCK_APPS) {
			expect(app.iconUrl).toBeUndefined();
			expect(app.color).toMatch(/^#[0-9A-F]{6}$/i);
		}
	});

	it('starts with apps that exist in the sample list', () => {
		const ids = MOCK_APPS.map((app) => app.id);
		expect(MOCK_DEFAULT_APP_IDS.length).toBeGreaterThan(0);
		for (const id of MOCK_DEFAULT_APP_IDS) expect(ids).toContain(id);
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
		await expect(platform.listApps({useHomebrew: true})).resolves.toEqual({apps: MOCK_APPS, source: 'mock'});
		await expect(platform.listInputs()).resolves.toEqual(MOCK_INPUTS);
	});

	it('only logs what it would launch', async () => {
		const log = vi.spyOn(console, 'info').mockImplementation(() => {});
		await platform.launch('com.example.movies');
		expect(log).toHaveBeenCalledWith('[mock] would launch com.example.movies');
	});

	it('puts sample apps on the home row of a fresh start', () => {
		expect(DEFAULT_CONFIG.appIds).toEqual(MOCK_DEFAULT_APP_IDS);
	});
});
