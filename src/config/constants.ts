// App-wide constants that are not visual tokens (see theme/tokens.ts for those).

import appInfo from '../../public/appinfo.json';

/** fluid's own app ID, read from appinfo.json. It never changes: settings stored on the TV,
 *  the Homebrew repository entry and remote-button mappings depend on it. */
export const APP_ID: string = appInfo.id;

/** Remote-control key codes as delivered to a webOS web app. */
export const KEY = {
	left: 37,
	up: 38,
	right: 39,
	down: 40,
	enter: 13,
	back: 461, // webOS "BACK" (needs disableBackHistoryAPI in appinfo.json)
	escape: 27 // handy when developing in a desktop browser
} as const;

export const TIMING = {
	toastMs: 2200,
	clockTickMs: 1000,
	longPressMs: 600, // OK held this long enters/leaves re-order mode
	slideshowMs: 5 * 60 * 1000, // the background slideshow shows the next photo
	weatherRefreshMs: 30 * 60 * 1000, // the weather is read again (Open-Meteo updates it every 15 minutes)
	weatherRetryMs: 5 * 60 * 1000, // after reading the weather failed
	weatherMaxAgeMs: 3 * 60 * 60 * 1000 // older weather is not shown when reading it again fails
} as const;
