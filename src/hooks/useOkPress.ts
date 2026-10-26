import {useEffect, useRef} from 'preact/hooks';
import {KEY, TIMING} from '../config/constants';

interface Handlers {
	/** OK released before the hold threshold */
	onPress: () => void;
	/** OK held for TIMING.longPressMs (fires while still held; the release is then ignored) */
	onLongPress: () => void;
}

/** Whether OK is held right now, as far as the key events tell. */
let okHeld = false;
if (typeof window !== 'undefined') {
	const track = (held: boolean) => (e: KeyboardEvent) => {
		if (e.keyCode === KEY.enter) okHeld = held;
	};
	window.addEventListener('keydown', track(true), true);
	window.addEventListener('keyup', track(false), true);
	window.addEventListener('blur', () => {
		okHeld = false;
	});
}

/** Distinguishes a short OK press from a long one. Short presses act on key *up*, so a
 *  hold never triggers the short action first. A key-up without a matching key-down
 *  (e.g. the OK that opened this screen) is ignored. Auto-repeat key-downs are ignored.
 *  With `afterRelease`, for a view that may open by holding OK: if OK is held when it
 *  opens, OK only counts once it has been released (or another key pressed), since a
 *  remote that repeats a held key without marking the repeats would otherwise trigger the
 *  view at once. Opened by a short press or the pointer, OK counts straight away. */
export function useOkPress(handlers: Handlers, active = true, afterRelease = false): void {
	// Latest handlers in a ref, so a re-render mid-press doesn't reset the hold timer.
	const latest = useRef(handlers);
	latest.current = handlers;

	useEffect(() => {
		if (!active) return;
		let blocked = afterRelease && okHeld;
		let armed = false;
		let fired = false;
		let timer = 0;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.keyCode !== KEY.enter) {
				blocked = false;
				return;
			}
			e.preventDefault();
			if (blocked || armed || e.repeat) return;
			armed = true;
			fired = false;
			timer = window.setTimeout(() => {
				fired = true;
				latest.current.onLongPress();
			}, TIMING.longPressMs);
		};

		const onKeyUp = (e: KeyboardEvent) => {
			if (e.keyCode !== KEY.enter) return;
			e.preventDefault();
			blocked = false;
			if (!armed) return;
			window.clearTimeout(timer);
			armed = false;
			if (!fired) latest.current.onPress();
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		return () => {
			window.clearTimeout(timer);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	}, [active, afterRelease]);
}
