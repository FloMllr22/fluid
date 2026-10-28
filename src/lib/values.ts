// A row of Settings with a value to step through (Settings → Appearance): ← → step, OK and
// a click go on to the next value, round to the first after the last. A switch is a row of
// two values, off and on.

/** What a key does on a row showing value `index` of `count`: the value it changes to, or
 *  "exit" (← on the first value leaves the row for the tabs, as ← does from the first
 *  language), or null (nothing further that way). */
export function valueKey(index: number, count: number, key: 'left' | 'right' | 'enter'): number | 'exit' | null {
	if (key === 'enter') return count > 1 ? (index + 1) % count : null;
	if (key === 'left') return index > 0 ? index - 1 : 'exit';
	return index < count - 1 ? index + 1 : null;
}
