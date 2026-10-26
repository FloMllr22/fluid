import {afterEach, describe, expect, it, vi} from 'vitest';
import {PLATFORM_ERROR_CODES, PlatformError} from '../platform';
import {PHOTOS} from '../theme/backgrounds';
import {createDateFormatter} from './dates';
import {
	currentLanguage,
	dayMonth,
	errorMessage,
	LANGUAGES,
	languageOf,
	localeFor,
	MESSAGES,
	setLocale,
	t,
	tn,
	weekday
} from './index';

type Key = keyof typeof MESSAGES.en;
const KEYS = Object.keys(MESSAGES.en) as Key[];

/** 2026-10-25, a Sunday, in the evening */
const sunday = new Date(2026, 9, 25, 21, 57);

const placeholders = (text: string) => (text.match(/\{\w+\}/g) || []).sort();

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	setLocale('en');
});

describe('locale files', () => {
	for (const language of LANGUAGES) {
		const texts = MESSAGES[language];

		it(`${language}: has exactly the English keys`, () => {
			expect(Object.keys(texts).sort()).toEqual(KEYS.slice().sort());
		});

		it(`${language}: keeps the placeholders of every English text, and leaves none empty`, () => {
			for (const key of KEYS) {
				const reference = MESSAGES.en[key];
				const text = texts[key];
				if (typeof reference !== 'string' || typeof text !== 'string') continue;
				expect(placeholders(text), `${language} ${key}`).toEqual(placeholders(reference));
				expect(text.trim(), `${language} ${key}`).not.toBe('');
			}
		});

		it(`${language}: names seven weekdays and twelve months`, () => {
			expect(texts['clock.weekdays']).toHaveLength(7);
			expect(texts['clock.months']).toHaveLength(12);
		});

		it(`${language}: names every photo that comes with fluid`, () => {
			for (const photo of PHOTOS) expect(texts, photo.id).toHaveProperty([`background.photo.${photo.id}`]);
		});
	}

	it('has a plural form for every singular one', () => {
		for (const key of KEYS) {
			if (/_one$/.test(key)) expect(KEYS).toContain(key.replace(/_one$/, '_other'));
		}
	});
});

describe('setLocale', () => {
	it("speaks the TV's language when fluid has it", () => {
		setLocale('de-DE');
		expect(currentLanguage()).toBe('de');
		expect(t('rows.sources')).toBe('Quellen');
	});

	it('falls back to English for other languages', () => {
		setLocale('fr-FR');
		expect(currentLanguage()).toBe('en');
		expect(t('rows.sources')).toBe('Sources');
		expect(dayMonth(sunday)).toBe('October 25');
	});

	it('marks the page with the language', () => {
		const page = {documentElement: {lang: ''}};
		vi.stubGlobal('document', page);
		setLocale('de-AT');
		expect(page.documentElement.lang).toBe('de');
	});

	it('reads the language of every way a locale is written', () => {
		expect(languageOf('de')).toBe('de');
		expect(languageOf('DE-de')).toBe('de');
		expect(languageOf('de_DE')).toBe('de');
		expect(languageOf('en-US')).toBe('en');
		expect(languageOf('')).toBe('en');
	});
});

describe('t', () => {
	it('fills in placeholders', () => {
		expect(t('launch.failed', {name: 'Jellyfin'})).toBe("Couldn't open Jellyfin.");
		setLocale('de-DE');
		expect(t('launch.failed', {name: 'Jellyfin'})).toBe('Jellyfin konnte nicht geöffnet werden.');
	});

	it('leaves a placeholder without a value visible', () => {
		expect(t('launch.failed')).toBe("Couldn't open {name}.");
	});
});

describe('tn', () => {
	it('uses the singular for exactly one', () => {
		expect(tn('apps.iconsFailed', 1)).toBe('1 app icon could not be loaded');
		setLocale('de-DE');
		expect(tn('apps.iconsFailed', 1)).toBe('1 App-Icon konnte nicht geladen werden');
	});

	it('uses the plural for anything else, zero included', () => {
		expect(tn('apps.iconsFailed', 0)).toBe('0 app icons could not be loaded');
		expect(tn('apps.iconsFailed', 3)).toBe('3 app icons could not be loaded');
		setLocale('de-DE');
		expect(tn('apps.iconsFailed', 3)).toBe('3 App-Icons konnten nicht geladen werden');
	});
});

describe('dates through Intl', () => {
	it('follow the full locale', () => {
		setLocale('de-DE');
		expect([weekday(sunday), dayMonth(sunday)]).toEqual(['Sonntag', '25. Oktober']);
		setLocale('en-GB');
		expect([weekday(sunday), dayMonth(sunday)]).toEqual(['Sunday', '25 October']);
		setLocale('en-US');
		expect(dayMonth(sunday)).toBe('October 25');
	});
});

describe('dates without Intl for the locale (older firmware)', () => {
	it('come from the locale file', () => {
		vi.spyOn(Intl.DateTimeFormat, 'supportedLocalesOf').mockReturnValue([]);
		setLocale('de-DE');
		expect([weekday(sunday), dayMonth(sunday)]).toEqual(['Sonntag', '25. Oktober']);
		setLocale('en-GB');
		expect([weekday(sunday), dayMonth(sunday)]).toEqual(['Sunday', '25 October']);
	});

	it('also cover a locale tag Intl rejects', () => {
		const names = {
			weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
			months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
			dayMonth: '{month} {day}'
		};
		expect(createDateFormatter('not a locale!', names).dayMonth(sunday)).toBe('Oct 25');
	});
});

describe('errorMessage', () => {
	it('has a sentence for every platform error, in every language', () => {
		for (const language of LANGUAGES) {
			setLocale(language);
			const sentences = PLATFORM_ERROR_CODES.map((code) => errorMessage(new PlatformError(code, 'technical detail')));
			for (const sentence of sentences) expect(sentence).toMatch(/\.$/);
			expect(new Set(sentences).size).toBe(PLATFORM_ERROR_CODES.length);
		}
	});

	it('says something went wrong for any other error', () => {
		expect(errorMessage(new Error('boom'))).toBe('Something went wrong.');
		setLocale('de-DE');
		expect(errorMessage(undefined)).toBe('Etwas ist schiefgelaufen.');
	});

	it('names the cause, not the technical detail', () => {
		expect(errorMessage(new PlatformError('timeout', 'No answer within 4000 ms: luna://x'))).toBe(
			"The TV didn't answer in time."
		);
	});
});

describe('localeFor', () => {
	it("is the TV's locale when fluid follows the TV", () => {
		expect(localeFor('tv', 'de-DE')).toBe('de-DE');
		expect(localeFor('tv', 'fr-FR')).toBe('fr-FR');
	});

	it("keeps the TV's region for the language the TV speaks too", () => {
		expect(localeFor('en', 'en-GB')).toBe('en-GB');
		expect(localeFor('de', 'de_AT')).toBe('de_AT');
	});

	it('is just the chosen language otherwise', () => {
		expect(localeFor('en', 'de-DE')).toBe('en');
		expect(localeFor('de', 'en-US')).toBe('de');
	});

	it('gives dates in the chosen language', () => {
		setLocale(localeFor('de', 'en-US'));
		expect(dayMonth(sunday)).toBe('25. Oktober');
	});
});
