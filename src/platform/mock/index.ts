// The platform in a desktop browser (npm run dev) and in unit tests: neutral sample data,
// and launching only logs what would have been opened on the TV.

import {PLATFORM_ERROR_CODES, PlatformError, type PlatformErrorCode} from '../errors';
import {DEFAULT_TIME_FORMAT, type Platform} from '../types';
import {MOCK_APPS, MOCK_INPUTS} from './data';

/** `npm run dev` with ?apps-error=<code> (no-homebrew, no-root, timeout …) makes the app
 *  list fail with that code, to see how fluid explains it: on a real TV that is hard to
 *  bring about. */
function appsErrorFromUrl(): PlatformErrorCode | undefined {
	if (typeof location === 'undefined') return undefined;
	const code = new URLSearchParams(location.search).get('apps-error');
	return PLATFORM_ERROR_CODES.find((c) => c === code);
}

export function createMockPlatform(): Platform {
	return {
		kind: 'mock',
		listApps: () => {
			const code = appsErrorFromUrl();
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
		}
	};
}
