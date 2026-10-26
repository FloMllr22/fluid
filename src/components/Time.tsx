import {t} from '../i18n';
import {timeParts} from '../lib/clock';
import type {TimeFormat} from '../platform';

/** The time as the TV shows it: "15:42", or "3:42 PM" in 12-hour format. */
export function timeText(now: Date, format: TimeFormat): string {
	const {time, period} = timeParts(now, format);
	return period ? t('clock.withPeriod', {time, period: t(period === 'am' ? 'clock.am' : 'clock.pm')}) : time;
}
