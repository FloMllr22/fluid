// The platform on an LG webOS TV.

import {DEFAULT_APP_IDS} from '../../config/catalog';
import type {Platform} from '../types';
import {listApps} from './apps';
import {listInputs} from './inputs';
import {hidePointer, onForeground} from './pointer';
import {getTimeFormat, launch, launchLgHome} from './system';

export {isWebOS} from './luna';

export function createWebOSPlatform(): Platform {
	return {
		kind: 'webos',
		defaultAppIds: DEFAULT_APP_IDS,
		listApps: ({useHomebrew}) => listApps(useHomebrew),
		listInputs,
		launch,
		launchLgHome,
		getTimeFormat,
		hidePointer,
		onForeground
	};
}
