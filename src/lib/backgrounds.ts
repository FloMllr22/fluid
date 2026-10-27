// Pure helpers for the background: the photos found in the bundle, the keys of the
// choices in Settings, what to draw for a stored choice, and the slideshow's order.

import {BACKGROUND_COLORS, type Background, type BackgroundColor, defaultBackground} from '../state/settings';

/** A photo that comes with fluid: full screen, and a small one for its tile. */
export interface Photo {
	id: string;
	url: string;
	thumbUrl: string;
}

/** The photos among the bundled files, by ID (the file name): `<id>.jpg` and its
 *  thumbnail `<id>.thumb.jpg` (the full photo when there is none). `full` and `thumbs`
 *  map file paths to URLs. */
export function photosFrom(full: Record<string, string>, thumbs: Record<string, string>): Photo[] {
	const idOf = (path: string) => (path.split('/').pop() || '').replace(/(\.thumb)?\.jpg$/, '');
	const thumbById: Record<string, string> = {};
	for (const path in thumbs) thumbById[idOf(path)] = thumbs[path];
	return Object.keys(full)
		.map((path) => {
			const id = idOf(path);
			return {id, url: full[path], thumbUrl: thumbById[id] || full[path]};
		})
		.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** A light in a colour background: an ellipse centred at x, y with radii rx, ry, all in %
 *  of the screen, that fades out at 70 % of its radii. */
export interface Light {
	x: number;
	y: number;
	rx: number;
	ry: number;
}

/** Where a light goes as a layer of its own, in % of the screen: just large enough for
 *  the ellipse up to where it has faded out, so that it can move without being redrawn. */
export function lightLayer(light: Light): {left: number; top: number; width: number; height: number} {
	const round = (n: number) => Math.round(n * 100) / 100;
	const rx = 0.7 * light.rx;
	const ry = 0.7 * light.ry;
	return {left: round(light.x - rx), top: round(light.y - ry), width: round(2 * rx), height: round(2 * ry)};
}

/** The key of a background's tile in Settings. */
export function backgroundKey(background: Background): string {
	if (background.kind === 'color') return `color:${background.color}`;
	if (background.kind === 'photo') return `photo:${background.id}`;
	return 'slideshow';
}

/** The background a tile in Settings stands for, or null for any other key. */
export function backgroundFromKey(key: string): Background | null {
	const [kind, value] = key.split(/:(.*)/);
	if (kind === 'color' && BACKGROUND_COLORS.indexOf(value as BackgroundColor) !== -1)
		return {kind, color: value as BackgroundColor};
	if (kind === 'photo' && value) return {kind, id: value};
	if (key === 'slideshow') return {kind: 'slideshow'};
	return null;
}

/** What to draw for the stored background, given the photos this fluid has: a photo that
 *  is gone falls back to the default, a slideshow needs two photos (one is shown as
 *  itself, none falls back to the default). */
export function shownBackground(background: Background, photoIds: string[]): Background {
	if (background.kind === 'photo' && photoIds.indexOf(background.id) === -1) return defaultBackground();
	if (background.kind === 'slideshow' && photoIds.length < 2)
		return photoIds.length === 1 ? {kind: 'photo', id: photoIds[0]} : defaultBackground();
	return background;
}

/** The next round of a slideshow: every photo once, shuffled, and never starting with
 *  `last` (the one on screen), so no photo follows itself. */
export function slideOrder(ids: string[], last: string | undefined, random: () => number = Math.random): string[] {
	const order = ids.slice();
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		const swap = order[i];
		order[i] = order[j];
		order[j] = swap;
	}
	if (order.length > 1 && order[0] === last) order.push(order.shift() as string);
	return order;
}
