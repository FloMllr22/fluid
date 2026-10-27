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

/** The lights of the moving dusk, each as a layer of its own over DUSK_SKY, placed where
 *  they are in the still one; they move in the stylesheet (.background__light). */
export const DUSK_LIGHTS = [
	{name: 'bloom', light: DUSK_BLOOM, color: COLOR.duskBloom, edge: COLOR.duskBloomEdge},
	{name: 'glow', light: DUSK_GLOW, color: COLOR.duskGlow, edge: COLOR.duskGlowEdge}
].map(({name, light, color, edge}) => {
	const {left, top, width, height} = lightLayer(light);
	return {
		name,
		style: {
			left: `${left}%`,
			top: `${top}%`,
			width: `${width}%`,
			height: `${height}%`,
			background: `radial-gradient(closest-side, ${color}, ${edge})`
		}
	};
});

/** Each colour as a CSS background, for the screen and for its tile in Settings. The
 *  tile of the moving dusk shows it still; on the screen it is DUSK_SKY with DUSK_LIGHTS. */
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
