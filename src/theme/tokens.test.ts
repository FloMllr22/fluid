// The themes keep their text readable: WCAG AA (4.5:1) for every text colour on every
// surface it is drawn on, measured on the plain backgrounds the theme offers.

import {describe, expect, it} from 'vitest';
import {contrast, luminance, parseColor, type Rgb, stack} from '../lib/color';
import {THEMES, type Theme} from '../state/settings';
import {themeColors, themeKind} from './appearance';
import {ACCENT_COLOR, COLOR} from './tokens';

/** The plain colours behind the screens, at their lightest (dark themes) or darkest
 *  (light) point: the dark, black and blue gradients, the bright horizon of the dusk; the
 *  light theme's own gradient. */
const GROUNDS: Record<'dark' | 'light', string[]> = {
	dark: [COLOR.bgGradientInner, COLOR.bg, COLOR.bgBlueInner, COLOR.duskHorizon],
	light: [COLOR.bgLightInner, COLOR.bgLightMid, COLOR.bgLightOuter]
};

const ratio = (text: string, ground: Rgb) => contrast(parseColor(text), ground);

describe.each(THEMES.map((theme) => [theme]))('theme %s', (theme: Theme) => {
	const colors = themeColors(theme);
	const kind = themeKind(theme);
	const texts = {textPrimary: colors.textPrimary, textSecondary: colors.textSecondary, textMuted: colors.textMuted};

	it('reads in Settings and the onboarding, on the veil', () => {
		for (const ground of GROUNDS[kind]) {
			const behind = stack(ground, colors.screenDim);
			for (const name in texts) {
				const text = texts[name as keyof typeof texts];
				expect(ratio(text, behind), `${name} on ${ground}`).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	it('reads on a surface and the open tab (muted text is never drawn there)', () => {
		for (const ground of GROUNDS[kind])
			for (const surface of [colors.surface, colors.tabOpen]) {
				const behind = stack(ground, colors.screenDim, surface);
				expect(ratio(colors.textPrimary, behind), `on ${ground} ${surface}`).toBeGreaterThanOrEqual(4.5);
				expect(ratio(colors.textSecondary, behind), `on ${ground} ${surface}`).toBeGreaterThanOrEqual(4.5);
			}
	});

	it('reads on Home where the light theme has no veil', () => {
		if (kind === 'dark') return; // the dark themes' Home is measured on its backgrounds (ADR 0011–0013)
		for (const ground of GROUNDS.light)
			for (const name in texts) {
				const text = texts[name as keyof typeof texts];
				expect(ratio(text, parseColor(ground)), `${name} on ${ground}`).toBeGreaterThanOrEqual(4.5);
			}
	});

	it('reads on what has focus', () => {
		const fill = parseColor(colors.focusFill);
		expect(ratio(colors.focusText, fill)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(stack(colors.focusFill, colors.focusTextSoft), fill)).toBeGreaterThanOrEqual(4.5);
	});

	it('reads in the menus and toasts, errors included', () => {
		for (const ground of GROUNDS[kind]) {
			const menu = stack(ground, colors.glassMenu);
			expect(ratio(colors.textPrimary, menu)).toBeGreaterThanOrEqual(4.5);
			expect(ratio(colors.textSecondary, menu)).toBeGreaterThanOrEqual(4.5);
			expect(ratio(colors.danger, menu), `danger on ${ground}`).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('sets every accent apart from its surfaces', () => {
		const ground = parseColor(colors.accentGround);
		for (const accent in ACCENT_COLOR) {
			const shade = ACCENT_COLOR[accent as keyof typeof ACCENT_COLOR][kind];
			expect(ratio(shade, ground), accent).toBeGreaterThanOrEqual(4.5);
			// a switch that is on: its knob (focusText) on the accent
			expect(ratio(colors.focusText, parseColor(shade)), `${accent} knob`).toBeGreaterThanOrEqual(3);
		}
	});

	it('measures the accent on the lightest (light theme: darkest) row or button it is drawn on', () => {
		const ground = luminance(parseColor(colors.accentGround));
		for (const background of GROUNDS[kind]) {
			const behind = luminance(stack(background, colors.screenDim, colors.surface));
			if (kind === 'dark') expect(behind, background).toBeLessThanOrEqual(ground);
			else expect(behind, background).toBeGreaterThanOrEqual(ground);
		}
	});
});
