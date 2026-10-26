// The platform on an LG webOS TV.

import type {Platform} from '../types';
import {listApps} from './apps';
import {listInputs} from './inputs';
import {hidePointer, onBackground, onForeground} from './pointer';
import {getLocale, getTimeFormat, launch, launchLgHome} from './system';
import {getWeather, searchPlaces} from './weather';

export {isWebOS} from './luna';

export function createWebOSPlatform(): Platform {
	return {
		kind: 'webos',
		listApps,
		listInputs,
		launch,
		launchLgHome,
		getLocale,
		getTimeFormat,
		hidePointer,
		onForeground,
		onBackground,
		searchPlaces,
		getWeather
	};
}
