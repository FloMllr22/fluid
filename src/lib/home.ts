// Home's layout and navigation as pure functions, so they can be tested without drawing
// anything: the app wheel on the left (its shape: wheel.ts), the bar at the top right
// (Sources, LG Home, Settings) and the Sources menu that opens below it.

import type {ArrowKey} from './gridTab';

/** The bar at the top right, from left to right. */
export const BAR_ITEMS = ['sources', 'lg-home', 'settings'] as const;
export type BarItem = (typeof BAR_ITEMS)[number];

/** Where focus is: the app wheel, the bar, or the Sources menu (open). */
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

/** Where an arrow key moves the focus. On the wheel ↑ ↓ move, from the last app on to the
 *  first and back, and → goes to the bar; in the bar ← → move, and ← from its first item or
 *  ↓ go back to the wheel; in the open menu ↑ ↓ move, and ↑ from its first source closes
 *  it, back to the bar. */
export function homeStep(focus: HomeFocus, key: ArrowKey, counts: HomeCounts): HomeFocus {
	const zone = homeZone(focus, counts);
	if (zone === 'apps') {
		if (key === 'up') return {...focus, app: (focus.app + counts.apps - 1) % counts.apps};
		if (key === 'down') return {...focus, app: (focus.app + 1) % counts.apps};
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

/** The top of a menu `height` tall beside an item: centred on it, and kept within
 *  [min, max]. */
export function popoverTop(itemTop: number, itemHeight: number, height: number, min: number, max: number): number {
	return Math.max(min, Math.min(max - height, itemTop + (itemHeight - height) / 2));
}
