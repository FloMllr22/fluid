import {useEffect, useState} from 'preact/hooks';
import {TIMING} from '../config/constants';
import {dueIn, failedView, startView, type WeatherView} from '../lib/weather';
import {platform} from '../platform';
import type {WeatherSettings} from '../state/settings';
import {type CachedWeather, loadCachedWeather, saveCachedWeather} from '../state/weather-cache';

/** The weather at the chosen place, cache-first: the last weather read shows at once, and
 *  is read again in the background when it is due (TIMING.weatherRefreshMs), or soon after
 *  a failure (TIMING.weatherRetryMs). Nothing is read while fluid is not in front; back in
 *  front, it is read if it became due meanwhile. Off, or with no place, nothing is sent. */
export function useWeather(settings: WeatherSettings): WeatherView {
	const {enabled, place} = settings;
	const [view, setView] = useState<WeatherView>(() => startView(settings, place && loadCachedWeather(place)));
	const latitude = place ? place.latitude : Number.NaN;
	const longitude = place ? place.longitude : Number.NaN;

	useEffect(() => {
		let last = place && loadCachedWeather(place);
		setView(startView({enabled, place}, last));
		if (!enabled || !place) return;

		let alive = true;
		let inFront = true;
		let reading = false;
		let timer = 0;
		const schedule = (ms: number) => {
			window.clearTimeout(timer);
			if (inFront && !reading) timer = window.setTimeout(read, ms);
		};
		const read = () => {
			reading = true;
			platform.getWeather(place.latitude, place.longitude).then(
				(weather) => {
					reading = false;
					if (!alive) return;
					const entry: CachedWeather = {
						latitude: place.latitude,
						longitude: place.longitude,
						weather,
						readAt: Date.now()
					};
					last = entry;
					saveCachedWeather(entry);
					setView(startView({enabled, place}, entry));
					schedule(TIMING.weatherRefreshMs);
				},
				(error: unknown) => {
					reading = false;
					if (!alive) return;
					setView(failedView(last, error, Date.now()));
					schedule(TIMING.weatherRetryMs);
				}
			);
		};
		const resume = () => {
			inFront = true;
			schedule(last ? dueIn(last.readAt, Date.now()) : 0);
		};
		resume();
		const stopBackground = platform.onBackground(() => {
			inFront = false;
			window.clearTimeout(timer);
		});
		const stopForeground = platform.onForeground(resume);
		return () => {
			alive = false;
			window.clearTimeout(timer);
			stopBackground();
			stopForeground();
		};
	}, [enabled, latitude, longitude]);

	return view;
}
