// Every user-visible text goes through here. The texts live in locales/<language>.json
// under flat "area.name" keys. English is the reference: TypeScript checks every key
// passed to t(), and i18n.test.ts checks that each language has exactly the English keys
// and placeholders. The language follows the TV's UI language, set once at start with
// setLocale(); for a language fluid does not have, everything is English.

import {PlatformError} from '../platform';
import {createDateFormatter, type DateFormatter, type DateNames} from './dates';
import de from './locales/de.json';
import en from './locales/en.json';

type Messages = typeof en;

/** Keys of plain texts (lists such as month names are not texts). */
export type MessageKey = {[K in keyof Messages]: Messages[K] extends string ? K : never}[keyof Messages];

/** Texts with a singular and a plural form, stored as "<key>_one" and "<key>_other". */
export type PluralKey = {[K in keyof Messages]: K extends `${infer Base}_one` ? Base : never}[keyof Messages];

/** Values for the "{name}" placeholders of a text. */
export type Params = Record<string, string | number>;

export const LANGUAGES = ['en', 'de'] as const;
export type Language = (typeof LANGUAGES)[number];

export const MESSAGES: Record<Language, Messages> = {en, de};

type PluralForm = 'one' | 'other';

/** Own plural rules: Intl.PluralRules only exists from Chromium 63, and webOS 4 has 53.
 *  German and English agree: "one" for exactly 1, "other" for everything else. */
const PLURAL_RULES: Record<Language, (count: number) => PluralForm> = {
	en: (count) => (count === 1 ? 'one' : 'other'),
	de: (count) => (count === 1 ? 'one' : 'other')
};

function namesOf(texts: Messages): DateNames {
	return {weekdays: texts['clock.weekdays'], months: texts['clock.months'], dayMonth: texts['clock.dayMonth']};
}

let language: Language = 'en';
let messages: Messages = en;
let dates: DateFormatter = createDateFormatter('en', namesOf(en));

/** The language fluid speaks for a locale such as "de-DE": that language if fluid has it,
 *  otherwise English. */
export function languageOf(locale: string): Language {
	const code = locale.split(/[-_]/)[0].toLowerCase();
	return LANGUAGES.find((l) => l === code) || 'en';
}

/** Switches every text and date to `locale` (the TV's UI language). Dates follow the full
 *  locale ("en-US": October 25, "en-GB": 25 October) when fluid speaks its language;
 *  otherwise they are English like the texts. */
export function setLocale(locale: string): void {
	language = languageOf(locale);
	messages = MESSAGES[language];
	const own = locale.split(/[-_]/)[0].toLowerCase() === language;
	dates = createDateFormatter(own ? locale.replace(/_/g, '-') : language, namesOf(messages));
	if (typeof document !== 'undefined') document.documentElement.lang = language;
}

export function currentLanguage(): Language {
	return language;
}

/** Fills in "{name}" placeholders. One without a value stays visible, so it is noticed. */
function interpolate(text: string, params?: Params): string {
	if (!params) return text;
	return text.replace(/\{(\w+)\}/g, (match, name: string) =>
		Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
	);
}

/** The text for `key` in the current language. */
export function t(key: MessageKey, params?: Params): string {
	return interpolate(messages[key], params);
}

/** The singular or plural text for `count`, which also fills "{count}". */
export function tn(key: PluralKey, count: number, params?: Params): string {
	const form = PLURAL_RULES[language](count);
	return interpolate(messages[`${key}_${form}`], {...params, count});
}

/** "Sunday" in the current language. */
export function weekday(date: Date): string {
	return dates.weekday(date);
}

/** "25 October" in the current locale. */
export function dayMonth(date: Date): string {
	return dates.dayMonth(date);
}

/** A sentence for the user about a failed platform call. Every PlatformError code needs
 *  an "error.<code>" text; TypeScript checks that here. */
export function errorMessage(error: unknown): string {
	if (!(error instanceof PlatformError)) return t('error.unknown');
	const key: MessageKey = `error.${error.code}`;
	return t(key);
}
