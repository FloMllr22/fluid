import {useEffect, useState} from 'preact/hooks';
import {platform} from '../platform';

/** Whether fluid is in front, so that what moves on its own can stop meanwhile. Followed
 *  only while `active`; true otherwise. */
export function useInFront(active: boolean): boolean {
	const [inFront, setInFront] = useState(true);
	useEffect(() => {
		setInFront(true);
		if (!active) return;
		const stopBackground = platform.onBackground(() => setInFront(false));
		const stopForeground = platform.onForeground(() => setInFront(true));
		return () => {
			stopBackground();
			stopForeground();
		};
	}, [active]);
	return inFront;
}
