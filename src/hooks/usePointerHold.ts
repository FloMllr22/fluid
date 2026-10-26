import {useRef} from 'preact/hooks';
import {TIMING} from '../config/constants';

/** The mouse handlers of something the pointer can click or hold: a press held for
 *  TIMING.longPressMs is a long press, like holding OK, and the click that ends it then
 *  does nothing. Without `onLongPress` every click is a click. */
export function usePointerHold(onActivate?: () => void, onLongPress?: () => void) {
	const hold = useRef({timer: 0, fired: false});
	const end = () => window.clearTimeout(hold.current.timer);
	return {
		onMouseDown: () => {
			if (!onLongPress) return;
			hold.current.fired = false;
			hold.current.timer = window.setTimeout(() => {
				hold.current.fired = true;
				onLongPress();
			}, TIMING.longPressMs);
		},
		onMouseUp: end,
		onMouseLeave: end,
		onClick: () => {
			if (hold.current.fired) hold.current.fired = false;
			else if (onActivate) onActivate();
		}
	};
}
