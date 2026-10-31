// The platform on an LG webOS TV.

import type {Platform} from '../types';
import {listApps} from './apps';
import {acknowledgeHomeKey, getHomeKey, sayAliveFromNowOn, setHomeKey, setIsInput} from './home-key';
import {listInputs} from './inputs';
import {hidePointer, onBackground, onForeground, onHomeKey} from './pointer';
import {getLocale, getTimeFormat, launch, launchLgHome} from './system';
import {getWeather, searchPlaces} from './weather';

export {isWebOS} from './luna';

export function createWebOSPlatform(): Platform {
	sayAliveFromNowOn();
	return {
		kind: 'webos',
		listApps,
		listInputs,
		launch,
		launchLgHome,
		getHomeKey,
		setHomeKey,
		setIsInput,
		acknowledgeHomeKey,
		onHomeKey,
		getLocale,
		getTimeFormat,
		hidePointer,
		onForeground,
		onBackground,
		searchPlaces,
		getWeather
	};
}
