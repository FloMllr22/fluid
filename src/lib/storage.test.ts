import {afterEach, describe, expect, it, vi} from 'vitest';
import {STORAGE_KEY} from '../config/constants';
import {DEFAULT_CONFIG, loadConfig, saveConfig, toggleId} from './storage';

/** Minimal in-memory stand-in for the TV's localStorage. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
	const data: Record<string, string> = {...initial};
	return {
		get length() {
			return Object.keys(data).length;
		},
		clear: () => {
			for (const key of Object.keys(data)) delete data[key];
		},
		getItem: (key) => (key in data ? data[key] : null),
		key: (index) => Object.keys(data)[index] ?? null,
		removeItem: (key) => {
			delete data[key];
		},
		setItem: (key, value) => {
			data[key] = String(value);
		}
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('toggleId', () => {
	it('appends a missing ID', () => {
		expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
	});

	it('removes a present ID', () => {
		expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
	});

	it('never mutates its input', () => {
		const ids = ['a'];
		toggleId(ids, 'b');
		expect(ids).toEqual(['a']);
	});
});

describe('loadConfig', () => {
	it('returns the defaults on first start', () => {
		vi.stubGlobal('localStorage', fakeStorage());
		expect(loadConfig()).toEqual(DEFAULT_CONFIG);
	});

	it('returns the defaults when the stored value is not JSON', () => {
		vi.stubGlobal('localStorage', fakeStorage({[STORAGE_KEY]: '{broken'}));
		expect(loadConfig()).toEqual(DEFAULT_CONFIG);
	});

	it('replaces fields of the wrong type with their defaults', () => {
		vi.stubGlobal('localStorage', fakeStorage({[STORAGE_KEY]: '{"appIds":"x","sourceIds":5,"useHomebrew":"yes"}'}));
		expect(loadConfig()).toEqual(DEFAULT_CONFIG);
	});

	it('reads back what was saved', () => {
		vi.stubGlobal('localStorage', fakeStorage());
		const config = {appIds: ['b', 'a'], sourceIds: ['com.webos.app.hdmi2'], useHomebrew: true};
		saveConfig(config);
		expect(loadConfig()).toEqual(config);
	});
});
