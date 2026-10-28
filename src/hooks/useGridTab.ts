import {useState} from 'preact/hooks';
import type {TileModel} from '../components/Tile';
import {type ArrowKey, choiceOrder, gridStep, heldTarget, keepFocus} from '../lib/gridTab';
import {moveItem} from '../lib/order';

/** A tab of tiles to choose from (Apps, Sources, Background). */
export interface SettingsTab {
	id: string;
	label: string;
	/** the re-order button, e.g. "Re-order apps". A tab without one is for picking one
	 *  item (the background): OK picks it, and there is no re-order mode. */
	reorderLabel?: string;
	/** everything available */
	items: TileModel[];
	/** what's on the home screen, in home-screen order; on a tab for picking, the item
	 *  picked */
	shown: TileModel[];
	/** how many items lead `shown` as their own group (favourites); re-ordering keeps each
	 *  item within its group */
	pinned?: number;
	/** says why `items` is empty: still loading, failed, or nothing there */
	emptyText: string;
}

/** A tile picked up in re-order mode, and the order to restore on Back. */
interface Held {
	index: number;
	original: string[];
}

/** The order of a tab's grid, fixed while tiles are added and removed. */
interface Fixed {
	tabId: string;
	keys: string[];
}

/** A grid of tiles to choose from, as Settings and the onboarding show it. */
export interface GridTab {
	/** what the grid shows: everything, what is on Home first and in its order (see
	 *  choiceOrder), or while re-ordering only what is on Home */
	items: TileModel[];
	mode: 'select' | 'pick' | 'reorder';
	/** the focused tile */
	index: number;
	/** the tile picked up in re-order mode, or -1 */
	held: number;
	reordering: boolean;
	/** the tab has a re-order mode, and a button for it */
	canReorder: boolean;
	/** An arrow key in the grid: moves the focus, or the tile picked up. False when Up
	 *  leaves the grid from its top row. */
	arrow: (key: ArrowKey) => boolean;
	/** OK on a tile, or the pointer clicking it: add or remove it, pick it, or in re-order
	 *  mode pick it up or put it down */
	activate: (index: number) => void;
	/** The pointer over a tile focuses it, unless a tile is picked up. False then. */
	point: (index: number) => boolean;
	/** Back: puts a picked-up tile back, otherwise leaves re-order mode. False when there
	 *  was nothing to undo. */
	back: () => boolean;
	/** Enters or leaves re-order mode, keeping the focus on its tile; entering with `lift`
	 *  (a tile of the grid as it is) picks that tile up, if it is on Home. Returns how many
	 *  tiles the grid then shows. */
	setReordering: (next: boolean, lift?: number) => number;
	/** Focus on the first tile, for another tab. */
	reset: () => void;
}

/** The state and keys of one grid tab (none: an empty grid) of `cols` columns. OK adds or
 *  removes a tile (select), or picks one (a tab without a re-order button). A tab with
 *  re-order mode shows what is on Home first, in Home's order, so that a tile keeps its
 *  place when re-ordering starts; tiles added and removed stay where they are (the order
 *  is fixed until the tab or the mode changes), and one added goes to Home where the grid
 *  shows it (`onToggle` gets the grid's order). In re-order mode the grid shows only what
 *  is on Home: OK picks a tile up, the arrows move it within its group (favourites stay
 *  in front), OK puts it down, Back puts it back. Changes go out as they happen, through
 *  `onToggle` and `onReorder`. */
export function useGridTab(
	tab: SettingsTab | undefined,
	onToggle: (tabId: string, key: string, order: string[]) => void,
	onReorder: (tabId: string, keys: string[]) => void,
	cols: number
): GridTab {
	const [index, setIndex] = useState(0);
	const [reordering, setReorderingState] = useState(false);
	const [held, setHeld] = useState<Held | null>(null);
	const [fixed, setFixed] = useState<Fixed | null>(null);
	const canReorder = tab !== undefined && tab.reorderLabel !== undefined;
	const fixedKeys = fixed && tab && fixed.tabId === tab.id ? fixed.keys : undefined;
	const items = !tab
		? []
		: reordering
			? tab.shown
			: canReorder
				? choiceOrder(tab.items, tab.shown, fixedKeys)
				: tab.items;
	const keysOf = (list: TileModel[]) => list.map((tile) => tile.key);

	/** Move the held tile to `to`, updating the home screen as it goes. */
	const moveHeld = (to: number) => {
		if (!tab || !held) return;
		const dest = heldTarget(held.index, to, tab.pinned || 0, items.length);
		if (dest === held.index) return;
		onReorder(tab.id, moveItem(keysOf(tab.shown), held.index, dest));
		setHeld({...held, index: dest});
		setIndex(dest);
	};

	const arrow = (key: ArrowKey): boolean => {
		if (held) {
			const offsets: Record<ArrowKey, number> = {left: -1, right: 1, up: -cols, down: cols};
			moveHeld(held.index + offsets[key]);
			return true;
		}
		const next = gridStep(index, key, items.length, cols);
		if (next === -1) return false;
		setIndex(next);
		return true;
	};

	const activate = (i: number) => {
		if (!tab || !items[i]) return;
		if (!reordering) {
			const order = keysOf(items);
			if (canReorder && !fixedKeys) setFixed({tabId: tab.id, keys: order});
			onToggle(tab.id, items[i].key, order);
			return;
		}
		if (held) {
			// put down (pointer: at the clicked tile)
			if (i !== held.index) moveHeld(i);
			setHeld(null);
			return;
		}
		setHeld({index: i, original: keysOf(tab.shown)}); // pick up
		setIndex(i);
	};

	const point = (i: number): boolean => {
		if (held) return false;
		setIndex(i);
		return true;
	};

	const back = (): boolean => {
		if (held && tab) {
			onReorder(tab.id, held.original);
			setIndex(held.index);
			setHeld(null);
			return true;
		}
		if (reordering) {
			setReordering(false);
			return true;
		}
		return false;
	};

	const setReordering = (next: boolean, lift = -1): number => {
		if (!tab || !canReorder || next === reordering) return items.length;
		const target = next ? tab.shown : choiceOrder(tab.items, tab.shown);
		const lifted = next && items[lift] ? keysOf(target).indexOf(items[lift].key) : -1;
		if (lifted !== -1) {
			setHeld({index: lifted, original: keysOf(tab.shown)});
			setIndex(lifted);
		} else {
			setHeld(null);
			setIndex(keepFocus(items, target, lift === -1 ? index : lift));
		}
		setFixed(null);
		setReorderingState(next);
		return target.length;
	};

	const reset = () => {
		setIndex(0);
		setFixed(null);
	};

	return {
		items,
		mode: reordering ? 'reorder' : canReorder ? 'select' : 'pick',
		index,
		held: held ? held.index : -1,
		reordering,
		canReorder,
		arrow,
		activate,
		point,
		back,
		setReordering,
		reset
	};
}
