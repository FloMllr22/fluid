// Magic Remote pointer and app lifecycle.
//
// The pointer is drawn by the TV's compositor, not the page, so CSS `cursor: none` has
// no effect. webOS gives web apps `webOSSystem.setCursorHidden()` for this: it hides the
// pointer the same way pressing an arrow key does, and the system shows it again when
// the user shakes or moves the remote. So hiding on launch/foreground doesn't stop the
// user switching back to pointer mode.

import {systemObject} from './system-object';

/** Hide the pointer now. No-op on firmware without the API. */
export function hidePointer(): void {
	const sys = systemObject();
	if (!sys || typeof sys.setCursorHidden !== 'function') return;
	try {
		sys.setCursorHidden(true);
	} catch {
		/* cosmetic: the pointer just stays visible until the user presses an arrow key */
	}
}

/** Coming back from the background fires both events below; they count as one return. */
const SAME_RETURN_MS = 1000;

/** Calls back whenever fluid comes to the foreground: the page becomes visible again, or
 *  webOS relaunches the running app (e.g. from a remapped HOME button). Returns a
 *  function that stops it. */
export function onForeground(callback: () => void): () => void {
	let last = Number.NEGATIVE_INFINITY;
	const onVisible = () => {
		if (document.hidden) return;
		const now = Date.now();
		if (now - last < SAME_RETURN_MS) return;
		last = now;
		callback();
	};
	document.addEventListener('visibilitychange', onVisible);
	document.addEventListener('webOSRelaunch', onVisible);
	return () => {
		document.removeEventListener('visibilitychange', onVisible);
		document.removeEventListener('webOSRelaunch', onVisible);
	};
}

/** Whether the last launch came from the Home key, see public/home-hook.sh. */
function launchedByHomeKey(): boolean {
	const sys = systemObject();
	try {
		return JSON.parse(sys?.launchParams || '{}').homeKey === true;
	} catch {
		return false; // not from there, then
	}
}

/** Calls back when the Home key relaunches the running app, also when it is in front already.
 *  Each press comes in a relaunch of its own. Returns a function that stops it. */
export function onHomeKey(callback: () => void): () => void {
	const onRelaunch = () => {
		if (launchedByHomeKey()) callback();
	};
	document.addEventListener('webOSRelaunch', onRelaunch);
	return () => document.removeEventListener('webOSRelaunch', onRelaunch);
}

/** Calls back whenever fluid leaves the foreground: the page is hidden behind another app
 *  or input, or the screen goes off. Returns a function that stops it. */
export function onBackground(callback: () => void): () => void {
	const onHidden = () => {
		if (document.hidden) callback();
	};
	document.addEventListener('visibilitychange', onHidden);
	return () => document.removeEventListener('visibilitychange', onHidden);
}
