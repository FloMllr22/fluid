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

/** Toggle an ID in an ordered list: remove if present, else append. */
export function toggleId(ids: string[], id: string): string[] {
	return ids.indexOf(id) === -1 ? ids.concat(id) : ids.filter((x) => x !== id);
}

/** `ids` with the favourites first; each group keeps its order. */
export function favoritesFirst(ids: string[], favoriteIds: string[]): string[] {
	const isFavorite = (id: string) => favoriteIds.indexOf(id) !== -1;
	return ids.filter(isFavorite).concat(ids.filter((id) => !isFavorite(id)));
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
