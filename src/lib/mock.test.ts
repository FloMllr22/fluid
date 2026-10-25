import {describe, expect, it} from 'vitest';
import {APP_CATALOG} from '../config/catalog';
import {listApps} from './apps';
import {MOCK_APPS, MOCK_DEFAULT_APP_IDS, MOCK_INPUTS} from './mock';
import {DEFAULT_CONFIG} from './storage';

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
	it('lists the sample apps', async () => {
		await expect(listApps(false)).resolves.toEqual({apps: MOCK_APPS, source: 'mock'});
	});

	it('puts sample apps on the home row of a fresh start', () => {
		expect(DEFAULT_CONFIG.appIds).toEqual(MOCK_DEFAULT_APP_IDS);
	});
});
