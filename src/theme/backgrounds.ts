// The backgrounds fluid offers: the colours, drawn from the tokens, and the photos that
// come with it.

import {type Photo, photosFrom} from '../lib/backgrounds';
import type {BackgroundColor} from '../state/settings';
import {COLOR} from './tokens';

const glow = (inner: string, mid: string, outer: string) =>
	`radial-gradient(ellipse 70% 60% at 50% 42%, ${inner} 0%, ${mid} 55%, ${outer} 100%)`;

/** The evening sky, sized in percent so that its tile in Settings looks like the screen. */
const dusk = [
	`linear-gradient(to right, ${COLOR.duskShade} 0%, ${COLOR.duskShade} 25%, ${COLOR.duskShadeEdge} 42%)`,
	`radial-gradient(57% 39% at 64% 67%, ${COLOR.duskGlow}, ${COLOR.duskGlowEdge} 70%)`,
	`radial-gradient(47% 35% at 84% 64%, ${COLOR.duskBloom}, ${COLOR.duskBloomEdge} 70%)`,
	`linear-gradient(to bottom, ${COLOR.duskSkyTop} 0%, ${COLOR.duskSkyHigh} 36%, ${COLOR.duskSkyMid} 52%, ${COLOR.duskSkyLow} 62%, ${COLOR.duskHorizon} 66%, ${COLOR.duskSeaTop} 67.5%, ${COLOR.duskSeaMid} 80%, ${COLOR.duskSeaBottom} 100%)`
].join(', ');

/** Each colour as a CSS background, for the screen and for its tile in Settings. */
export const COLOR_BACKGROUNDS: Record<BackgroundColor, string> = {
	dark: glow(COLOR.bgGradientInner, COLOR.bgGradientMid, COLOR.bgGradientOuter),
	black: COLOR.bg,
	blue: glow(COLOR.bgBlueInner, COLOR.bgBlueMid, COLOR.bgBlueOuter),
	dusk
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
