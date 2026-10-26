import {t} from '../i18n';
import {skyOf, type TemperatureUnit, temperatureText, type WeatherView, weatherNote} from '../lib/weather';
import {Glyph} from './Glyph';

interface Props {
	view: WeatherView;
	unit: TemperatureUnit;
	/** top right on Home, or in the line of the place in Settings */
	where: 'home' | 'settings';
}

/** The weather now, in one line: the sky as a glyph, the temperature and the sky in words.
 *  Without weather it says why (no place yet, loading, failed); while it is off, nothing. */
export function WeatherNow({view, unit, where}: Props) {
	if (view.status === 'off') return null;
	const classes = `weather-now weather-now--${where}`;
	if (view.status !== 'ready')
		return (
			<div class={classes}>
				<p class="weather-now__note">{weatherNote(view)}</p>
			</div>
		);
	const sky = skyOf(view.weather);
	return (
		<div class={classes}>
			<Glyph name={sky.glyph} className="weather-now__glyph" />
			<span class="weather-now__temperature">{temperatureText(view.weather.temperature, unit)}</span>
			<span class="weather-now__sky">{t(sky.text)}</span>
		</div>
	);
}
