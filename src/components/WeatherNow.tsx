import {t} from '../i18n';
import {skyOf, type TemperatureUnit, temperatureText, type WeatherView, weatherNote} from '../lib/weather';
import {Glyph} from './Glyph';

/** The weather now, in one line: the sky as a glyph, the temperature and the sky in words.
 *  Without weather it says why (no place yet, loading, failed); while it is off, nothing. */
export function WeatherNow({view, unit, class: className}: {view: WeatherView; unit: TemperatureUnit; class: string}) {
	if (view.status === 'off') return null;
	if (view.status !== 'ready')
		return (
			<div class={className}>
				<p class="weather__note">{weatherNote(view)}</p>
			</div>
		);
	const sky = skyOf(view.weather);
	return (
		<div class={className}>
			<Glyph name={sky.glyph} className="weather__glyph" />
			<span class="weather__temperature">{temperatureText(view.weather.temperature, unit)}</span>
			<span class="weather__sky">{t(sky.text)}</span>
		</div>
	);
}
