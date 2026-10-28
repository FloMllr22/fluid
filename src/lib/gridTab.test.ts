import {describe, expect, it} from 'vitest';
import type {TileModel} from '../components/Tile';
import {choiceOrder, firstShownRow, gridStep, heldTarget, keepFocus, shownRows} from './gridTab';

const tiles = (...keys: string[]): TileModel[] => keys.map((key) => ({key, label: key}));

describe('gridStep', () => {
	// 11 tiles, 4 to a row:  0 1 2 3 / 4 5 6 7 / 8 9 10
	it('moves left and right, on across rows, and stops at either end', () => {
		expect(gridStep(5, 'left', 11, 4)).toBe(4);
		expect(gridStep(4, 'left', 11, 4)).toBe(3);
		expect(gridStep(0, 'left', 11, 4)).toBe(0);
		expect(gridStep(3, 'right', 11, 4)).toBe(4);
		expect(gridStep(10, 'right', 11, 4)).toBe(10);
	});

	it('moves up and down a row', () => {
		expect(gridStep(6, 'up', 11, 4)).toBe(2);
		expect(gridStep(2, 'down', 11, 4)).toBe(6);
		expect(gridStep(6, 'down', 11, 4)).toBe(10);
	});

	it('stays put going down where there is no tile below', () => {
		expect(gridStep(7, 'down', 11, 4)).toBe(7);
		expect(gridStep(9, 'down', 11, 4)).toBe(9);
	});

	it('leaves the grid going up from the top row', () => {
		expect(gridStep(0, 'up', 11, 4)).toBe(-1);
		expect(gridStep(3, 'up', 11, 4)).toBe(-1);
	});

	it('stays on the first place in an empty grid', () => {
		expect(gridStep(0, 'right', 0, 4)).toBe(0);
		expect(gridStep(0, 'down', 0, 4)).toBe(0);
	});
});

describe('heldTarget', () => {
	// 2 favourites in front of 4 other apps
	it('keeps a favourite among the favourites', () => {
		expect(heldTarget(0, 1, 2, 6)).toBe(1);
		expect(heldTarget(1, 5, 2, 6)).toBe(1);
		expect(heldTarget(1, -3, 2, 6)).toBe(0);
	});

	it('keeps any other app behind the favourites', () => {
		expect(heldTarget(3, 0, 2, 6)).toBe(2);
		expect(heldTarget(3, 9, 2, 6)).toBe(5);
		expect(heldTarget(3, 4, 2, 6)).toBe(4);
	});

	it('moves freely without favourites', () => {
		expect(heldTarget(3, 0, 0, 6)).toBe(0);
		expect(heldTarget(0, 5, 0, 6)).toBe(5);
	});
});

describe('keepFocus', () => {
	it('stays on the same tile when the list changes', () => {
		expect(keepFocus(tiles('a', 'b', 'c', 'd'), tiles('c', 'a'), 2)).toBe(0);
		expect(keepFocus(tiles('c', 'a'), tiles('a', 'b', 'c', 'd'), 1)).toBe(0);
		expect(keepFocus(tiles('c', 'a'), tiles('a', 'b', 'c', 'd'), 0)).toBe(2);
	});

	it('goes to the first tile when its tile is not in the other list', () => {
		expect(keepFocus(tiles('a', 'b', 'c'), tiles('a', 'c'), 1)).toBe(0);
		expect(keepFocus(tiles(), tiles('a'), 0)).toBe(0);
	});
});

describe('choiceOrder', () => {
	const keys = (list: TileModel[]) => list.map((tile) => tile.key);
	const all = tiles('a', 'b', 'c', 'd', 'e');

	it("puts what is on Home first, in Home's order, then the rest in theirs", () => {
		expect(keys(choiceOrder(all, tiles('d', 'a', 'c')))).toEqual(['d', 'a', 'c', 'b', 'e']);
	});

	it('keeps a fixed order, with tiles new to it last', () => {
		expect(keys(choiceOrder(all.concat(tiles('f')), tiles('a'), ['c', 'a', 'e', 'b', 'd']))).toEqual([
			'c',
			'a',
			'e',
			'b',
			'd',
			'f'
		]);
	});

	it('leaves out what is no longer there', () => {
		expect(keys(choiceOrder(tiles('a', 'c'), tiles('b', 'c', 'a')))).toEqual(['c', 'a']);
	});
});

describe('shownRows', () => {
	// rows 236 px apart (a tile, its name and a gap of 32 below), 28 px of bleed above and below
	it('shows the whole rows that fit, no higher than they are', () => {
		// Settings: 738 px held three rows and the top 2 px of the fourth, which starts at 736
		expect(shownRows(738, 236, 32, 28)).toEqual({rows: 3, height: 732});
		// without the button above: more room, still three whole rows
		expect(shownRows(818, 236, 32, 28)).toEqual({rows: 3, height: 732});
		// the onboarding: two rows, and 4 px less than it may take
		expect(shownRows(500, 236, 32, 28)).toEqual({rows: 2, height: 496});
	});

	it('shows one row however little room there is', () => {
		expect(shownRows(100, 236, 32, 28)).toEqual({rows: 1, height: 100});
	});
});

describe('firstShownRow', () => {
	it('keeps the focused row in the middle of three', () => {
		expect(firstShownRow(4, 10, 3)).toBe(3);
	});

	it('starts at the first row and ends at the last', () => {
		expect(firstShownRow(0, 10, 3)).toBe(0);
		expect(firstShownRow(1, 10, 3)).toBe(0);
		expect(firstShownRow(9, 10, 3)).toBe(7);
	});

	it('does not scroll a grid that fits', () => {
		expect(firstShownRow(1, 2, 3)).toBe(0);
	});

	it('keeps the focused row on top of two, but at the end', () => {
		expect(firstShownRow(3, 10, 2)).toBe(3);
		expect(firstShownRow(9, 10, 2)).toBe(8);
	});
});
