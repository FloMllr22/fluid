// The platform on an LG webOS TV.

import type {Platform} from '../types';
import {listApps} from './apps';
import {listInputs} from './inputs';
import {hidePointer, onForeground} from './pointer';
import {getLocale, getTimeFormat, launch, launchLgHome} from './system';

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
		onForeground
	};
}
