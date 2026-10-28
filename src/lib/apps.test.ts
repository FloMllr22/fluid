import {describe, expect, it} from 'vitest';
import type {AppEntry} from '../platform';
import {sameApps} from './apps';

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
