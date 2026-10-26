// Home's layout and navigation as pure functions, so they can be tested without drawing
// anything: the app list on the left, the bar at the top right (Sources, LG Home,
// Settings) and the Sources menu that opens below it.

import type {ArrowKey} from './gridTab';

/** The bar at the top right, from left to right. */
export const BAR_ITEMS = ['sources', 'lg-home', 'settings'] as const;
export type BarItem = (typeof BAR_ITEMS)[number];

/** Where focus is: the app list, the bar, or the Sources menu (open). */
export type HomeZone = 'apps' | 'bar' | 'sources';

export interface HomeFocus {
	zone: HomeZone;
	/** the focused app, the bar item and the source; each kept while focus is elsewhere */
	app: number;
	bar: number;
	source: number;
}

export interface HomeCounts {
	apps: number;
	sources: number;
}

/** The zone that has focus: without apps (loading, failed, none chosen) the bar has it. */
export function homeZone(focus: HomeFocus, counts: HomeCounts): HomeZone {
	return focus.zone === 'apps' && counts.apps === 0 ? 'bar' : focus.zone;
}

/** Where an arrow key moves the focus. In the list ↑ ↓ move and → goes to the bar; in the
 *  bar ← → move, and ← from its first item or ↓ go back to the list; in the open menu
 *  ↑ ↓ move, and ↑ from its first source closes it, back to the bar. */
export function homeStep(focus: HomeFocus, key: ArrowKey, counts: HomeCounts): HomeFocus {
	const zone = homeZone(focus, counts);
	if (zone === 'apps') {
		if (key === 'up') return {...focus, app: Math.max(0, focus.app - 1)};
		if (key === 'down') return {...focus, app: Math.min(counts.apps - 1, focus.app + 1)};
		if (key === 'right') return {...focus, zone: 'bar'};
		return focus;
	}
	if (zone === 'bar') {
		const toList = counts.apps > 0 ? {...focus, zone: 'apps' as const} : focus;
		if (key === 'left') return focus.bar > 0 ? {...focus, zone, bar: focus.bar - 1} : toList;
		if (key === 'right') return {...focus, zone, bar: Math.min(BAR_ITEMS.length - 1, focus.bar + 1)};
		if (key === 'down') return toList;
		return focus;
	}
	if (key === 'up') return focus.source > 0 ? {...focus, source: focus.source - 1} : {...focus, zone: 'bar'};
	if (key === 'down') return {...focus, source: Math.max(0, Math.min(counts.sources - 1, focus.source + 1))};
	return focus;
}

/** Where a vertical list sits in a space `size` tall: `top`, where its first item starts,
 *  centres a list that fits; a longer list starts at the top and scrolls up by `offset`,
 *  keeping the selected item in the middle (clamped at the ends). */
export function listPlacement(
	count: number,
	selected: number,
	item: number,
	gap: number,
	size: number
): {top: number; offset: number} {
	const total = Math.max(0, count * (item + gap) - gap);
	if (total <= size) return {top: (size - total) / 2, offset: 0};
	const middle = selected * (item + gap) + item / 2;
	return {top: 0, offset: Math.max(0, Math.min(total - size, middle - size / 2))};
}

/** The top of a menu `height` tall beside an item: centred on it, and kept within
 *  [min, max]. */
export function popoverTop(itemTop: number, itemHeight: number, height: number, min: number, max: number): number {
	return Math.max(min, Math.min(max - height, itemTop + (itemHeight - height) / 2));
}
