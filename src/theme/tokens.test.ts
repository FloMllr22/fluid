// The colours keep their text readable: WCAG AA (4.5:1) for every text colour on what it
// is drawn on, measured on the plain backgrounds at their lightest point.

import {describe, expect, it} from 'vitest';
import {contrast, luminance, parseColor, type Rgb, stack} from '../lib/color';
import {ACCENT_COLOR, COLOR} from './tokens';

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

	it('read in the menus and toasts, errors included', () => {
		for (const ground of GROUNDS) {
			const menu = stack(ground, COLOR.glassMenu);
			expect(ratio(COLOR.textPrimary, menu)).toBeGreaterThanOrEqual(4.5);
			expect(ratio(COLOR.textSecondary, menu)).toBeGreaterThanOrEqual(4.5);
			expect(ratio(COLOR.danger, menu), `danger on ${ground}`).toBeGreaterThanOrEqual(4.5);
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
