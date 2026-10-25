// The platform in a desktop browser (npm run dev) and in unit tests: neutral sample data,
// and launching only logs what would have been opened on the TV.

import {DEFAULT_TIME_FORMAT, type Platform} from '../types';
import {MOCK_APPS, MOCK_DEFAULT_APP_IDS, MOCK_INPUTS} from './data';

export function createMockPlatform(): Platform {
	return {
		kind: 'mock',
		defaultAppIds: MOCK_DEFAULT_APP_IDS,
		listApps: () => Promise.resolve({apps: MOCK_APPS.slice(), source: 'mock'}),
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
