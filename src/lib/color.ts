// Colours as numbers, so they can be checked and derived without drawing anything: CSS
// colours read, laid over one another as the screen does, their contrast as WCAG 2
// measures it, and the main colour of an app's icon.

/** A colour, each channel 0–255. */
export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/** A colour with its opacity, 0–1. */
export interface Rgba extends Rgb {
	a: number;
}

/** A colour by hue (0–1, once round), saturation and lightness (each 0–1). */
export interface Hsl {
	h: number;
	s: number;
	l: number;
}

/** Reads "#rgb", "#rrggbb", "rgb(r, g, b)" or "rgba(r, g, b, a)"; anything else is an error,
 *  since the colours read are fluid's own tokens. */
export function parseColor(css: string): Rgba {
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim());
	if (hex) {
		const digits = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];
		const n = parseInt(digits, 16);
		return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1};
	}
	const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(css.trim());
	if (fn) return {r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: fn[4] === undefined ? 1 : Number(fn[4])};
	throw new Error(`not a colour: ${css}`);
}

/** `top` laid over the opaque `below`. */
export function over(top: Rgba, below: Rgb): Rgb {
	const mix = (a: number, b: number) => a * top.a + b * (1 - top.a);
	return {r: mix(top.r, below.r), g: mix(top.g, below.g), b: mix(top.b, below.b)};
}

/** Several colours laid over `ground` in turn, the first lowest. */
export function stack(ground: string, ...layers: string[]): Rgb {
	return layers.reduce<Rgb>((below, layer) => over(parseColor(layer), below), parseColor(ground));
}

/** The relative luminance (WCAG 2): 0 for black, 1 for white. */
export function luminance({r, g, b}: Rgb): number {
	const linear = (channel: number) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The contrast ratio (WCAG 2) between two colours: 1 to 21. AA asks 4.5 for text, 3 for
 *  large text and for the edges of controls. */
export function contrast(a: Rgb, b: Rgb): number {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function toHex({r, g, b}: Rgb): string {
	const part = (c: number) => {
		const s = Math.round(Math.max(0, Math.min(255, c))).toString(16);
		return s.length === 1 ? `0${s}` : s;
	};
	return `#${part(r)}${part(g)}${part(b)}`;
}

export function toHsl({r, g, b}: Rgb): Hsl {
	const rr = r / 255;
	const gg = g / 255;
	const bb = b / 255;
	const max = Math.max(rr, gg, bb);
	const min = Math.min(rr, gg, bb);
	const l = (max + min) / 2;
	const d = max - min;
	if (d === 0) return {h: 0, s: 0, l};
	const s = d / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
	else if (max === gg) h = ((bb - rr) / d + 2) / 6;
	else h = ((rr - gg) / d + 4) / 6;
	return {h, s: Math.min(1, s), l};
}

export function fromHsl({h, s, l}: Hsl): Rgb {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
	const m = l - c / 2;
	const sector = Math.floor(h * 6) % 6;
	const [r, g, b] = [
		[c, x, 0],
		[x, c, 0],
		[0, c, x],
		[0, x, c],
		[x, 0, c],
		[c, 0, x]
	][sector];
	return {r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255};
}

/** The hues an icon is sorted into: as many as tell its main colour from the others. */
const HUES = 24;

/** How much of an icon its main colour must cover, counted by how colourful its pixels
 *  are: less is a detail, not the icon's colour. */
const MIN_SHARE = 0.05;

/** The main colour of an icon from its pixels (RGBA, 4 bytes each, as a canvas gives
 *  them): the hue that covers most of it, by how colourful each pixel is, as the average of
 *  its pixels. White, black, grey and see-through pixels do not count (a white logo on a
 *  red tile is red). null for an icon with hardly any colour. */
export function dominantColor(pixels: ArrayLike<number>): Rgb | null {
	const weight: number[] = [];
	const sum: Rgb[] = [];
	for (let i = 0; i < HUES; i++) {
		weight.push(0);
		sum.push({r: 0, g: 0, b: 0});
	}
	let total = 0;
	for (let i = 0; i + 3 < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		total++;
		const rgb = {r: pixels[i], g: pixels[i + 1], b: pixels[i + 2]};
		const {h, s, l} = toHsl(rgb);
		// how colourful it looks: saturation counts little near white and black
		const w = s * (1 - Math.abs(2 * l - 1));
		if (w < 0.15) continue;
		const bin = Math.floor(h * HUES) % HUES;
		weight[bin] += w;
		sum[bin].r += rgb.r * w;
		sum[bin].g += rgb.g * w;
		sum[bin].b += rgb.b * w;
	}
	let best = 0;
	for (let i = 1; i < HUES; i++) if (weight[i] > weight[best]) best = i;
	if (total === 0 || weight[best] < MIN_SHARE * total) return null;
	const w = weight[best];
	return {r: sum[best].r / w, g: sum[best].g / w, b: sum[best].b / w};
}

/** `color` as light or dark as it must be for `ratio` against `ground`, keeping its hue:
 *  lighter on a dark ground, darker on a light one, starting no closer to the ground than
 *  `from` (a lightness). The furthest it gets if the ratio cannot be reached. */
export function readableOn(color: Rgb, ground: Rgb, ratio: number, from: number): Rgb {
	const hsl = toHsl(color);
	const lighten = luminance(ground) < 0.5;
	let l = lighten ? Math.max(hsl.l, from) : Math.min(hsl.l, from);
	let rgb = fromHsl({...hsl, l});
	while (contrast(rgb, ground) < ratio && (lighten ? l < 0.95 : l > 0.05)) {
		l += lighten ? 0.02 : -0.02;
		rgb = fromHsl({...hsl, l});
	}
	return rgb;
}

/** `color` with its hue, at least `minSaturation`, as light as it gets without passing the
 *  luminance `limit`: at most (`below`) or at least (otherwise). */
export function withLuminance(color: Rgb, limit: number, below: boolean, minSaturation: number): Rgb {
	const hsl = toHsl(color);
	const s = Math.max(hsl.s, minSaturation);
	let l = below ? 0.6 : 0.4;
	let rgb = fromHsl({h: hsl.h, s, l});
	while (below ? luminance(rgb) > limit && l > 0.05 : luminance(rgb) < limit && l < 0.95) {
		l += below ? -0.02 : 0.02;
		rgb = fromHsl({h: hsl.h, s, l});
	}
	return rgb;
}
