// How fluid looks, applied: the theme's colours and the accent on :root, over the tokens
// that applyTokens() wrote, and reduced motion as a class there. Also the colours fluid
// derives from an app's own colour (the accent "app", the glow behind the wheel), kept
// readable on the theme.

import {fromHsl, parseColor, type Rgb, readableOn, toHex, toHsl, withLuminance} from '../lib/color';
import type {Accent, Appearance, Theme} from '../state/settings';
import {ACCENT_COLOR, COLOR, type ColorToken, kebab, THEME_COLOR} from './tokens';

/** Whether a theme is light or dark: it decides which shade of an accent it takes. */
export type ThemeKind = 'dark' | 'light';

export function themeKind(theme: Theme): ThemeKind {
	return theme === 'light' ? 'light' : 'dark';
}

/** Every colour token as the theme has it. */
export function themeColors(theme: Theme): Record<ColorToken, string> {
	const colors = {} as Record<ColorToken, string>;
	const own = THEME_COLOR[theme];
	for (const key in COLOR) {
		const token = key as ColorToken;
		colors[token] = own[token] || COLOR[token];
	}
	return colors;
}

/** The accent where there is no app to take it from (in Settings, and for "app" before
 *  the app's colour is known): the chosen one, Ice blue for "app". */
export function accentColor(accent: Accent, theme: Theme): string {
	return ACCENT_COLOR[accent === 'app' ? 'ice' : accent][themeKind(theme)];
}

/** Below this an accent from an app is no longer its colour but almost grey. */
const MIN_ACCENT_SATURATION = 0.45;

/** The accent "app" for an app of colour `color`: its hue, as light (dark theme) or dark
 *  (light theme) as it must be to keep 4.5:1 on the theme; for an app without a colour of
 *  its own, Ice blue. */
export function appAccent(color: Rgb | null, theme: Theme): string {
	if (!color) return accentColor('app', theme);
	const hsl = toHsl(color);
	const vivid = fromHsl({...hsl, s: Math.max(hsl.s, MIN_ACCENT_SATURATION)});
	const ground = parseColor(themeColors(theme).accentGround);
	return toHex(readableOn(vivid, ground, 4.5, themeKind(theme) === 'dark' ? 0.62 : 0.4));
}

/** The glow behind the wheel never gets brighter (dark themes) or darker (light) than this
 *  luminance, so that the names on it keep their contrast at its strongest. */
export const GLOW_LUMINANCE = {dark: 0.16, light: 0.62};

/** The colour of the glow behind the wheel: the app's own, or for an app without one the
 *  accent; deep in the dark themes, pale in the light one. */
export function glowColor(color: Rgb | null, accent: string, theme: Theme): string {
	const kind = themeKind(theme);
	const base = color || parseColor(accent);
	return toHex(withLuminance(base, GLOW_LUMINANCE[kind], kind === 'dark', 0.6));
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

/** Writes the theme's colours and the accent onto :root, and turns reduced motion on or
 *  off there. Every screen follows at once. */
export function applyAppearance(appearance: Appearance, root: StyleRoot = document.documentElement): void {
	const colors = themeColors(appearance.theme);
	for (const key in colors) root.style.setProperty(`--color-${kebab(key)}`, colors[key as ColorToken]);
	root.style.setProperty('--color-accent', accentColor(appearance.accent, appearance.theme));
	const classes = root.className.split(' ').filter((name) => name !== '' && name !== REDUCE_MOTION_CLASS);
	if (appearance.reduceMotion) classes.push(REDUCE_MOTION_CLASS);
	root.className = classes.join(' ');
}
