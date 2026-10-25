import {afterEach, describe, expect, it, vi} from 'vitest';
import {getLocale} from './system';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getLocale', () => {
	it("reads the TV's UI language from the system object", () => {
		vi.stubGlobal('window', {webOSSystem: {locale: 'de-DE'}});
		vi.stubGlobal('navigator', {language: 'en-US'});
		expect(getLocale()).toBe('de-DE');
	});

	it('uses PalmSystem on older firmware', () => {
		vi.stubGlobal('window', {PalmSystem: {locale: 'en-GB'}});
		expect(getLocale()).toBe('en-GB');
	});

	it("falls back to the browser's language", () => {
		vi.stubGlobal('window', {webOSSystem: {locale: ''}});
		vi.stubGlobal('navigator', {language: 'de-AT'});
		expect(getLocale()).toBe('de-AT');
	});
});
