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
