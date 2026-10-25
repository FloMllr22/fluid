import {dayMonth, t, weekday} from '../i18n';
import {timeParts} from '../lib/clock';
import type {TimeFormat} from '../platform';

export function Clock({now, format}: {now: Date; format: TimeFormat}) {
	const {time, period} = timeParts(now, format);
	return (
		<div class="clock">
			<div class="clock__line">{weekday(now)}</div>
			<div class="clock__line">{dayMonth(now)}</div>
			<div class="clock__time">
				{time}
				{period && <span class="clock__period">{t(period === 'am' ? 'clock.am' : 'clock.pm')}</span>}
			</div>
		</div>
	);
}
