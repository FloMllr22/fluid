import {describe, expect, it} from 'vitest';
import type {AppEntry} from '../platform';
import {defaultSettings, type Settings} from '../state/settings';
import {sameApps, withNewApps} from './apps';

const alpha: AppEntry = {id: 'com.example.a', title: 'Alpha', iconUrl: 'data:image/png;base64,QQ=='};
const beta: AppEntry = {id: 'com.example.b', title: 'Beta'};

describe('sameApps', () => {
	it('finds a new reading of the same apps the same', () => {
		expect(sameApps([alpha, beta], [{...alpha}, {...beta}])).toBe(true);
		expect(sameApps([], [])).toBe(true);
	});

	it('sees an app installed or uninstalled', () => {
		expect(sameApps([alpha], [alpha, beta])).toBe(false);
		expect(sameApps([alpha, beta], [beta])).toBe(false);
	});

	it('sees the order changed', () => {
		expect(sameApps([alpha, beta], [beta, alpha])).toBe(false);
	});

	it('sees a new name or icon', () => {
		expect(sameApps([alpha], [{...alpha, title: 'Alpha 2'}])).toBe(false);
		expect(sameApps([beta], [{...beta, iconUrl: 'data:image/png;base64,Qg=='}])).toBe(false);
		expect(sameApps([alpha], [{...alpha, iconUrl: undefined}])).toBe(false);
	});
});

describe('withNewApps', () => {
	const settings = (appIds: string[] | null, knownAppIds: string[] | null): Settings => ({
		...defaultSettings(),
		appIds,
		knownAppIds,
		favoriteIds: ['a']
	});

	it('adds a new app to the end of a row of the user’s own', () => {
		expect(withNewApps(settings(['b', 'a'], ['a', 'b', 'c']), ['a', 'b', 'c', 'd'])).toEqual(
			settings(['b', 'a', 'd'], ['a', 'b', 'c', 'd'])
		);
	});

	it('adds several new apps in the order of the list', () => {
		expect(withNewApps(settings(['a'], ['a']), ['e', 'a', 'd']).appIds).toEqual(['a', 'e', 'd']);
	});

	it('leaves a hidden app hidden', () => {
		expect(withNewApps(settings(['a'], ['a', 'b']), ['a', 'b', 'c']).appIds).toEqual(['a', 'c']);
	});

	it('leaves a row of every app as it is, and learns the new app', () => {
		expect(withNewApps(settings(null, ['a']), ['a', 'b'])).toEqual(settings(null, ['a', 'b']));
	});

	it('only learns which apps there are at the first reading', () => {
		expect(withNewApps(settings(['a'], null), ['a', 'b', 'c'])).toEqual(settings(['a'], ['a', 'b', 'c']));
	});

	it('forgets an uninstalled app, and keeps its place in the row', () => {
		expect(withNewApps(settings(['a', 'b'], ['a', 'b']), ['a'])).toEqual(settings(['a', 'b'], ['a']));
	});

	it('brings an app installed again back at its place, or as new if it was hidden', () => {
		expect(withNewApps(settings(['b', 'a'], ['a']), ['a', 'b']).appIds).toEqual(['b', 'a']);
		expect(withNewApps(settings(['a'], ['a']), ['a', 'b']).appIds).toEqual(['a', 'b']);
	});

	it('changes nothing when the same apps are there, in any order', () => {
		const same = settings(['a'], ['a', 'b']);
		expect(withNewApps(same, ['b', 'a'])).toBe(same);
	});

	it('hands out its own list of the apps', () => {
		const ids = ['a'];
		const next = withNewApps(settings(null, null), ids);
		ids.push('b');
		expect(next.knownAppIds).toEqual(['a']);
	});
});
