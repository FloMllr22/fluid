import {afterEach, describe, expect, it} from 'vitest';
import {TIMING} from '../config/constants';
import {setLocale} from '../i18n';
import {type Place, PlatformError} from '../platform';
import type {CachedWeather} from '../state/weather-cache';
import {
	dueIn,
	failedView,
	placeLabel,
	skyOf,
	startView,
	temperatureText,
	temperatureUnit,
	weatherNote
} from './weather';

const berlin: Place = {name: 'Berlin', region: 'Land Berlin', country: 'Germany', latitude: 52.52, longitude: 13.41};

const now = 1793000000000;
const minutes = (n: number) => n * 60 * 1000;

const cached = (readAt: number): CachedWeather => ({
	latitude: berlin.latitude,
	longitude: berlin.longitude,
	weather: {temperature: 11.6, code: 3, isDay: true},
	readAt
});

afterEach(() => {
	setLocale('en');
});

describe('temperatureUnit', () => {
	it('is °F where the region gives temperatures in it', () => {
		for (const locale of ['en-US', 'es_US', 'en-us', 'en-BS', 'es-PR'])
			expect(temperatureUnit(locale), locale).toBe('fahrenheit');
	});

	it('is °C everywhere else, and without a region', () => {
		for (const locale of ['de-DE', 'en-GB', 'en', 'de', '', 'zh-Hant-TW', 'en-CA'])
			expect(temperatureUnit(locale), locale).toBe('celsius');
	});
});

describe('temperatureText', () => {
	it('gives whole degrees, rounded', () => {
		expect(temperatureText(11.6, 'celsius')).toBe('12°');
		expect(temperatureText(11.4, 'celsius')).toBe('11°');
	});

	it('writes below zero with a true minus sign, and never "−0"', () => {
		expect(temperatureText(-3.2, 'celsius')).toBe('−3°');
		expect(temperatureText(-0.4, 'celsius')).toBe('0°');
	});

	it('converts to °F', () => {
		expect(temperatureText(0, 'fahrenheit')).toBe('32°');
		expect(temperatureText(-40, 'fahrenheit')).toBe('−40°');
		expect(temperatureText(21.5, 'fahrenheit')).toBe('71°');
	});
});

describe('skyOf', () => {
	const sky = (code: number, isDay = true) => skyOf({temperature: 10, code, isDay});

	it('shows the sun by day and the moon by night when the sky is clear', () => {
		expect(sky(0)).toEqual({glyph: 'sun', text: 'weather.sky.sunny'});
		expect(sky(0, false)).toEqual({glyph: 'moon', text: 'weather.sky.clear'});
		expect(sky(1)).toEqual({glyph: 'sun', text: 'weather.sky.mostlySunny'});
		expect(sky(1, false)).toEqual({glyph: 'moon', text: 'weather.sky.mostlyClear'});
		expect(sky(2)).toEqual({glyph: 'cloud-sun', text: 'weather.sky.partlyCloudy'});
		expect(sky(2, false)).toEqual({glyph: 'cloud-moon', text: 'weather.sky.partlyCloudy'});
	});

	it('has a glyph and words for every WMO code', () => {
		const codes = [3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
		for (const code of codes) expect(sky(code).text, String(code)).not.toBe('weather.sky.unknown');
		expect(sky(65)).toEqual({glyph: 'rain', text: 'weather.sky.heavyRain'});
		expect(sky(75, false)).toEqual({glyph: 'snow', text: 'weather.sky.heavySnow'});
		expect(sky(99)).toEqual({glyph: 'thunder', text: 'weather.sky.hail'});
	});

	it('shows a cloud for a code it does not know', () => {
		for (const code of [4, 100, -1]) expect(sky(code)).toEqual({glyph: 'cloud', text: 'weather.sky.unknown'});
	});
});

describe('weatherNote', () => {
	it('says why there is no weather', () => {
		setLocale('de-DE');
		expect(weatherNote({status: 'no-place'})).toBe('Wetter: Ort in den Einstellungen wählen');
		expect(weatherNote({status: 'loading'})).toBe('Wetter wird geladen …');
		expect(weatherNote({status: 'failed', error: new PlatformError('offline', 'x')})).toBe(
			'Gerade kein Wetter. Der Wetterdienst ist nicht erreichbar. Prüfe die Internetverbindung des TVs.'
		);
	});

	it('says nothing while it is off, or when there is weather', () => {
		expect(weatherNote({status: 'off'})).toBe('');
		expect(weatherNote({status: 'ready', weather: cached(now).weather, readAt: now})).toBe('');
	});
});

describe('placeLabel', () => {
	it('names the place with its region and country, as far as they are known', () => {
		expect(placeLabel(berlin)).toBe('Berlin, Land Berlin, Germany');
		expect(placeLabel({...berlin, region: ''})).toBe('Berlin, Germany');
		expect(placeLabel({...berlin, region: '', country: ''})).toBe('Berlin');
	});
});

describe('startView', () => {
	it('shows nothing while the weather is off, also with a place and cached weather', () => {
		expect(startView({enabled: false, place: berlin}, cached(now))).toEqual({status: 'off'});
	});

	it('asks for a place when there is none', () => {
		expect(startView({enabled: true, place: null}, null)).toEqual({status: 'no-place'});
	});

	it('shows the cached weather at once, however old, and is loading without it', () => {
		const old = cached(now - minutes(60 * 24));
		expect(startView({enabled: true, place: berlin}, old)).toEqual({
			status: 'ready',
			weather: old.weather,
			readAt: old.readAt
		});
		expect(startView({enabled: true, place: berlin}, null)).toEqual({status: 'loading'});
	});
});

describe('failedView', () => {
	const error = new PlatformError('offline', 'x');

	it('keeps showing recent weather when reading it again fails', () => {
		const recent = cached(now - TIMING.weatherMaxAgeMs + 1);
		expect(failedView(recent, error, now)).toMatchObject({status: 'ready', readAt: recent.readAt});
	});

	it('says why there is none once the last weather is too old, or there is none', () => {
		expect(failedView(cached(now - TIMING.weatherMaxAgeMs), error, now)).toEqual({status: 'failed', error});
		expect(failedView(null, error, now)).toEqual({status: 'failed', error});
	});

	it('does not trust weather read "in the future" (the clock was wrong)', () => {
		expect(failedView(cached(now + minutes(5)), error, now)).toEqual({status: 'failed', error});
	});
});

describe('dueIn', () => {
	it('waits until the weather is due to be read again', () => {
		expect(dueIn(now, now)).toBe(TIMING.weatherRefreshMs);
		expect(dueIn(now - minutes(10), now)).toBe(TIMING.weatherRefreshMs - minutes(10));
	});

	it('reads at once when it is due, or when it was read "in the future"', () => {
		expect(dueIn(now - TIMING.weatherRefreshMs, now)).toBe(0);
		expect(dueIn(now - minutes(60 * 24), now)).toBe(0);
		expect(dueIn(now + minutes(5), now)).toBe(0);
	});
});
