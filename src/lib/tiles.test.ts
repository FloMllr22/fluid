import {describe, expect, it} from 'vitest';
import {t} from '../i18n';
import {LIVE_TV_ID} from '../platform';
import {appTile, inputGlyph, inputTile, pickInOrder} from './tiles';

describe('pickInOrder', () => {
	const items = [{id: 'x'}, {id: 'y'}, {id: 'z'}];
	const idOf = (item: {id: string}) => item.id;

	it('returns items in the order of the ID list', () => {
		expect(pickInOrder(items, ['z', 'x'], idOf)).toEqual([{id: 'z'}, {id: 'x'}]);
	});

	it('drops IDs that no longer exist', () => {
		expect(pickInOrder(items, ['gone', 'y'], idOf)).toEqual([{id: 'y'}]);
	});

	it('returns nothing for an empty ID list', () => {
		expect(pickInOrder(items, [], idOf)).toEqual([]);
	});
});

describe('tile adapters', () => {
	it('maps an app to a tile keyed by its app ID', () => {
		expect(appTile({id: 'com.example.app', title: 'Example', iconUrl: 'icon.png', color: '#123456'})).toEqual({
			key: 'com.example.app',
			label: 'Example',
			imageUrl: 'icon.png',
			color: '#123456'
		});
	});

	it('maps an input to a tile keyed by the app that switches to it, with its glyph', () => {
		const tile = inputTile({
			id: 'HDMI_1',
			appId: 'com.webos.app.hdmi1',
			label: 'Console',
			port: 1,
			connected: true,
			icon: 'gameconsole.png'
		});
		expect(tile).toEqual({key: 'com.webos.app.hdmi1', label: 'Console', glyph: 'console'});
	});

	it('names Live TV, which fluid adds itself, in the language of the UI', () => {
		const tile = inputTile({
			id: LIVE_TV_ID,
			appId: 'com.webos.app.livetv',
			label: 'tuner',
			port: 0,
			connected: true,
			icon: 'tv.png'
		});
		expect(tile.label).toBe(t('inputs.liveTv'));
	});
});

describe('inputGlyph', () => {
	it('picks a device glyph from the icon name EIM reports', () => {
		expect(inputGlyph('tv.png')).toBe('tv');
		expect(inputGlyph('streamingbox.png')).toBe('player');
		expect(inputGlyph('hometheater.png')).toBe('speaker');
		expect(inputGlyph('pc.png')).toBe('monitor');
	});

	it('ignores case and a missing extension', () => {
		expect(inputGlyph('mediaServer.png')).toBe('player');
		expect(inputGlyph('Camera')).toBe('camera');
	});

	it('falls back to the generic input glyph', () => {
		expect(inputGlyph('HDMI_1.png')).toBe('input');
		expect(inputGlyph('')).toBe('input');
		expect(inputGlyph('something-new.png')).toBe('input');
	});

	it('is not fooled by names of built-in object properties', () => {
		expect(inputGlyph('constructor')).toBe('input');
		expect(inputGlyph('__proto__')).toBe('input');
	});
});
