// The colours keep their text readable: WCAG AA (4.5:1) for every text colour on what it
// is drawn on, measured on the plain backgrounds at their lightest point.

import {describe, expect, it} from 'vitest';
import {contrast, luminance, parseColor, type Rgb, stack} from '../lib/color';
import {ACCENT_COLOR, applyTokens, COLOR, inlineTokens, LAYOUT, MOTION} from './tokens';

/** The plain colours behind the screens at their lightest: the dark, black and blue
 *  gradients, the bright horizon of the dusk. */
const GROUNDS = [COLOR.bgGradientInner, COLOR.bg, COLOR.bgBlueInner, COLOR.duskHorizon];

const TEXTS = {textPrimary: COLOR.textPrimary, textSecondary: COLOR.textSecondary, textMuted: COLOR.textMuted};

const ratio = (text: string, ground: Rgb) => contrast(parseColor(text), ground);

describe('colours', () => {
	it('read in Settings and the onboarding, on the veil', () => {
		for (const ground of GROUNDS) {
			const behind = stack(ground, COLOR.screenDim);
			for (const name in TEXTS) {
				const text = TEXTS[name as keyof typeof TEXTS];
				expect(ratio(text, behind), `${name} on ${ground}`).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	it('read on a surface and the open tab (muted text is never drawn there)', () => {
		for (const ground of GROUNDS)
			for (const surface of [COLOR.surface, COLOR.tabOpen]) {
				const behind = stack(ground, COLOR.screenDim, surface);
				expect(ratio(COLOR.textPrimary, behind), `on ${ground} ${surface}`).toBeGreaterThanOrEqual(4.5);
				expect(ratio(COLOR.textSecondary, behind), `on ${ground} ${surface}`).toBeGreaterThanOrEqual(4.5);
			}
	});

	it('read on what has focus', () => {
		const fill = parseColor(COLOR.focusFill);
		expect(ratio(COLOR.focusText, fill)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(stack(COLOR.focusFill, COLOR.focusTextSoft), fill)).toBeGreaterThanOrEqual(4.5);
	});

	it('warn on what has focus too', () => {
		expect(contrast(parseColor(COLOR.dangerTextFocused), parseColor(COLOR.focusFill))).toBeGreaterThanOrEqual(4.5);
	});

	it('read in the menus and toasts, errors included', () => {
		for (const ground of GROUNDS) {
			const menu = stack(ground, COLOR.glassMenu);
			expect(ratio(COLOR.textPrimary, menu)).toBeGreaterThanOrEqual(4.5);
			expect(ratio(COLOR.textSecondary, menu)).toBeGreaterThanOrEqual(4.5);
			expect(ratio(COLOR.danger, menu), `danger on ${ground}`).toBeGreaterThanOrEqual(4.5);
			expect(ratio(COLOR.dangerText, menu), `warning on ${ground}`).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('set every accent apart from its surfaces', () => {
		const ground = parseColor(COLOR.accentGround);
		for (const accent in ACCENT_COLOR) {
			const shade = ACCENT_COLOR[accent as keyof typeof ACCENT_COLOR];
			expect(ratio(shade, ground), accent).toBeGreaterThanOrEqual(4.5);
			// a switch that is on: its knob (focusText) on the accent
			expect(ratio(COLOR.focusText, parseColor(shade)), `${accent} knob`).toBeGreaterThanOrEqual(3);
		}
	});

	it('measure the accent on the lightest row or button it is drawn on', () => {
		const ground = luminance(parseColor(COLOR.accentGround));
		for (const background of GROUNDS)
			expect(luminance(stack(background, COLOR.screenDim, COLOR.surface)), background).toBeLessThanOrEqual(ground);
	});
});

describe('inlineTokens', () => {
	it('writes in the value of a token, with its unit', () => {
		expect(inlineTokens('a{color:var(--color-focus-fill);left:var(--layout-safe-x)}')).toBe(
			`a{color:${COLOR.focusFill};left:${LAYOUT.safeX}px}`
		);
		expect(inlineTokens('a{transition-duration:var(--motion-focus-ms)}')).toBe(
			`a{transition-duration:${MOTION.focusMs}ms}`
		);
	});

	it('leaves a scale without a unit', () => {
		expect(inlineTokens('a{--x:var(--motion-focus-scale)}')).toBe(`a{--x:${MOTION.focusScale}}`);
	});

	it('keeps what changes while fluid runs a variable', () => {
		const css = 'a{color:var(--color-accent);width:var(--layout-app-icon)}';
		expect(inlineTokens(css)).toBe(css);
	});

	it('stops at a name that is no token', () => {
		expect(() => inlineTokens('a{color:var(--color-nothing)}')).toThrow('--color-nothing');
	});
});

describe('applyTokens', () => {
	it('writes onto :root only what changes while fluid runs', () => {
		const written: Record<string, string> = {};
		const root = {
			style: {setProperty: (name: string, value: string) => (written[name] = value)}
		} as unknown as HTMLElement;
		applyTokens(root);
		expect(written['--color-accent']).toBe(COLOR.accent);
		expect(written['--layout-app-icon']).toBe(`${LAYOUT.appIcon}px`);
		expect(Object.keys(written)).toHaveLength(6);
	});
});
