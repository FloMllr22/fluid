import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {HTTP_TIMEOUT_MS} from './http';
import {getWeather, OPEN_METEO, placesOf, searchPlaces, weatherOf} from './weather';

/** Stand-in for XMLHttpRequest: records each request; the test then answers it. */
class FakeRequest {
	static sent: FakeRequest[] = [];
	method = '';
	url = '';
	timeout = 0;
	status = 0;
	responseText = '';
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	ontimeout: (() => void) | null = null;

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}

	send() {
		FakeRequest.sent.push(this);
	}
}

const last = () => FakeRequest.sent[FakeRequest.sent.length - 1];

function answer(status: number, body: unknown) {
	const request = last();
	request.status = status;
	request.responseText = typeof body === 'string' ? body : JSON.stringify(body);
	request.onload?.();
}

/** The query of the last request, as name → value. */
function sentParams(): Record<string, string> {
	const params: Record<string, string> = {};
	new URLSearchParams(last().url.split('?')[1]).forEach((value, name) => {
		params[name] = value;
	});
	return params;
}

const berlin = {
	id: 2950159,
	name: 'Berlin',
	latitude: 52.52437,
	longitude: 13.41053,
	country_code: 'DE',
	admin1: 'Land Berlin',
	country: 'Deutschland',
	population: 3426354
};

beforeEach(() => {
	FakeRequest.sent = [];
	vi.stubGlobal('XMLHttpRequest', FakeRequest);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('searchPlaces', () => {
	it("asks Open-Meteo's place search, with the query and the language only", async () => {
		const found = searchPlaces('  Berlin ', 'de');
		expect(last().method).toBe('GET');
		expect(last().url.split('?')[0]).toBe(OPEN_METEO.search);
		expect(last().timeout).toBe(HTTP_TIMEOUT_MS);
		expect(sentParams()).toEqual({name: 'Berlin', count: '6', language: 'de', format: 'json'});
		answer(200, {results: [berlin], generationtime_ms: 0.5});
		await expect(found).resolves.toEqual([
			{name: 'Berlin', region: 'Land Berlin', country: 'Deutschland', latitude: 52.52437, longitude: 13.41053}
		]);
	});

	it('encodes what the user typed', () => {
		searchPlaces('Saint-Étienne & Co?x=1', 'en');
		expect(last().url).toContain('name=Saint-%C3%89tienne%20%26%20Co%3Fx%3D1&');
		expect(sentParams().name).toBe('Saint-Étienne & Co?x=1');
	});

	it('cuts a query that no place name is as long as', () => {
		searchPlaces('a'.repeat(500), 'en');
		expect(sentParams().name).toHaveLength(100);
	});

	it('sends only a two-letter language', () => {
		searchPlaces('Berlin', 'de&count=100');
		expect(sentParams().language).toBe('en');
	});

	it('does not ask for a query too short to find anything', async () => {
		await expect(searchPlaces(' B ', 'en')).resolves.toEqual([]);
		expect(FakeRequest.sent).toHaveLength(0);
	});

	it('finds nothing when the answer has no results', async () => {
		const found = searchPlaces('Xyzzy', 'en');
		answer(200, {generationtime_ms: 0.2});
		await expect(found).resolves.toEqual([]);
	});

	it('fails offline without a connection, and when no answer comes in time', async () => {
		const noConnection = searchPlaces('Berlin', 'en');
		last().onerror?.();
		await expect(noConnection).rejects.toMatchObject({name: 'PlatformError', code: 'offline'});
		const noAnswer = searchPlaces('Berlin', 'en');
		last().ontimeout?.();
		await expect(noAnswer).rejects.toMatchObject({code: 'offline'});
	});

	it('fails with the service on an HTTP error or an unreadable answer', async () => {
		const refused = searchPlaces('Berlin', 'en');
		answer(400, {error: true, reason: 'Parameter count must be between 1 and 100.'});
		await expect(refused).rejects.toMatchObject({code: 'service'});
		const garbled = searchPlaces('Berlin', 'en');
		answer(200, '<html>');
		await expect(garbled).rejects.toMatchObject({code: 'service'});
	});

	it('never puts the query into an error message', async () => {
		const failed = searchPlaces('Secret Street', 'en');
		last().onerror?.();
		await expect(failed).rejects.toMatchObject({message: 'No connection to geocoding-api.open-meteo.com'});
	});
});

describe('placesOf', () => {
	it('leaves out entries that are not usable places', () => {
		const answer = {
			results: [
				berlin,
				{...berlin, name: ''},
				{...berlin, name: 7},
				{...berlin, latitude: 91},
				{...berlin, longitude: '13.4'},
				null,
				'Berlin'
			]
		};
		expect(placesOf(answer)).toHaveLength(1);
	});

	it('leaves out a region that only repeats the name, and an unknown country', () => {
		const [hamburg] = placesOf({results: [{name: 'Hamburg', admin1: 'Hamburg', latitude: 53.55, longitude: 9.99}]});
		expect(hamburg).toEqual({name: 'Hamburg', region: '', country: '', latitude: 53.55, longitude: 9.99});
	});

	it('lists six places at most', () => {
		expect(placesOf({results: Array(10).fill(berlin)})).toHaveLength(6);
	});

	it('rejects answers that are not a place list', () => {
		for (const answer of [null, [], 'text', {results: 'Berlin'}])
			expect(() => placesOf(answer), JSON.stringify(answer)).toThrow(expect.objectContaining({code: 'service'}));
	});
});

describe('getWeather', () => {
	const forecast = {
		latitude: 52.52,
		longitude: 13.419998,
		current_units: {time: 'iso8601', interval: 'seconds', temperature_2m: '°C', weather_code: 'wmo code', is_day: ''},
		current: {time: '2026-10-26T15:00', interval: 900, temperature_2m: 11.6, weather_code: 3, is_day: 1}
	};

	it('sends only the coordinates, rounded to about a kilometre', async () => {
		const weather = getWeather(52.52437, 13.41053);
		expect(last().url.split('?')[0]).toBe(OPEN_METEO.forecast);
		expect(sentParams()).toEqual({
			latitude: '52.52',
			longitude: '13.41',
			current: 'temperature_2m,weather_code,is_day'
		});
		answer(200, forecast);
		await expect(weather).resolves.toEqual({temperature: 11.6, code: 3, isDay: true});
	});

	it('does not ask for a place that is not on Earth', async () => {
		await expect(getWeather(Number.NaN, 0)).rejects.toMatchObject({code: 'rejected'});
		await expect(getWeather(0, 181)).rejects.toMatchObject({code: 'rejected'});
		expect(FakeRequest.sent).toHaveLength(0);
	});

	it('fails offline or with the service like the search', async () => {
		const noConnection = getWeather(52.52, 13.41);
		last().onerror?.();
		await expect(noConnection).rejects.toMatchObject({code: 'offline'});
		const busy = getWeather(52.52, 13.41);
		answer(503, 'Service Unavailable');
		await expect(busy).rejects.toMatchObject({code: 'service'});
	});
});

describe('weatherOf', () => {
	const current = (fields: Record<string, unknown>) => ({
		current: {temperature_2m: -3.2, weather_code: 71, is_day: 0, ...fields}
	});

	it('reads the temperature, the weather code and whether it is day', () => {
		expect(weatherOf(current({}))).toEqual({temperature: -3.2, code: 71, isDay: false});
		expect(weatherOf(current({is_day: undefined}))).toMatchObject({isDay: true});
	});

	it('rejects an answer without a usable current weather', () => {
		for (const answer of [
			null,
			{},
			{current: []},
			current({temperature_2m: null}),
			current({temperature_2m: '12'}),
			current({weather_code: 2.5}),
			current({weather_code: undefined})
		])
			expect(() => weatherOf(answer), JSON.stringify(answer)).toThrow(expect.objectContaining({code: 'service'}));
	});
});
