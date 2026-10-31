import {useEffect, useState} from 'preact/hooks';
import {TIMING} from '../config/constants';
import {useInFront} from './useInFront';

/** Current time, re-rendered once a second (only changes when the minute changes
 *  matter to the UI, but a 1s tick keeps the displayed minute exact). It stops while fluid
 *  is not in front, and is right again as soon as fluid is. Whoever uses it is drawn anew
 *  every second, so it belongs in a small component that shows the time. */
export function useClock(): Date {
	const [now, setNow] = useState(() => new Date());
	const inFront = useInFront(true);
	useEffect(() => {
		if (!inFront) return;
		setNow(new Date());
		const id = window.setInterval(() => setNow(new Date()), TIMING.clockTickMs);
		return () => window.clearInterval(id);
	}, [inFront]);
	return now;
}
