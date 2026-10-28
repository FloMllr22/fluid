import {describe, expect, it} from 'vitest';
import {
	contrast,
	dominantColor,
	fromHsl,
	luminance,
	over,
	parseColor,
	type Rgb,
	readableOn,
	stack,
	toHex,
	toHsl,
	withLuminance
} from './color';

const white: Rgb = {r: 255, g: 255, b: 255};
const black: Rgb = {r: 0, g: 0, b: 0};

/** RGBA pixels as a canvas gives them: `count` of each colour. */
function pixels(...parts: [Rgb, number, number?][]): number[] {
	const out: number[] = [];
	for (const [c, count, alpha = 255] of parts) for (let i = 0; i < count; i++) out.push(c.r, c.g, c.b, alpha);
	return out;
}

describe('parseColor', () => {
	it('reads the ways the tokens write colours', () => {
		expect(parseColor('#8FD0FF')).toEqual({r: 143, g: 208, b: 255, a: 1});
		expect(parseColor('#fff')).toEqual({r: 255, g: 255, b: 255, a: 1});
		expect(parseColor('rgba(6, 9, 22, 0.72)')).toEqual({r: 6, g: 9, b: 22, a: 0.72});
		expect(parseColor('rgb(1,2,3)')).toEqual({r: 1, g: 2, b: 3, a: 1});
	});

	it('refuses anything else', () => {
		expect(() => parseColor('transparent')).toThrow();
		expect(() => parseColor('#12345')).toThrow();
	});
});

describe('over and stack', () => {
	it('lay a see-through colour over another', () => {
		expect(over({r: 255, g: 255, b: 255, a: 0.5}, black)).toEqual({r: 127.5, g: 127.5, b: 127.5});
		expect(over({...white, a: 1}, black)).toEqual(white);
		expect(over({...white, a: 0}, black)).toEqual(black);
	});

	it('stacks layers from the lowest up', () => {
		expect(stack('#000000', 'rgba(255, 255, 255, 0.5)', 'rgba(0, 0, 0, 0.5)')).toEqual({
			r: 63.75,
			g: 63.75,
			b: 63.75
		});
	});
});

describe('contrast', () => {
	it('measures as WCAG 2 does', () => {
		expect(luminance(white)).toBeCloseTo(1);
		expect(luminance(black)).toBe(0);
		expect(contrast(white, black)).toBeCloseTo(21);
		expect(contrast(black, white)).toBeCloseTo(21);
		// #767676 on white is the well-known 4.54:1
		expect(contrast(parseColor('#767676'), white)).toBeCloseTo(4.54, 2);
	});
});

describe('hsl', () => {
	it('goes there and back', () => {
		for (const hex of ['#8fd0ff', '#e2553b', '#1f8a52', '#3d6be0', '#808080', '#000000', '#ffffff']) {
			const rgb = parseColor(hex);
			expect(toHex(fromHsl(toHsl(rgb))), hex).toBe(hex);
		}
	});

	it('reads hue, saturation and lightness', () => {
		expect(toHsl({r: 255, g: 0, b: 0})).toEqual({h: 0, s: 1, l: 0.5});
		expect(toHsl({r: 0, g: 0, b: 255}).h).toBeCloseTo(2 / 3);
		expect(toHsl({r: 128, g: 128, b: 128}).s).toBe(0);
	});
});

describe('dominantColor', () => {
	const red = {r: 226, g: 85, b: 59};
	const blue = {r: 61, g: 107, b: 224};

	it('finds the colour of a plain tile', () => {
		expect(toHex(dominantColor(pixels([red, 100])) as Rgb)).toBe('#e2553b');
	});

	it('ignores a white logo on it, and see-through corners', () => {
		const icon = pixels([red, 60], [white, 30], [blue, 10, 0]);
		expect(toHex(dominantColor(icon) as Rgb)).toBe('#e2553b');
	});

	it('takes the hue that covers most, not a mix of all', () => {
		const icon = pixels([red, 30], [blue, 70]);
		expect(toHex(dominantColor(icon) as Rgb)).toBe('#3d6be0');
	});

	it('finds none in an icon without colour', () => {
		expect(dominantColor(pixels([white, 50], [black, 50], [{r: 128, g: 128, b: 128}, 50]))).toBeNull();
		expect(dominantColor(pixels([white, 98], [red, 2]))).toBeNull();
		expect(dominantColor([])).toBeNull();
	});
});

describe('readableOn', () => {
	const dark = parseColor('#2a3042');
	const light = parseColor('#e3e6ea');

	it('lightens a colour on a dark ground until it reads', () => {
		const navy = {r: 20, g: 30, b: 120};
		const result = readableOn(navy, dark, 4.5, 0.5);
		expect(contrast(result, dark)).toBeGreaterThanOrEqual(4.5);
		expect(toHsl(result).h).toBeCloseTo(toHsl(navy).h, 1);
	});

	it('darkens a colour on a light ground until it reads', () => {
		const yellow = {r: 240, g: 180, b: 41};
		const result = readableOn(yellow, light, 4.5, 0.5);
		expect(contrast(result, light)).toBeGreaterThanOrEqual(4.5);
	});

	it('leaves a colour that reads already as it is, from its lightness on', () => {
		const ice = parseColor('#8fd0ff');
		expect(toHex(readableOn(ice, dark, 4.5, 0.5))).toBe('#8fd0ff');
	});
});

describe('withLuminance', () => {
	it('keeps the hue within the limit', () => {
		const yellow = {r: 255, g: 255, b: 0};
		const deep = withLuminance(yellow, 0.16, true, 0.6);
		expect(luminance(deep)).toBeLessThanOrEqual(0.16);
		expect(toHsl(deep).h).toBeCloseTo(toHsl(yellow).h, 1);
		const pale = withLuminance({r: 20, g: 30, b: 120}, 0.62, false, 0.6);
		expect(luminance(pale)).toBeGreaterThanOrEqual(0.62);
	});

	it('gives a grey a colour of its own', () => {
		expect(toHsl(withLuminance({r: 120, g: 110, b: 110}, 0.16, true, 0.6)).s).toBeGreaterThanOrEqual(0.59);
	});
});
