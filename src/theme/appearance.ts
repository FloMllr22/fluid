// How fluid looks, applied: the accent on :root, over the token that applyTokens() wrote,
// and reduced motion as a class there. Also the colours fluid derives from an app's own
// colour (the accent "app", the glow behind the wheel), kept readable.

import {fromHsl, parseColor, type Rgb, readableOn, toHex, toHsl, withLuminance} from '../lib/color';
import type {Accent, Appearance} from '../state/settings';
import {ACCENT_COLOR, COLOR} from './tokens';

/** The accent where there is no app to take it from (in Settings, and for "app" before
 *  the app's colour is known): the chosen one, Ice blue for "app". */
export function accentColor(accent: Accent): string {
	return ACCENT_COLOR[accent === 'app' ? 'ice' : accent];
}

/** Below this an accent from an app is no longer its colour but almost grey. */
const MIN_ACCENT_SATURATION = 0.45;

/** The accent "app" for an app of colour `color`: its hue, as light as it must be to keep
 *  4.5:1 where accents are drawn; for an app without a colour of its own, Ice blue. */
export function appAccent(color: Rgb | null): string {
	if (!color) return accentColor('app');
	const hsl = toHsl(color);
	const vivid = fromHsl({...hsl, s: Math.max(hsl.s, MIN_ACCENT_SATURATION)});
	return toHex(readableOn(vivid, parseColor(COLOR.accentGround), 4.5, 0.62));
}

/** The glow behind the wheel never gets brighter than this luminance, so that the names on
 *  it keep their contrast at its strongest. */
export const GLOW_LUMINANCE = 0.16;

/** The colour of the glow behind the wheel: the app's own, deep, or for an app without one
 *  the accent's. */
export function glowColor(color: Rgb | null, accent: string): string {
	return toHex(withLuminance(color || parseColor(accent), GLOW_LUMINANCE, true, 0.6));
}

/** The same colour, see-through: where a glow fades out (a gradient to "transparent" would
 *  fade through grey on older TVs). */
export function clear(hex: string): string {
	const {r, g, b} = parseColor(hex);
	return `rgba(${r}, ${g}, ${b}, 0)`;
}

/** The class on :root that stops every transition and animation (see global.css). */
export const REDUCE_MOTION_CLASS = 'reduce-motion';

/** What applyAppearance needs of :root. */
export interface StyleRoot {
	style: {setProperty: (name: string, value: string) => void};
	className: string;
}

/** Writes the accent onto :root, and turns reduced motion on or off there. Every screen
 *  follows at once. */
export function applyAppearance(appearance: Appearance, root: StyleRoot = document.documentElement): void {
	root.style.setProperty('--color-accent', accentColor(appearance.accent));
	const classes = root.className.split(' ').filter((name) => name !== '' && name !== REDUCE_MOTION_CLASS);
	if (appearance.reduceMotion) classes.push(REDUCE_MOTION_CLASS);
	root.className = classes.join(' ');
}
