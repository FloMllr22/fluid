import {describe, expect, it} from 'vitest';
import {appTile, inputTile, pickInOrder} from './tiles';

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

	it('maps an input to a tile keyed by the app that switches to it', () => {
		const tile = inputTile({
			id: 'HDMI_1',
			appId: 'com.webos.app.hdmi1',
			label: 'Console',
			port: 1,
			connected: true,
			icon: 'hdmigeneric.png'
		});
		expect(tile.key).toBe('com.webos.app.hdmi1');
		expect(tile.label).toBe('Console');
		expect(tile.glyphImageUrl).toBe('icons/inputs/hdmigeneric.png');
	});
});
