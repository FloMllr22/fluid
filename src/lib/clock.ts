// Time-of-day logic. Pure functions so they are trivially testable; the words come from
// i18n (weekday and date: see i18n/dates.ts).

import type {MessageKey} from '../i18n';
import type {TimeFormat} from '../platform';

export function greetingKey(date: Date): MessageKey {
	const h = date.getHours();
	if (h < 12) return 'home.greeting.morning';
	if (h < 18) return 'home.greeting.afternoon';
	return 'home.greeting.evening';
}

export interface TimeParts {
	/** "15:42" or "3:42" */
	time: string;
	/** before or after noon in 12-hour format, otherwise empty */
	period: 'am' | 'pm' | '';
}

export function timeParts(date: Date, format: TimeFormat): TimeParts {
	const h = date.getHours();
	const m = pad(date.getMinutes());
	if (format === '24h') return {time: `${pad(h)}:${m}`, period: ''};
	return {time: `${h % 12 || 12}:${m}`, period: h < 12 ? 'am' : 'pm'};
}

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}
