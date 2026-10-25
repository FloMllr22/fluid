// Magic Remote pointer and app lifecycle.
//
// The pointer is drawn by the TV's compositor, not the page, so CSS `cursor: none` has
// no effect. webOS gives web apps `webOSSystem.setCursorHidden()` for this: it hides the
// pointer the same way pressing an arrow key does, and the system shows it again when
// the user shakes or moves the remote. So hiding on launch/foreground doesn't stop the
// user switching back to pointer mode.

interface WebOSSystemCursor {
	setCursorHidden?(hidden: boolean): void;
}

declare global {
	interface Window {
		webOSSystem?: WebOSSystemCursor;
		PalmSystem?: WebOSSystemCursor;
	}
}

/** Hide the pointer now. No-op on firmware without the API. */
export function hidePointer(): void {
	const sys = window.webOSSystem || window.PalmSystem;
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
