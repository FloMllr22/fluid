import {useState} from 'preact/hooks';
import type {TileModel} from '../components/Tile';
import {type ArrowKey, gridStep, heldTarget, keepFocus} from '../lib/gridTab';
import {moveItem} from '../lib/order';
import {LAYOUT} from '../theme/tokens';

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

/** A grid of tiles to choose from, as Settings and the onboarding show it. */
export interface GridTab {
	/** what the grid shows: everything, or while re-ordering only what is shown, in order */
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
	/** Enters or leaves re-order mode, keeping the focus on its tile; returns how many
	 *  tiles the grid then shows. */
	setReordering: (next: boolean) => number;
	/** Focus on the first tile, for another tab. */
	reset: () => void;
}

/** The state and keys of one grid tab (none: an empty grid). OK adds or removes a tile
 *  (select), or picks one (a tab without a re-order button). In re-order mode the grid
 *  shows only what is shown on Home: OK picks a tile up, the arrows move it within its
 *  group (favourites stay in front), OK puts it down, Back puts it back. Changes go out
 *  as they happen, through `onToggle` and `onReorder`. */
export function useGridTab(
	tab: SettingsTab | undefined,
	onToggle: (tabId: string, key: string) => void,
	onReorder: (tabId: string, keys: string[]) => void
): GridTab {
	const [index, setIndex] = useState(0);
	const [reordering, setReorderingState] = useState(false);
	const [held, setHeld] = useState<Held | null>(null);
	const cols = LAYOUT.gridColumns;
	const canReorder = tab !== undefined && tab.reorderLabel !== undefined;
	const items = tab ? (reordering ? tab.shown : tab.items) : [];
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
			onToggle(tab.id, items[i].key);
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

	const setReordering = (next: boolean): number => {
		if (!tab || !canReorder || next === reordering) return items.length;
		const target = next ? tab.shown : tab.items;
		setIndex(keepFocus(items, target, index));
		setHeld(null);
		setReorderingState(next);
		return target.length;
	};

	const reset = () => setIndex(0);

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
