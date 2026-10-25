// Launching apps and reading TV settings.

import {DEFAULT_TIME_FORMAT, type TimeFormat} from '../types';
import {LUNA, SYSTEM_APP} from './constants';
import {type LunaResponse, lunaCall} from './luna';
import {systemObject} from './system-object';

interface PreferencesResponse extends LunaResponse {
	timeFormat?: string; // "HH12" | "HH24"
}

/** Launch an app or switch to an input (HDMI inputs are apps too: com.webos.app.hdmiN). */
export function launch(appId: string): Promise<void> {
	return lunaCall(LUNA.launch, {id: appId, params: {}}).then(() => undefined);
}

/** Bring up LG's own home screen. */
export function launchLgHome(): Promise<void> {
	return launch(SYSTEM_APP.lgHome);
}

/** Whether an app with this ID exists on the TV (permitted from a web app, unlike listing).
 *  A failed check counts as "not there", so the app is simply not offered. */
export function appExists(appId: string): Promise<boolean> {
	return lunaCall<{exist?: boolean}>(LUNA.appLoadStatus, {appId})
		.then((r) => r.exist === true)
		.catch(() => false);
}

/** The TV's UI language (Settings → General → Language). The system object has it on
 *  every firmware; navigator.language agrees on webOS 6.5 and is the fallback. */
export function getLocale(): string {
	const sys = systemObject();
	return (sys && sys.locale) || navigator.language || 'en';
}

/** The TV's 12/24-hour setting (Settings → General → Time). webOSSystem.timeFormat is
 *  empty on some firmware, so the system service is asked instead. If it cannot answer,
 *  the clock shows the default format, which is harmless. */
export function getTimeFormat(): Promise<TimeFormat> {
	return lunaCall<PreferencesResponse>(LUNA.preferences, {keys: ['timeFormat']})
		.then((r): TimeFormat => (r.timeFormat === 'HH12' ? '12h' : r.timeFormat === 'HH24' ? '24h' : DEFAULT_TIME_FORMAT))
		.catch(() => DEFAULT_TIME_FORMAT);
}
