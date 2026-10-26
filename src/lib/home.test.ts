import {describe, expect, it} from 'vitest';
import {type HomeFocus, homeStep, homeZone, listPlacement, popoverTop} from './home';

const at = (zone: HomeFocus['zone'], app = 0, bar = 0, source = 0): HomeFocus => ({zone, app, bar, source});
const counts = {apps: 5, sources: 3};

describe('homeZone', () => {
	it('is where focus was put', () => {
		expect(homeZone(at('apps'), counts)).toBe('apps');
		expect(homeZone(at('sources'), counts)).toBe('sources');
	});

	it('is the bar while there are no apps', () => {
		expect(homeZone(at('apps'), {apps: 0, sources: 3})).toBe('bar');
	});
});

describe('homeStep in the app list', () => {
	it('moves up and down, stopping at the ends', () => {
		expect(homeStep(at('apps', 2), 'up', counts)).toEqual(at('apps', 1));
		expect(homeStep(at('apps', 2), 'down', counts)).toEqual(at('apps', 3));
		expect(homeStep(at('apps', 0), 'up', counts)).toEqual(at('apps', 0));
		expect(homeStep(at('apps', 4), 'down', counts)).toEqual(at('apps', 4));
	});

	it('goes right to the bar, where it was before', () => {
		expect(homeStep(at('apps', 2, 1), 'right', counts)).toEqual(at('bar', 2, 1));
	});

	it('stays put on the left', () => {
		expect(homeStep(at('apps', 2), 'left', counts)).toEqual(at('apps', 2));
	});
});

describe('homeStep in the bar', () => {
	it('moves left and right along it', () => {
		expect(homeStep(at('bar', 0, 1), 'left', counts)).toEqual(at('bar', 0, 0));
		expect(homeStep(at('bar', 0, 1), 'right', counts)).toEqual(at('bar', 0, 2));
		expect(homeStep(at('bar', 0, 2), 'right', counts)).toEqual(at('bar', 0, 2));
	});

	it('goes back to the list, to the app it left, from its first item or with ↓', () => {
		expect(homeStep(at('bar', 3, 0), 'left', counts)).toEqual(at('apps', 3, 0));
		expect(homeStep(at('bar', 3, 2), 'down', counts)).toEqual(at('apps', 3, 2));
	});

	it('stays in the bar while there are no apps', () => {
		const none = {apps: 0, sources: 3};
		expect(homeZone(homeStep(at('apps', 0, 0), 'left', none), none)).toBe('bar');
		expect(homeZone(homeStep(at('bar', 0, 1), 'down', none), none)).toBe('bar');
		expect(homeStep(at('apps', 0, 0), 'right', none)).toEqual(at('bar', 0, 1));
	});

	it('does nothing on ↑', () => {
		expect(homeStep(at('bar', 0, 1), 'up', counts)).toEqual(at('bar', 0, 1));
	});
});

describe('homeStep in the Sources menu', () => {
	it('moves up and down, stopping at the last source', () => {
		expect(homeStep(at('sources', 0, 0, 1), 'down', counts)).toEqual(at('sources', 0, 0, 2));
		expect(homeStep(at('sources', 0, 0, 2), 'down', counts)).toEqual(at('sources', 0, 0, 2));
		expect(homeStep(at('sources', 0, 0, 2), 'up', counts)).toEqual(at('sources', 0, 0, 1));
	});

	it('closes from its first source with ↑', () => {
		expect(homeStep(at('sources', 0, 0, 0), 'up', counts)).toEqual(at('bar', 0, 0, 0));
	});

	it('ignores ← and →, and ↓ without sources', () => {
		expect(homeStep(at('sources', 0, 0, 1), 'left', counts)).toEqual(at('sources', 0, 0, 1));
		expect(homeStep(at('sources', 0, 0, 1), 'right', counts)).toEqual(at('sources', 0, 0, 1));
		expect(homeStep(at('sources'), 'down', {apps: 5, sources: 0})).toEqual(at('sources'));
	});
});

describe('listPlacement', () => {
	it('centres a list that fits', () => {
		// 3 items of 10 with gaps of 2: 34 tall, in 100
		expect(listPlacement(3, 2, 10, 2, 100)).toEqual({top: 33, offset: 0});
		expect(listPlacement(0, 0, 10, 2, 100)).toEqual({top: 50, offset: 0});
	});

	it('scrolls a longer list to keep the selected item in the middle', () => {
		// 20 items: 238 tall in 100; item 10 has its middle at 125
		expect(listPlacement(20, 10, 10, 2, 100)).toEqual({top: 0, offset: 75});
	});

	it('stops scrolling at either end', () => {
		expect(listPlacement(20, 1, 10, 2, 100).offset).toBe(0);
		expect(listPlacement(20, 19, 10, 2, 100).offset).toBe(138);
	});
});

describe('popoverTop', () => {
	it('centres the menu on the item', () => {
		expect(popoverTop(500, 80, 300, 60, 1020)).toBe(390);
	});

	it('keeps the menu on the screen', () => {
		expect(popoverTop(40, 80, 300, 60, 1020)).toBe(60);
		expect(popoverTop(980, 80, 300, 60, 1020)).toBe(720);
	});
});
