// The platform in a desktop browser (npm run dev) and in unit tests: neutral sample data,
// and launching only logs what would have been opened on the TV. It never goes online:
// places and weather are fixed sample data.

import {PLATFORM_ERROR_CODES, PlatformError, type PlatformErrorCode} from '../errors';
import {DEFAULT_TIME_FORMAT, PLACE_QUERY_MIN_LENGTH, PLACE_SEARCH_LIMIT, type Platform, type Weather} from '../types';
import {MOCK_APPS, MOCK_INPUTS, MOCK_PLACES, MOCK_WEATHER} from './data';

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

/** The sample weather; ?weather-code=<WMO code> and ?weather-night=1 show other skies. */
function weatherFromUrl(): Weather {
	const code = Number(urlParam('weather-code') || Number.NaN);
	return {
		temperature: MOCK_WEATHER.temperature,
		code: Number.isInteger(code) ? code : MOCK_WEATHER.code,
		isDay: urlParam('weather-night') === null ? MOCK_WEATHER.isDay : false
	};
}

export function createMockPlatform(): Platform {
	return {
		kind: 'mock',
		listApps: () => {
			const code = errorFromUrl('apps-error');
			if (code) return Promise.reject(new PlatformError(code, `[mock] app list failed: ${code}`));
			return Promise.resolve({apps: MOCK_APPS.slice(), failedIcons: 0});
		},
		listInputs: () => Promise.resolve(MOCK_INPUTS.slice()),
		launch: (appId) => {
			console.info(`[mock] would launch ${appId}`);
			return Promise.resolve();
		},
		launchLgHome: () => {
			console.info('[mock] would open LG Home');
			return Promise.resolve();
		},
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
