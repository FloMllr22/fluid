// The weather and the place search, from Open-Meteo: no account and no key. A search sends
// what the user typed and the UI language; the weather sends only a place's coordinates,
// rounded to about a kilometre. Answers are untrusted and checked field by field.

import {PlatformError} from '../errors';
import {PLACE_QUERY_MIN_LENGTH, PLACE_SEARCH_LIMIT, type Place, type Weather} from '../types';
import {getJson} from './http';

export const OPEN_METEO = {
	search: 'https://geocoding-api.open-meteo.com/v1/search',
	forecast: 'https://api.open-meteo.com/v1/forecast'
} as const;

/** No place name is longer; anything beyond is cut before sending. */
const QUERY_MAX_LENGTH = 100;

/** Two decimals are about a kilometre, finer than the weather model's grid. */
const COORDINATE_DECIMALS = 2;

type Data = Record<string, unknown>;

export function searchPlaces(query: string, language: string): Promise<Place[]> {
	const name = query.trim().slice(0, QUERY_MAX_LENGTH);
	if (name.length < PLACE_QUERY_MIN_LENGTH) return Promise.resolve([]);
	const lang = /^[a-z]{2}$/.test(language) ? language : 'en';
	const url = `${OPEN_METEO.search}?name=${encodeURIComponent(name)}&count=${PLACE_SEARCH_LIMIT}&language=${lang}&format=json`;
	return getJson(url).then(placesOf);
}

export function getWeather(latitude: number, longitude: number): Promise<Weather> {
	if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180))
		return Promise.reject(new PlatformError('rejected', 'Not a place on Earth'));
	const url =
		`${OPEN_METEO.forecast}?latitude=${latitude.toFixed(COORDINATE_DECIMALS)}` +
		`&longitude=${longitude.toFixed(COORDINATE_DECIMALS)}&current=temperature_2m,weather_code,is_day`;
	return getJson(url).then(weatherOf);
}

/** The places in a search answer, leaving out entries that are not usable places. No
 *  `results` at all means nothing was found. */
export function placesOf(answer: unknown): Place[] {
	if (!isObject(answer)) throw new PlatformError('service', 'Unreadable place search answer');
	const {results} = answer;
	if (results === undefined) return [];
	if (!Array.isArray(results)) throw new PlatformError('service', 'Unreadable place search answer');
	const places: Place[] = [];
	for (const result of results) {
		const place = placeOf(result);
		if (place) places.push(place);
	}
	return places.slice(0, PLACE_SEARCH_LIMIT);
}

function placeOf(result: unknown): Place | null {
	if (!isObject(result)) return null;
	const {name, admin1, country, latitude, longitude} = result;
	if (typeof name !== 'string' || name.trim() === '') return null;
	if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) return null;
	return {
		name: name.trim(),
		region: typeof admin1 === 'string' && admin1.trim() !== name.trim() ? admin1.trim() : '',
		country: typeof country === 'string' ? country.trim() : '',
		latitude,
		longitude
	};
}

/** The current weather in a forecast answer. */
export function weatherOf(answer: unknown): Weather {
	const current = isObject(answer) ? answer.current : undefined;
	if (!isObject(current)) throw new PlatformError('service', 'No current weather in the answer');
	const {temperature_2m: temperature, weather_code: code, is_day: isDay} = current;
	if (typeof temperature !== 'number' || !Number.isFinite(temperature) || !Number.isInteger(code))
		throw new PlatformError('service', 'Unreadable current weather');
	return {temperature, code: code as number, isDay: isDay !== 0};
}

function isCoordinate(value: unknown, limit: number): value is number {
	return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
}

function isObject(value: unknown): value is Data {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
