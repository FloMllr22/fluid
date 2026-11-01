// The platform in a desktop browser (npm run dev) and in unit tests: neutral sample data,
// and launching only logs what would have been opened on the TV. It never goes online:
// places and weather are fixed sample data.

import {PLATFORM_ERROR_CODES, PlatformError, type PlatformErrorCode} from '../errors';
import {
	type AppEntry,
	DEFAULT_TIME_FORMAT,
	HOME_KEY_STATES,
	type HomeKey,
	type HomeKeyState,
	PLACE_QUERY_MIN_LENGTH,
	PLACE_SEARCH_LIMIT,
	type Platform,
	type StartState,
	type Weather
} from '../types';
import {
	MOCK_APPS,
	MOCK_INPUTS,
	MOCK_PICTURE_FOLDERS,
	MOCK_PICTURES_INTERNAL,
	MOCK_PICTURES_USB,
	MOCK_PLACES,
	MOCK_WEATHER,
	mockPictureUrl
} from './data';

/** A parameter from the page address, e.g. `?lang=de`; null outside a browser. */
function urlParam(name: string): string | null {
	return typeof location === 'undefined' ? null : new URLSearchParams(location.search).get(name);
}

/** `npm run dev` with ?apps-error=<code> (no-homebrew, no-root, timeout …) makes the app
 *  list fail with that code, ?weather-error=<code> (offline, service …) the place search
 *  and the weather, to see how fluid explains it: on a real TV that is hard to bring
 *  about. */
function errorFromUrl(name: 'apps-error' | 'weather-error'): PlatformErrorCode | undefined {
	const code = urlParam(name);
	return PLATFORM_ERROR_CODES.find((c) => c === code);
}

/** The sample apps; ?apps=<count> lists that many, the samples again and again with a
 *  number, to see a long list (a TV with many apps). */
function appsFromUrl(): AppEntry[] {
	const count = Number(urlParam('apps'));
	if (!Number.isInteger(count) || count <= MOCK_APPS.length) return MOCK_APPS.slice();
	const apps: AppEntry[] = [];
	for (let i = 0; i < count; i++) {
		const sample = MOCK_APPS[i % MOCK_APPS.length];
		const round = Math.floor(i / MOCK_APPS.length);
		apps.push(
			round === 0 ? sample : {...sample, id: `${sample.id}${round + 1}`, title: `${sample.title} ${round + 1}`}
		);
	}
	return apps;
}

/** The sample weather; ?weather-code=<WMO code> and ?weather-night=1 show other skies. */
function weatherFromUrl(): Weather {
	const code = Number(urlParam('weather-code') || Number.NaN);
	return {
		temperature: MOCK_WEATHER.temperature,
		code: Number.isInteger(code) ? code : MOCK_WEATHER.code,
		isDay: urlParam('weather-night') === null ? MOCK_WEATHER.isDay : false
	};
}

/** ?home-key=<state> (on, gave-up, unsupported) starts with the Home key so; ?home-key=failed
 *  makes changing it fail, to see how fluid explains it. */
function homeKeyFromUrl(): HomeKeyState {
	return HOME_KEY_STATES.find((state) => state === urlParam('home-key')) || 'off';
}

export function createMockPlatform(): Platform {
	const uninstalled: string[] = [];
	let homeKey = homeKeyFromUrl();
	let start: StartState = 'no';
	const homeKeyNow = (): Promise<HomeKey> => Promise.resolve({state: homeKey, start});
	const failing = () =>
		urlParam('home-key') === 'failed'
			? Promise.reject(new PlatformError('rejected', '[mock] could not change the Home key'))
			: undefined;
	return {
		kind: 'mock',
		listApps: () => {
			const code = errorFromUrl('apps-error');
			if (code) return Promise.reject(new PlatformError(code, `[mock] app list failed: ${code}`));
			const apps = appsFromUrl().filter((app) => uninstalled.indexOf(app.id) === -1);
			return Promise.resolve({apps, failedIcons: 0});
		},
		// listing them takes no time here
		cachedApps: () => undefined,
		listInputs: () => Promise.resolve(MOCK_INPUTS.slice()),
		launch: (appId) => {
			console.info(`[mock] would launch ${appId}`);
			return Promise.resolve();
		},
		// ?uninstall-error=1 makes it fail, to see how fluid explains it
		uninstallApp: (appId) => {
			if (urlParam('uninstall-error') !== null) {
				return Promise.reject(new PlatformError('rejected', `[mock] could not uninstall ${appId}`));
			}
			uninstalled.push(appId);
			return Promise.resolve();
		},
		launchLgHome: () => {
			console.info('[mock] would open LG Home');
			return Promise.resolve();
		},
		getHomeKey: homeKeyNow,
		setHomeKey: (open) => {
			if (homeKey !== 'unsupported' && !failing()) {
				homeKey = open ? 'on' : 'off';
				start = open ? 'yes' : 'no';
			}
			return failing() || homeKeyNow();
		},
		setStartsWithFluid: (next) => {
			if (!failing()) start = next ? 'yes' : 'no';
			return failing() || homeKeyNow();
		},
		acknowledgeHomeKey: () => {
			homeKey = 'off';
			return Promise.resolve();
		},
		// a browser has no Home key
		onHomeKey: () => () => {},
		// the browser's language; ?lang=de (or en-US …) picks another
		getLocale: () => urlParam('lang') || (typeof navigator === 'undefined' ? '' : navigator.language) || 'en',
		getTimeFormat: () => Promise.resolve(DEFAULT_TIME_FORMAT),
		hidePointer: () => {
			/* a desktop browser has no Magic Remote pointer */
		},
		onForeground: (callback) => {
			if (typeof document === 'undefined') return () => {};
			const onVisible = () => {
				if (!document.hidden) callback();
			};
			document.addEventListener('visibilitychange', onVisible);
			return () => document.removeEventListener('visibilitychange', onVisible);
		},
		// another browser tab, or the window minimised
		onBackground: (callback) => {
			if (typeof document === 'undefined') return () => {};
			const onHidden = () => {
				if (document.hidden) callback();
			};
			document.addEventListener('visibilitychange', onHidden);
			return () => document.removeEventListener('visibilitychange', onHidden);
		},
		// ?pictures-error=<code> makes it fail, to see how fluid explains it
		listPicturePlaces: () => {
			const code = PLATFORM_ERROR_CODES.find((c) => c === urlParam('pictures-error'));
			if (code) return Promise.reject(new PlatformError(code, `[mock] no pictures: ${code}`));
			return Promise.resolve([
				{kind: 'internal', path: MOCK_PICTURES_INTERNAL},
				{kind: 'usb', path: MOCK_PICTURES_USB}
			]);
		},
		listPictures: (path) => Promise.resolve(MOCK_PICTURE_FOLDERS[path] || {folders: [], pictures: [], tooLarge: 0}),
		preparePictures: () => Promise.resolve(),
		pictureUrl: mockPictureUrl,
		searchPlaces: (query) => {
			const code = errorFromUrl('weather-error');
			if (code) return Promise.reject(new PlatformError(code, `[mock] place search failed: ${code}`));
			const name = query.trim().toLowerCase();
			if (name.length < PLACE_QUERY_MIN_LENGTH) return Promise.resolve([]);
			const found = MOCK_PLACES.filter((place) => place.name.toLowerCase().indexOf(name) === 0);
			return Promise.resolve(found.slice(0, PLACE_SEARCH_LIMIT).map((place) => ({...place})));
		},
		getWeather: () => {
			const code = errorFromUrl('weather-error');
			if (code) return Promise.reject(new PlatformError(code, `[mock] weather failed: ${code}`));
			return Promise.resolve(weatherFromUrl());
		}
	};
}
