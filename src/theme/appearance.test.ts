import {describe, expect, it} from 'vitest';
import {contrast, fromHsl, luminance, parseColor, stack, toHsl} from '../lib/color';
import {defaultAppearance, THEMES} from '../state/settings';
import {
	accentColor,
	appAccent,
	applyAppearance,
	clear,
	GLOW_LUMINANCE,
	glowColor,
	REDUCE_MOTION_CLASS,
	type StyleRoot,
	themeColors,
	themeKind
} from './appearance';
import {ACCENT_COLOR, COLOR, THEME_COLOR} from './tokens';

/** Colours of every hue, from deep to pale, as app icons have them. */
const HUES = Array.from({length: 24}, (_, i) => i / 24);
const APP_COLORS = HUES.map((h) => fromHsl({h, s: 0.8, l: 0.5}))
	.concat(HUES.map((h) => fromHsl({h, s: 0.9, l: 0.2})))
	.concat(HUES.map((h) => fromHsl({h, s: 0.7, l: 0.85})));

function fakeRoot(className = ''): StyleRoot & {props: Record<string, string>} {
	const props: Record<string, string> = {};
	return {props, className, style: {setProperty: (name, value) => (props[name] = value)}};
}

describe('themeColors', () => {
	it('is the tokens as they are for the dark theme', () => {
		expect(themeColors('dark')).toEqual(COLOR);
	});

	it('sets the theme’s own colours over them', () => {
		const light = themeColors('light');
		expect(light.textPrimary).toBe(THEME_COLOR.light.textPrimary);
		expect(light.onColor).toBe(COLOR.onColor);
		expect(themeColors('black').glassMenu).toBe(THEME_COLOR.black.glassMenu);
	});

	it('has only tokens that exist', () => {
		for (const theme of THEMES)
			for (const key in THEME_COLOR[theme]) expect(Object.keys(COLOR), `${theme}.${key}`).toContain(key);
	});
});

describe('accentColor', () => {
	it('takes the shade that suits the theme', () => {
		expect(accentColor('mint', 'dark')).toBe(ACCENT_COLOR.mint.dark);
		expect(accentColor('mint', 'black')).toBe(ACCENT_COLOR.mint.dark);
		expect(accentColor('mint', 'light')).toBe(ACCENT_COLOR.mint.light);
	});

	it('is Ice blue for the app’s colour where there is no app', () => {
		expect(accentColor('app', 'dark')).toBe(ACCENT_COLOR.ice.dark);
		expect(accentColor('app', 'light')).toBe(ACCENT_COLOR.ice.light);
	});
});

describe('appAccent', () => {
	it('keeps 4.5:1 on the theme for an app of any colour', () => {
		for (const theme of THEMES) {
			const ground = parseColor(themeColors(theme).accentGround);
			for (const color of APP_COLORS)
				expect(contrast(parseColor(appAccent(color, theme)), ground), JSON.stringify(color)).toBeGreaterThanOrEqual(
					4.5
				);
		}
	});

	it('keeps the app’s hue', () => {
		const red = parseColor('#e2553b');
		expect(toHsl(parseColor(appAccent(red, 'dark'))).h).toBeCloseTo(toHsl(red).h, 1);
		expect(toHsl(parseColor(appAccent(red, 'light'))).h).toBeCloseTo(toHsl(red).h, 1);
	});

	it('is Ice blue for an app without a colour of its own', () => {
		expect(appAccent(null, 'dark')).toBe(ACCENT_COLOR.ice.dark);
		expect(appAccent(null, 'light')).toBe(ACCENT_COLOR.ice.light);
	});
});

describe('glowColor', () => {
	it('stays deep in the dark themes and pale in the light one', () => {
		for (const theme of THEMES)
			for (const color of APP_COLORS) {
				const glow = luminance(parseColor(glowColor(color, '#8FD0FF', theme)));
				if (themeKind(theme) === 'dark') expect(glow).toBeLessThanOrEqual(GLOW_LUMINANCE.dark);
				else expect(glow).toBeGreaterThanOrEqual(GLOW_LUMINANCE.light);
			}
	});

	it('takes the accent for an app without a colour', () => {
		const glow = toHsl(parseColor(glowColor(null, ACCENT_COLOR.coral.dark, 'dark')));
		expect(glow.h).toBeCloseTo(toHsl(parseColor(ACCENT_COLOR.coral.dark)).h, 1);
	});

	it('keeps the names on the wheel readable at its strongest', () => {
		// at 50 %, on the lightest plain background, under the wheel's shade (dark themes)
		for (const theme of THEMES) {
			const colors = themeColors(theme);
			const ground = themeKind(theme) === 'dark' ? COLOR.bgBlueInner : COLOR.bgLightOuter;
			for (const color of APP_COLORS) {
				const {r, g, b} = parseColor(glowColor(color, colors.accent, theme));
				const behind = stack(ground, `rgba(${r}, ${g}, ${b}, 0.5)`, colors.wheelShade);
				expect(contrast(parseColor(colors.textPrimary), behind)).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	it('fades out to itself, see-through', () => {
		expect(clear('#e2553b')).toBe('rgba(226, 85, 59, 0)');
	});
});

describe('applyAppearance', () => {
	it('writes the theme’s colours and the accent onto :root', () => {
		const root = fakeRoot();
		applyAppearance({...defaultAppearance(), theme: 'light', accent: 'gold'}, root);
		expect(root.props['--color-text-primary']).toBe(THEME_COLOR.light.textPrimary);
		expect(root.props['--color-on-color']).toBe(COLOR.onColor);
		expect(root.props['--color-accent']).toBe(ACCENT_COLOR.gold.light);
	});

	it('turns reduced motion on and off, and leaves other classes', () => {
		const root = fakeRoot('lang-de');
		applyAppearance({...defaultAppearance(), reduceMotion: true}, root);
		expect(root.className).toBe(`lang-de ${REDUCE_MOTION_CLASS}`);
		applyAppearance({...defaultAppearance(), reduceMotion: true}, root);
		expect(root.className).toBe(`lang-de ${REDUCE_MOTION_CLASS}`);
		applyAppearance(defaultAppearance(), root);
		expect(root.className).toBe('lang-de');
	});
});
