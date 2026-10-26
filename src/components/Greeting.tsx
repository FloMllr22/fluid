import {dayMonth, t, weekday} from '../i18n';
import {greetingKey} from '../lib/clock';
import type {TimeFormat} from '../platform';
import {timeText} from './Time';

interface Props {
	now: Date;
	format: TimeFormat;
	/** move mode: the name of the app being moved, in place of the greeting */
	moving?: string;
	/** the keys of what is open (a menu, move mode), in place of the date line */
	note?: string;
}

/** The greeting at the foot of Home, with weekday, date and time below it. */
export function Greeting({now, format, moving, note}: Props) {
	return (
		<div class="greeting">
			{moving !== undefined && <p class="greeting__mode">{t('move.title')}</p>}
			<h1 class="greeting__title">{moving === undefined ? t(greetingKey(now)) : moving}</h1>
			<p class="greeting__line">
				{note || t('clock.dateLine', {weekday: weekday(now), date: dayMonth(now), time: timeText(now, format)})}
			</p>
		</div>
	);
}
