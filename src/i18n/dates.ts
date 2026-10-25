// Weekday and date for the clock. Intl.DateTimeFormat where the engine has the locale
// (webOS 6.5 ships full ICU data); otherwise the names from the locale file, because older
// firmware may ship Intl without every language. The formatters are made once per locale,
// as the clock re-renders every second.

/** The fallback: names and pattern from the locale file. */
export interface DateNames {
	/** Sunday first, as Date.getDay() counts */
	weekdays: string[];
	months: string[];
	/** e.g. "{day} {month}" */
	dayMonth: string;
}

export interface DateFormatter {
	/** "Sunday" */
	weekday(date: Date): string;
	/** "25 October", "October 25", "25. Oktober" … */
	dayMonth(date: Date): string;
}

/** Whether the engine's Intl can format dates for `locale`. */
export function intlHas(locale: string): boolean {
	try {
		return typeof Intl === 'object' && Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
	} catch {
		return false; // not a valid locale tag
	}
}

export function createDateFormatter(locale: string, names: DateNames): DateFormatter {
	if (intlHas(locale)) {
		const weekday = new Intl.DateTimeFormat(locale, {weekday: 'long'});
		const dayMonth = new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long'});
		return {weekday: (date) => weekday.format(date), dayMonth: (date) => dayMonth.format(date)};
	}
	return {
		weekday: (date) => names.weekdays[date.getDay()],
		dayMonth: (date) =>
			names.dayMonth.replace('{day}', String(date.getDate())).replace('{month}', names.months[date.getMonth()])
	};
}
