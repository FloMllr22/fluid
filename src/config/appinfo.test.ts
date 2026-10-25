import {describe, expect, it} from 'vitest';
import packageJson from '../../package.json';
import appInfo from '../../public/appinfo.json';
import {APP_ID} from './constants';

describe('appinfo.json', () => {
	it('is where APP_ID comes from', () => {
		expect(APP_ID).toBe(appInfo.id);
	});

	it('has an app ID webOS accepts', () => {
		// lowercase letters, digits, "." "+" "-"; must not claim LG's own namespaces
		expect(appInfo.id).toMatch(/^[a-z0-9][a-z0-9.+-]*[a-z0-9]$/);
		expect(appInfo.id).not.toMatch(/^com\.(webos|palm|lge)\./);
	});

	it('has the same version as package.json, as plain major.minor.patch', () => {
		expect(appInfo.version).toBe(packageJson.version);
		expect(appInfo.version).toMatch(/^\d+\.\d+\.\d+$/);
	});
});
