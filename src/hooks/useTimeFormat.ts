import {useEffect, useState} from 'preact/hooks';
import {DEFAULT_TIME_FORMAT, platform, type TimeFormat} from '../platform';

/** The TV's 12/24-hour setting, re-read whenever the app comes to the foreground
 *  (the user may have changed it in LG's settings meanwhile). */
export function useTimeFormat(): TimeFormat {
	const [format, setFormat] = useState<TimeFormat>(DEFAULT_TIME_FORMAT);
	useEffect(() => {
		const refresh = () => {
			platform.getTimeFormat().then(setFormat);
		};
		refresh();
		return platform.onForeground(refresh);
	}, []);
	return format;
}
