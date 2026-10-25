import {describe, expect, it} from 'vitest';
import {focusIndex, followItem} from './focus';

describe('followItem', () => {
	it('moves the remembered place to where the item now is', () => {
		expect(followItem(['c', 'a', 'b'], {key: 'c', index: 2})).toEqual({key: 'c', index: 0});
	});

	it('keeps the same object when nothing moved or the item is gone', () => {
		const focus = {key: 'a', index: 0};
		expect(followItem(['a', 'b'], focus)).toBe(focus);
		expect(followItem(['b'], focus)).toBe(focus);
	});
});

describe('focusIndex', () => {
	it('starts at the first item', () => {
		expect(focusIndex(['a', 'b'], undefined)).toBe(0);
	});

	it('follows the focused item when the row changes order', () => {
		// "c" became a favourite and moved to the front
		expect(focusIndex(['c', 'a', 'b'], {key: 'c', index: 2})).toBe(0);
	});

	it('stays at the same place when the focused item leaves the row', () => {
		expect(focusIndex(['a', 'c', 'd'], {key: 'b', index: 1})).toBe(1);
	});

	it('moves to the last item when the row got shorter than that place', () => {
		expect(focusIndex(['a', 'b'], {key: 'gone', index: 5})).toBe(1);
	});

	it('is 0 for an empty row', () => {
		expect(focusIndex([], {key: 'a', index: 3})).toBe(0);
	});
});
