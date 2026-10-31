// What the Home key opens. The work is done on the TV by public/home-hook.sh, as root and also
// without fluid, so its state is kept there and not among the settings: the script knows when it
// has turned itself off, and fluid may be reinstalled meanwhile.

import {PlatformError} from '../errors';
import {HOME_KEY_STATES, type HomeKey} from '../types';
import {homeHook, markFluidAlive} from './shell';

/** The script waits to hear that fluid is up each time it opens fluid, and otherwise opens LG Home.
 *  So fluid says it at the start and whenever it comes to the front, whatever it knows of the
 *  script (which ignores it while not in use). A failure is not reported: it counts as fluid not
 *  coming up, which is what the script is there to handle. */
export function sayAliveFromNowOn(): void {
	const sayAlive = () => {
		if (!document.hidden) markFluidAlive().catch(() => undefined);
	};
	sayAlive();
	document.addEventListener('webOSRelaunch', sayAlive);
	document.addEventListener('visibilitychange', sayAlive);
}

/** What the script says, one word per line. Anything else means that it failed: the reason is in
 *  its log. */
function homeKeyFrom(out: string): HomeKey {
	const [word, input] = out.trim().split(/\s+/);
	const state = HOME_KEY_STATES.find((s) => s === word);
	if (!state) throw new PlatformError('rejected', `The Home key's script says: ${word}`);
	return {state, isInput: input === 'yes'};
}

export function getHomeKey(): Promise<HomeKey> {
	return homeHook('status').then(homeKeyFrom);
}

export function setHomeKey(open: boolean): Promise<HomeKey> {
	return homeHook(open ? 'enable' : 'disable').then(homeKeyFrom);
}

export function setIsInput(isInput: boolean): Promise<HomeKey> {
	return homeHook(isInput ? 'input yes' : 'input no').then(homeKeyFrom);
}

export function acknowledgeHomeKey(): Promise<void> {
	return homeHook('ack').then(() => undefined);
}
