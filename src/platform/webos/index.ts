// The platform on an LG webOS TV.

import type {Platform} from '../types';
import {listApps, uninstallApp} from './apps';
import {acknowledgeHomeKey, getHomeKey, sayAliveFromNowOn, setHomeKey, setStartsWithFluid} from './home-key';
import {listInputs} from './inputs';
import {listPicturePlaces, listPictures, pictureUrl, preparePictures} from './pictures';
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
		uninstallApp,
		launchLgHome,
		getHomeKey,
		setHomeKey,
		setStartsWithFluid,
		acknowledgeHomeKey,
		onHomeKey,
		getLocale,
		getTimeFormat,
		hidePointer,
		onForeground,
		onBackground,
		listPicturePlaces,
		listPictures,
		preparePictures,
		pictureUrl,
		searchPlaces,
		getWeather
	};
}
