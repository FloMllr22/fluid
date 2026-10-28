// The backgrounds fluid offers: the colours, drawn from the tokens, and the photos that
// come with it.

import {type Light, lightLayer, type Photo, photosFrom} from '../lib/backgrounds';
import type {BackgroundColor} from '../state/settings';
import {COLOR} from './tokens';

const glow = (inner: string, mid: string, outer: string) =>
	`radial-gradient(ellipse 70% 60% at 50% 42%, ${inner} 0%, ${mid} 55%, ${outer} 100%)`;

/** The lights of the evening sky: a warm glow and a pink bloom on the horizon. */
const DUSK_GLOW: Light = {x: 64, y: 67, rx: 57, ry: 39};
const DUSK_BLOOM: Light = {x: 84, y: 64, rx: 47, ry: 35};
const light = ({x, y, rx, ry}: Light, color: string, edge: string) =>
	`radial-gradient(${rx}% ${ry}% at ${x}% ${y}%, ${color}, ${edge} 70%)`;

/** The evening sky without its lights: from the top down to the bright horizon, the sea
 *  below it. */
export const DUSK_SKY = `linear-gradient(to bottom, ${COLOR.duskSkyTop} 0%, ${COLOR.duskSkyHigh} 36%, ${COLOR.duskSkyMid} 52%, ${COLOR.duskSkyLow} 62%, ${COLOR.duskHorizon} 66%, ${COLOR.duskSeaTop} 67.5%, ${COLOR.duskSeaMid} 80%, ${COLOR.duskSeaBottom} 100%)`;

/** The evening sky, sized in percent so that its tile in Settings looks like the screen. */
const dusk = [
	light(DUSK_GLOW, COLOR.duskGlow, COLOR.duskGlowEdge),
	light(DUSK_BLOOM, COLOR.duskBloom, COLOR.duskBloomEdge),
	DUSK_SKY
].join(', ');

/** A layer of the moving dusk: where it is, in % of the screen, and what is on it. One that
 *  `wraps` is twice the screen's width and shows its background twice, side by side, so
 *  that it can drift on by a screen's width and start again without a seam. */
interface DuskLayer {
	name: string;
	box: {left: number; top: number; width: number; height: number};
	background: string;
	wraps?: boolean;
}

/** A light on a layer just large enough for it. */
const lightOnLayer = (name: string, light: Light, background: string): DuskLayer => ({
	name,
	box: lightLayer(light),
	background
});
const fade = (color: string, edge: string) => `radial-gradient(closest-side, ${color}, ${edge})`;

/** The bright band on the horizon, below the glow. */
const DUSK_BAND: Light = {x: 72, y: 66.2, rx: 24, ry: 3};

/** A star: a small dot of light, `r` px in radius, at x, y in % of its layer. */
const star = (x: number, y: number, r: number) =>
	`radial-gradient(${r}px ${r}px at ${x}% ${y}%, ${COLOR.duskStar}, ${COLOR.duskStar} 30%, ${COLOR.duskStarEdge})`;
/** The upper sky right of the app names, clear of the bar at the top right. */
const STARS_BOX = {left: 46, top: 3, width: 52, height: 38};

/** A gleam on the sea: a thin streak of light at x, y with radii rx, ry, in % of its
 *  layer. Those nearer the horizon are thinner, as further away. */
const gleam = (x: number, y: number, rx: number, ry: number) =>
	`radial-gradient(${rx}% ${ry}% at ${x}% ${y}%, ${COLOR.duskGleam}, ${COLOR.duskGleamEdge})`;
/** The sea below the band, above the greeting. */
const SEA_BOX = {left: 50, top: 68.5, width: 46, height: 12};

/** A shooting star: a thin streak, its bright head at the right end, which its keyframes
 *  turn and send across the sky. */
const METEOR = `radial-gradient(100% 50% at 100% 50%, ${COLOR.duskStar}, ${COLOR.duskStarEdge})`;
const METEOR_SIZE = {width: 13, height: 0.6};

/** A soft puff of a cloud at x, y with radii rx, ry, in % of its tile. */
const puff = (x: number, y: number, rx: number, ry: number, color: string, edge: string) =>
	`radial-gradient(${rx}% ${ry}% at ${x}% ${y}%, ${color}, ${color} 25%, ${edge})`;
interface CloudTone {
	body: string;
	bodyEdge: string;
	lit: string;
	litEdge: string;
}
/** A cloud centred at x, y, `w` wide and `h` high, in % of its tile: a flat base with
 *  three billows on it, the lower half lit by the sun below the horizon. */
const cloud = (x: number, y: number, w: number, h: number, tone: CloudTone) => [
	puff(x, y + 0.2 * h, 0.42 * w, 0.16 * h, tone.lit, tone.litEdge),
	puff(x - 0.28 * w, y + 0.05 * h, 0.22 * w, 0.3 * h, tone.body, tone.bodyEdge),
	puff(x - 0.05 * w, y - 0.1 * h, 0.26 * w, 0.42 * h, tone.body, tone.bodyEdge),
	puff(x + 0.22 * w, y, 0.24 * w, 0.34 * h, tone.body, tone.bodyEdge),
	puff(x, y + 0.12 * h, 0.5 * w, 0.26 * h, tone.body, tone.bodyEdge)
];
/** A long, flat cloud low over the horizon, dark against the bright sky, its lower rim lit. */
const streak = (x: number, y: number, w: number, h: number, tone: CloudTone) => [
	puff(x + 0.05 * w, y + 0.16 * h, 0.38 * w, 0.16 * h, tone.lit, tone.litEdge),
	puff(x + 0.18 * w, y - 0.12 * h, 0.3 * w, 0.3 * h, tone.body, tone.bodyEdge),
	puff(x, y, 0.5 * w, 0.4 * h, tone.body, tone.bodyEdge)
];
const NEAR: CloudTone = {
	body: COLOR.duskCloud,
	bodyEdge: COLOR.duskCloudEdge,
	lit: COLOR.duskCloudLit,
	litEdge: COLOR.duskCloudLitEdge
};
const FAR: CloudTone = {
	body: COLOR.duskCloudFar,
	bodyEdge: COLOR.duskCloudFarEdge,
	lit: COLOR.duskCloudLit,
	litEdge: COLOR.duskCloudLitEdge
};
/** Clouds as one background, the first on top. */
const together = (clouds: string[][]) => ([] as string[]).concat(...clouds).join(', ');
/** A crest on the sea: a thin streak of light, in % of its tile. */
const crest = (x: number, y: number, rx: number, ry: number) =>
	`radial-gradient(${rx}% ${ry}% at ${x}% ${y}%, ${COLOR.duskWave}, ${COLOR.duskWaveEdge})`;

/** The moving dusk: DUSK_SKY with, from the back, two sets of first stars twinkling in
 *  turn, two shooting stars, the pink bloom and the warm glow drifting and breathing, the
 *  bright band gliding along the horizon, two banks of clouds drifting across the sky at
 *  two speeds, crests on the sea drifting with them, and two sets of gleams below the
 *  light flickering in turn. Each is a layer of its own that only moves and fades
 *  (.background__light), so the TV never draws it anew. The clouds and crests pass behind
 *  the app names, the first dark, the others faint, so that the names stay readable. */
export const DUSK_LAYERS = [
	{
		name: 'stars',
		box: STARS_BOX,
		background: [star(8, 30, 2.8), star(22, 12, 2.2), star(35, 48, 3.2), star(48, 22, 2.4), star(66, 40, 2.6)]
			.concat([star(83, 58, 2.3), star(97, 34, 3)])
			.join(', ')
	},
	{
		name: 'stars-alt',
		box: STARS_BOX,
		background: [star(15, 62, 2.4), star(28, 30, 3), star(44, 70, 2.2), star(54, 6, 2.6)]
			.concat([star(75, 72, 2.8), star(90, 84, 2.2)])
			.join(', ')
	},
	{name: 'meteor', box: {left: 62, top: 12, ...METEOR_SIZE}, background: METEOR},
	{name: 'meteor-alt', box: {left: 78, top: 24, ...METEOR_SIZE}, background: METEOR},
	lightOnLayer('bloom', DUSK_BLOOM, fade(COLOR.duskBloom, COLOR.duskBloomEdge)),
	lightOnLayer('glow', DUSK_GLOW, fade(COLOR.duskGlow, COLOR.duskGlowEdge)),
	lightOnLayer(
		'band',
		DUSK_BAND,
		`radial-gradient(35% 22% at 50% 50%, ${COLOR.duskBand}, ${COLOR.duskBandEdge}), ${fade(COLOR.duskBandHalo, COLOR.duskBandEdge)}`
	),
	{
		name: 'clouds-far',
		box: {left: 0, top: 46, width: 200, height: 16},
		wraps: true,
		background: together([streak(18, 50, 30, 36, FAR), streak(52, 66, 22, 30, FAR), streak(80, 40, 28, 34, FAR)])
	},
	{
		name: 'clouds',
		box: {left: 0, top: 22, width: 200, height: 30},
		wraps: true,
		background: together([
			cloud(13, 52, 24, 46, NEAR),
			cloud(40, 28, 18, 34, NEAR),
			cloud(63, 64, 30, 50, NEAR),
			cloud(87, 36, 20, 38, NEAR)
		])
	},
	{
		name: 'waves',
		box: {left: 0, top: 69, width: 200, height: 12},
		wraps: true,
		background: [crest(8, 10, 4, 4), crest(30, 16, 6, 4), crest(55, 8, 5, 3.5), crest(78, 20, 7, 4.5)]
			.concat([crest(18, 38, 8, 5), crest(46, 44, 7, 5), crest(70, 36, 9, 5.5), crest(92, 48, 5, 5)])
			.concat([crest(10, 70, 10, 6), crest(38, 78, 12, 6.5), crest(66, 66, 9, 6), crest(86, 84, 8, 7)])
			.join(', ')
	},
	{
		name: 'sea',
		box: SEA_BOX,
		background: [gleam(40, 10, 9, 4), gleam(62, 18, 7, 4), gleam(30, 35, 11, 5), gleam(55, 52, 13, 5.5)]
			.concat([gleam(45, 78, 15, 6)])
			.join(', ')
	},
	{
		name: 'sea-alt',
		box: SEA_BOX,
		background: [gleam(52, 6, 6, 3.5), gleam(35, 22, 8, 4), gleam(68, 40, 10, 5), gleam(40, 60, 12, 5.5)]
			.concat([gleam(60, 85, 14, 6)])
			.join(', ')
	}
].map((layer: DuskLayer) => ({
	name: layer.name,
	style: {
		left: `${layer.box.left}%`,
		top: `${layer.box.top}%`,
		width: `${layer.box.width}%`,
		height: `${layer.box.height}%`,
		backgroundImage: layer.background,
		backgroundSize: layer.wraps ? '50% 100%' : undefined
	}
}));

/** Each colour as a CSS background, for the screen and for its tile in Settings. The
 *  tile of the moving dusk shows it still; on the screen it is DUSK_SKY with DUSK_LAYERS. */
export const COLOR_BACKGROUNDS: Record<BackgroundColor, string> = {
	dark: glow(COLOR.bgGradientInner, COLOR.bgGradientMid, COLOR.bgGradientOuter),
	black: COLOR.bg,
	blue: glow(COLOR.bgBlueInner, COLOR.bgBlueMid, COLOR.bgBlueOuter),
	dusk,
	duskMoving: dusk
};

/** Every photo in src/assets/backgrounds/, found when building: `<id>.jpg` (1920×1080)
 *  and `<id>.thumb.jpg` (288×288). A new photo needs no code, only its name in each
 *  locale file (`background.photo.<id>`) and its source in THIRD_PARTY_NOTICES.md. */
export const PHOTOS: Photo[] = photosFrom(
	import.meta.glob<string>(['../assets/backgrounds/*.jpg', '!../assets/backgrounds/*.thumb.jpg'], {
		eager: true,
		query: '?url',
		import: 'default'
	}),
	import.meta.glob<string>('../assets/backgrounds/*.thumb.jpg', {eager: true, query: '?url', import: 'default'})
);
