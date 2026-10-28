// Navigation in a grid of tiles (Settings, onboarding): pure functions, so they can be
// tested without drawing anything.

import type {TileModel} from '../components/Tile';

export type ArrowKey = 'left' | 'right' | 'up' | 'down';

/** Where an arrow key moves the focus in a grid of `count` tiles, `cols` to a row, or -1
 *  when Up leaves the grid from its top row. Left and right run on across rows; Down stays
 *  put when there is no tile below. */
export function gridStep(index: number, key: ArrowKey, count: number, cols: number): number {
	if (key === 'left') return Math.max(0, index - 1);
	if (key === 'right') return Math.max(0, Math.min(count - 1, index + 1));
	if (key === 'up') return index >= cols ? index - cols : -1;
	return index + cols < count ? index + cols : index;
}

/** What a grid shows in up to `height` px, its `bleed` above and below included: as many
 *  whole rows as fit (at least one), each `step` high with the `gap` below it, and the
 *  height of just those rows with their bleed, so that no part of a further row shows. */
export function shownRows(height: number, step: number, gap: number, bleed: number): {rows: number; height: number} {
	const rows = Math.max(1, Math.floor((height - 2 * bleed + gap) / step));
	return {rows, height: Math.min(height, rows * step - gap + 2 * bleed)};
}

/** The first of `visible` whole rows a grid of `rows` shows, with `row` in focus: the
 *  focused row in the middle where it can be, the grid's first or last rows at its ends. */
export function firstShownRow(row: number, rows: number, visible: number): number {
	return clamp(row - Math.floor((visible - 1) / 2), 0, Math.max(0, rows - visible));
}

/** Where a tile picked up at `from` may go when moved towards `to`: within its group, the
 *  first `pinned` tiles (favourites) or the rest. */
export function heldTarget(from: number, to: number, pinned: number, count: number): number {
	return from < pinned ? clamp(to, 0, pinned - 1) : clamp(to, pinned, count - 1);
}

/** The focus after switching between two lists of the same tiles (all of them, and those
 *  shown): on the same tile where it is in both, otherwise on the first. */
export function keepFocus(from: TileModel[], to: TileModel[], index: number): number {
	const key = from[index] ? from[index].key : undefined;
	const found = key === undefined ? -1 : to.map((tile) => tile.key).indexOf(key);
	return Math.max(0, found);
}

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}
