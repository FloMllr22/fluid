// Pure list helpers for choosing and re-ordering what the rows show.

/** Returns a copy of `list` with the item at `from` moved to `to` (both clamped). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
	const last = list.length - 1;
	const src = Math.max(0, Math.min(last, from));
	const dst = Math.max(0, Math.min(last, to));
	if (src === dst) return list.slice();
	const next = list.slice();
	const [item] = next.splice(src, 1);
	next.splice(dst, 0, item);
	return next;
}

/** Toggle an ID in an ordered list: remove it if present, else add it where `order` (the
 *  order the IDs are shown in to choose from) puts it among the others, or at the end. */
export function toggleId(ids: string[], id: string, order: string[] = []): string[] {
	if (ids.indexOf(id) !== -1) return ids.filter((x) => x !== id);
	const at = order.indexOf(id);
	if (at === -1) return ids.concat(id);
	// right after the last of the others that comes before it
	const before = order.slice(0, at);
	let place = 0;
	ids.forEach((x, i) => {
		if (before.indexOf(x) !== -1) place = i + 1;
	});
	return ids.slice(0, place).concat(id, ids.slice(place));
}

/** `ids` with the favourites first; each group keeps its order. */
export function favoritesFirst(ids: string[], favoriteIds: string[]): string[] {
	const isFavorite = (id: string) => favoriteIds.indexOf(id) !== -1;
	return ids.filter(isFavorite).concat(ids.filter((id) => !isFavorite(id)));
}

/** `order` with `id` swapped with its neighbour one place towards `step` (-1 left, +1 right).
 *  `order` is the row as shown, favourites first: an app stays within its group, so it
 *  never swaps with a neighbour on the other side of the border. The same array when `id`
 *  cannot move that way (end of the row or of its group, or not in the row). */
export function swapNeighbour(order: string[], favoriteIds: string[], id: string, step: -1 | 1): string[] {
	const from = order.indexOf(id);
	const to = from + step;
	if (from === -1 || to < 0 || to >= order.length) return order;
	const isFavorite = (x: string) => favoriteIds.indexOf(x) !== -1;
	if (isFavorite(order[to]) !== isFavorite(id)) return order;
	const next = order.slice();
	next[from] = order[to];
	next[to] = id;
	return next;
}

/** Makes `id` a favourite, placed after the other favourites, or takes it back, placed
 *  first after them. `order` is the row as shown; returns the new order and favourites. */
export function setFavorite(
	order: string[],
	favoriteIds: string[],
	id: string,
	favorite: boolean
): {order: string[]; favoriteIds: string[]} {
	const others = favoriteIds.filter((f) => f !== id);
	const next = favoritesFirst(order, favoriteIds).filter((x) => x !== id);
	next.splice(next.filter((x) => others.indexOf(x) !== -1).length, 0, id);
	return {order: next, favoriteIds: favorite ? others.concat(id) : others};
}
