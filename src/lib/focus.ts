// Focus within a row, kept by item rather than by position.

/** The focused item of a row: its key, so focus follows the item when the row changes
 *  order (a new favourite moves to the front), and its index, for when the item leaves
 *  the row (hidden, uninstalled). */
export interface RowFocus {
	key: string;
	index: number;
}

/** The remembered focus with its index moved to where its item now is, so that focus
 *  stays at that place if the item then leaves the row. The same object when nothing
 *  moved, or when the item is gone. */
export function followItem(keys: string[], focus: RowFocus): RowFocus {
	const index = keys.indexOf(focus.key);
	return index === -1 || index === focus.index ? focus : {key: focus.key, index};
}

/** Where the remembered focus is now: the item's current place, otherwise the remembered
 *  place kept inside the row. The first item when nothing is remembered. */
export function focusIndex(keys: string[], focus: RowFocus | undefined): number {
	if (!focus) return 0;
	const index = keys.indexOf(focus.key);
	if (index !== -1) return index;
	return Math.max(0, Math.min(focus.index, keys.length - 1));
}
