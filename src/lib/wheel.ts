// The app wheel on Home as pure functions, so it can be tested without drawing anything:
// the apps sit on a large circle whose right-most point, in the middle of the screen, holds
// the selected app. The list has no ends: after the last app comes the first again.

export interface WheelShape {
	radius: number;
	/** degrees between neighbours */
	step: number;
	/** degrees of extra room either side of the selected app */
	gap: number;
	/** how many apps are shown either side of the selected one */
	reach: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The wheel's turn once the app at `selected` (of `count`) is selected. A turn counts on
 *  past the ends of the list, round and round; of the turns that bring the app to the
 *  middle this is the one nearest `turn`, so the wheel turns the shortest way (exactly half
 *  way round: forward). */
export function wheelTurn(turn: number, count: number, selected: number): number {
	if (count === 0) return turn;
	let step = mod(selected - turn, count);
	if (step > count / 2) step -= count;
	return turn + step;
}

/** Where the app at `index` is with the wheel at `turn`: its offset from the app in the
 *  middle, below it positive, at most half the apps either way; and its lap, which changes
 *  when it comes round from one end of the wheel to the other. */
export function wheelSlot(index: number, count: number, turn: number): {offset: number; lap: number} {
	let offset = mod(index - turn, count);
	if (offset > count / 2) offset -= count;
	return {offset, lap: Math.round((turn + offset - index) / count)};
}

/** Where the app `offset` places from the selected one sits, measured from the selected
 *  one (right and down positive): the circle curves away to the left. Beyond `reach` the
 *  apps wait one place further out, off the screen. */
export function wheelPoint(offset: number, shape: WheelShape): {x: number; y: number} {
	const places = Math.min(Math.abs(offset), shape.reach + 1);
	if (places === 0) return {x: 0, y: 0};
	const angle = (Math.sign(offset) * (shape.gap + places * shape.step) * Math.PI) / 180;
	return {x: shape.radius * (Math.cos(angle) - 1), y: shape.radius * Math.sin(angle)};
}

/** How opaque the app `offset` places from the selected one is: the selected one fully,
 *  the others fainter the further out they are, by `step` per place from `rest`; those
 *  beyond `reach` not at all. */
export function wheelOpacity(offset: number, reach: number, rest: number, step: number): number {
	const places = Math.abs(offset);
	if (places === 0) return 1;
	if (places > reach) return 0;
	return Math.round((rest - places * step) * 100) / 100;
}
