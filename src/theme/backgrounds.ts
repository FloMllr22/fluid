// The backgrounds fluid offers: the colours, drawn from the tokens, and the photos that
// come with it.

import {type Photo, photosFrom} from '../lib/backgrounds';
import type {BackgroundColor} from '../state/settings';
import {COLOR} from './tokens';

const glow = (inner: string, mid: string, outer: string) =>
	`radial-gradient(ellipse 70% 60% at 50% 42%, ${inner} 0%, ${mid} 55%, ${outer} 100%)`;

/** Each colour as a CSS background, for the screen and for its tile in Settings. */
export const COLOR_BACKGROUNDS: Record<BackgroundColor, string> = {
	dark: glow(COLOR.bgGradientInner, COLOR.bgGradientMid, COLOR.bgGradientOuter),
	black: COLOR.bg,
	blue: glow(COLOR.bgBlueInner, COLOR.bgBlueMid, COLOR.bgBlueOuter)
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
