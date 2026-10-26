// Weather logic: what to show for a WMO weather code, °C or °F, a place's name, and when
// the weather is due to be read again. Pure functions; the words come from i18n.

import type {GlyphName} from '../components/Glyph';
import {TIMING} from '../config/constants';
import {errorMessage, type MessageKey, t} from '../i18n';
import type {Place, Weather} from '../platform';
import type {WeatherSettings} from '../state/settings';
import type {CachedWeather} from '../state/weather-cache';

/** What the weather shows: nothing (off), a hint to pick a place, that it is loading (with
 *  nothing cached), the weather, or why there is none. */
export type WeatherView =
	| {status: 'off'}
	| {status: 'no-place'}
	| {status: 'loading'}
	| {status: 'ready'; weather: Weather; readAt: number}
	| {status: 'failed'; error: unknown};

export type TemperatureUnit = 'celsius' | 'fahrenheit';

/** Regions that give temperatures in °F (CLDR's preference for the weather); everywhere
 *  else it is °C. */
const FAHRENHEIT_REGIONS = ['US', 'BS', 'BZ', 'KY', 'PR', 'PW'];

/** °F where the TV's region ("en-US") uses it, otherwise °C. */
export function temperatureUnit(locale: string): TemperatureUnit {
	const region = (locale.split(/[-_]/)[1] || '').toUpperCase();
	return FAHRENHEIT_REGIONS.indexOf(region) === -1 ? 'celsius' : 'fahrenheit';
}

/** "12°" or "−3°" (a true minus sign) in `unit`, from °C, in whole degrees. */
export function temperatureText(celsius: number, unit: TemperatureUnit): string {
	const degrees = Math.round(unit === 'fahrenheit' ? (celsius * 9) / 5 + 32 : celsius);
	return t('weather.temperature', {value: degrees < 0 ? `−${-degrees}` : String(degrees)});
}

/** The sky in a glyph and a few words. */
export interface Sky {
	glyph: GlyphName;
	text: MessageKey;
}

/** WMO weather codes that look the same by day and by night. */
const SKIES: Record<number, Sky> = {
	3: {glyph: 'cloud', text: 'weather.sky.overcast'},
	45: {glyph: 'fog', text: 'weather.sky.fog'},
	48: {glyph: 'fog', text: 'weather.sky.fog'},
	51: {glyph: 'drizzle', text: 'weather.sky.drizzle'},
	53: {glyph: 'drizzle', text: 'weather.sky.drizzle'},
	55: {glyph: 'drizzle', text: 'weather.sky.drizzle'},
	56: {glyph: 'drizzle', text: 'weather.sky.freezingDrizzle'},
	57: {glyph: 'drizzle', text: 'weather.sky.freezingDrizzle'},
	61: {glyph: 'rain', text: 'weather.sky.rain'},
	63: {glyph: 'rain', text: 'weather.sky.rain'},
	65: {glyph: 'rain', text: 'weather.sky.heavyRain'},
	66: {glyph: 'rain', text: 'weather.sky.freezingRain'},
	67: {glyph: 'rain', text: 'weather.sky.freezingRain'},
	71: {glyph: 'snow', text: 'weather.sky.snow'},
	73: {glyph: 'snow', text: 'weather.sky.snow'},
	75: {glyph: 'snow', text: 'weather.sky.heavySnow'},
	77: {glyph: 'snow', text: 'weather.sky.snowGrains'},
	80: {glyph: 'rain', text: 'weather.sky.showers'},
	81: {glyph: 'rain', text: 'weather.sky.showers'},
	82: {glyph: 'rain', text: 'weather.sky.heavyShowers'},
	85: {glyph: 'snow', text: 'weather.sky.snowShowers'},
	86: {glyph: 'snow', text: 'weather.sky.snowShowers'},
	95: {glyph: 'thunder', text: 'weather.sky.thunderstorm'},
	96: {glyph: 'thunder', text: 'weather.sky.hail'},
	99: {glyph: 'thunder', text: 'weather.sky.hail'}
};

/** The sky for a WMO weather code: clear and partly cloudy skies show the sun by day and
 *  the moon by night. A code the WMO table does not have shows a cloud. */
export function skyOf({code, isDay}: Weather): Sky {
	if (code === 0) return isDay ? {glyph: 'sun', text: 'weather.sky.sunny'} : {glyph: 'moon', text: 'weather.sky.clear'};
	if (code === 1)
		return isDay ? {glyph: 'sun', text: 'weather.sky.mostlySunny'} : {glyph: 'moon', text: 'weather.sky.mostlyClear'};
	if (code === 2) return {glyph: isDay ? 'cloud-sun' : 'cloud-moon', text: 'weather.sky.partlyCloudy'};
	return Object.prototype.hasOwnProperty.call(SKIES, code)
		? SKIES[code]
		: {glyph: 'cloud', text: 'weather.sky.unknown'};
}

/** Why there is no weather to show, in words; empty when it is off or there is weather. */
export function weatherNote(view: WeatherView): string {
	if (view.status === 'no-place') return t('weather.noPlace');
	if (view.status === 'loading') return t('weather.loading');
	if (view.status === 'failed') return `${t('weather.failed')} ${errorMessage(view.error)}`;
	return '';
}

/** "Berlin, Land Berlin, Germany": enough to tell places of the same name apart. */
export function placeLabel(place: Place): string {
	return [place.name, place.region, place.country].filter((part) => part !== '').join(', ');
}

/** What to show before the weather is read: the cached weather when there is some. */
export function startView({enabled, place}: WeatherSettings, cached: CachedWeather | null): WeatherView {
	if (!enabled) return {status: 'off'};
	if (!place) return {status: 'no-place'};
	return cached ? {status: 'ready', weather: cached.weather, readAt: cached.readAt} : {status: 'loading'};
}

/** What to show when reading the weather failed: the last weather while it is recent
 *  enough, otherwise why there is none. */
export function failedView(last: CachedWeather | null, error: unknown, now: number): WeatherView {
	if (last && ageOf(last.readAt, now) < TIMING.weatherMaxAgeMs)
		return {status: 'ready', weather: last.weather, readAt: last.readAt};
	return {status: 'failed', error};
}

/** How long until weather read at `readAt` is due to be read again; 0 when it is due. */
export function dueIn(readAt: number, now: number): number {
	return Math.max(0, TIMING.weatherRefreshMs - ageOf(readAt, now));
}

/** How old weather read at `readAt` is. Read "in the future", the TV's clock was wrong at
 *  the time, so its age is unknown: it counts as too old to keep. */
function ageOf(readAt: number, now: number): number {
	return now < readAt ? Number.POSITIVE_INFINITY : now - readAt;
}
