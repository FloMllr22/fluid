import {describe, expect, it} from 'vitest';
import {contrast, fromHsl, luminance, parseColor, stack, toHsl} from '../lib/color';
import {defaultAppearance} from '../state/settings';
import {
	accentColor,
	appAccent,
	applyAppearance,
	clear,
	GLOW_LUMINANCE,
	glowColor,
	REDUCE_MOTION_CLASS,
	type StyleRoot
} from './appearance';
import {ACCENT_COLOR, COLOR} from './tokens';

/** Colours of every hue, from deep to pale, as app icons have them. */
const HUES = Array.from({length: 24}, (_, i) => i / 24);
const APP_COLORS = HUES.map((h) => fromHsl({h, s: 0.8, l: 0.5}))
	.concat(HUES.map((h) => fromHsl({h, s: 0.9, l: 0.2})))
	.concat(HUES.map((h) => fromHsl({h, s: 0.7, l: 0.85})));

function fakeRoot(className = ''): StyleRoot & {props: Record<string, string>} {
	const props: Record<string, string> = {};
	return {props, className, style: {setProperty: (name, value) => (props[name] = value)}};
}

describe('accentColor', () => {
	it('is the accent chosen', () => {
		expect(accentColor('mint')).toBe(ACCENT_COLOR.mint);
	});

	it('is Ice blue for the app’s colour where there is no app', () => {
		expect(accentColor('app')).toBe(ACCENT_COLOR.ice);
	});
});

describe('appAccent', () => {
	it('keeps 4.5:1 where accents are drawn, for an app of any colour', () => {
		const ground = parseColor(COLOR.accentGround);
		for (const color of APP_COLORS)
			expect(contrast(parseColor(appAccent(color)), ground), JSON.stringify(color)).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps the app’s hue', () => {
		const red = parseColor('#e2553b');
		expect(toHsl(parseColor(appAccent(red))).h).toBeCloseTo(toHsl(red).h, 1);
	});

	it('is Ice blue for an app without a colour of its own', () => {
		expect(appAccent(null)).toBe(ACCENT_COLOR.ice);
	});
});

describe('glowColor', () => {
	it('stays deep', () => {
		for (const color of APP_COLORS)
			expect(luminance(parseColor(glowColor(color, ACCENT_COLOR.ice)))).toBeLessThanOrEqual(GLOW_LUMINANCE);
	});

	it('takes the accent for an app without a colour', () => {
		const glow = toHsl(parseColor(glowColor(null, ACCENT_COLOR.coral)));
		expect(glow.h).toBeCloseTo(toHsl(parseColor(ACCENT_COLOR.coral)).h, 1);
	});

	it('keeps the names on the wheel readable at its strongest', () => {
		// at 50 %, on the lightest plain background, under the wheel's shade
		for (const color of APP_COLORS) {
			const {r, g, b} = parseColor(glowColor(color, ACCENT_COLOR.ice));
			const behind = stack(COLOR.bgBlueInner, `rgba(${r}, ${g}, ${b}, 0.5)`, COLOR.wheelShade);
			expect(contrast(parseColor(COLOR.textPrimary), behind)).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('fades out to itself, see-through', () => {
		expect(clear('#e2553b')).toBe('rgba(226, 85, 59, 0)');
	});
});

describe('applyAppearance', () => {
	it('writes the accent onto :root', () => {
		const root = fakeRoot();
		applyAppearance({...defaultAppearance(), accent: 'gold'}, root);
		expect(root.props['--color-accent']).toBe(ACCENT_COLOR.gold);
		applyAppearance({...defaultAppearance(), accent: 'app'}, root);
		expect(root.props['--color-accent']).toBe(ACCENT_COLOR.ice);
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
