// The one way into the device. Chosen at start: the TV when webOS's service bridge is
// there, otherwise the neutral browser mock. Everything outside src/platform/ imports
// from here, never from webos/ or mock/ directly (see src/architecture.test.ts).

import {createMockPlatform} from './mock';
import type {Platform} from './types';
import {createWebOSPlatform, isWebOS} from './webos';

export const platform: Platform = isWebOS() ? createWebOSPlatform() : createMockPlatform();

export {PlatformError, type PlatformErrorCode} from './errors';
export {
	type AppEntry,
	type AppList,
	type AppSource,
	DEFAULT_TIME_FORMAT,
	type InputSource,
	type Platform,
	type TimeFormat
} from './types';
