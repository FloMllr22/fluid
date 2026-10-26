import {useEffect, useState} from 'preact/hooks';
import {TIMING} from '../config/constants';
import {slideOrder} from '../lib/backgrounds';
import {platform} from '../platform';

/** The photo a slideshow of `ids` shows now, while `active`: a new one every
 *  TIMING.slideshowMs, in a shuffled order that shows each photo once before any comes
 *  again. The timer stops while fluid is not in front and starts afresh when it is back. */
export function useSlideshow(ids: string[], active: boolean): string | undefined {
	const [shown, setShown] = useState<string | undefined>(undefined);
	const idsKey = ids.join('\n');

	useEffect(() => {
		if (!active || ids.length === 0) {
			setShown(undefined);
			return;
		}
		let order = slideOrder(ids, undefined);
		let current = order.shift();
		setShown(current);

		let timer = 0;
		const next = () => {
			if (order.length === 0) order = slideOrder(ids, current);
			current = order.shift();
			setShown(current);
			schedule();
		};
		const schedule = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(next, TIMING.slideshowMs);
		};
		schedule();
		const stopBackground = platform.onBackground(() => window.clearTimeout(timer));
		const stopForeground = platform.onForeground(schedule);
		return () => {
			window.clearTimeout(timer);
			stopBackground();
			stopForeground();
		};
	}, [idsKey, active]);

	return shown;
}
