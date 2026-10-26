import {useCallback, useRef, useState} from 'preact/hooks';
import {KEY} from '../config/constants';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {type PlaceSearch, usePlaceSearch} from '../hooks/usePlaceSearch';
import {errorMessage, t} from '../i18n';
import {placeLabel, type TemperatureUnit, type WeatherView} from '../lib/weather';
import {PLACE_QUERY_MIN_LENGTH, type Place} from '../platform';
import type {WeatherSettings} from '../state/settings';
import {OptionRow} from './OptionList';
import {WeatherNow} from './WeatherNow';

/** The weather as Settings shows and changes it. */
export interface WeatherChoice {
	settings: WeatherSettings;
	view: WeatherView;
	unit: TemperatureUnit;
	/** turns the weather on or off */
	onToggle: () => void;
	/** uses a place found by the search */
	onPick: (place: Place) => void;
}

interface Props extends WeatherChoice {
	/** has the remote's keys */
	active: boolean;
	/** ←: back to the tabs */
	onExit: () => void;
	/** Back: home */
	onClose: () => void;
	/** the pointer points into the panel, which then takes the keys */
	onPointer: () => void;
}

/** Rows: the switch, then (with the weather on) the search field and the places found. */
const SWITCH = 0;
const FIELD = 1;
const FIRST_PLACE = 2;

/** The Weather tab: a switch, the place in use with its weather, a search field and the
 *  places found. ↑ ↓ move between the rows, OK switches, opens the keyboard or picks a
 *  place, ← goes back to the tabs. While the field has the keyboard, it keeps every key (the arrows move the
 *  caret) except OK, which searches at once, Back, and ↑ ↓, which leave it. Off, there is
 *  only the switch and no search, so nothing is sent. */
export function WeatherPanel({settings, view, unit, onToggle, onPick, active, onExit, onClose, onPointer}: Props) {
	const [selected, setSelected] = useState(SWITCH);
	const [query, setQuery] = useState('');
	const [editing, setEditing] = useState(false);
	const field = useRef<HTMLInputElement>(null);
	const {search, searchNow} = usePlaceSearch(settings.enabled ? query : '');
	const places = settings.enabled && search.status === 'found' ? search.places : [];
	const last = settings.enabled ? FIRST_PLACE + places.length - 1 : SWITCH;
	const focus = Math.min(selected, last);

	const activate = (row: number) => {
		setSelected(row);
		if (row === SWITCH) {
			setQuery('');
			onToggle();
		} else if (row === FIELD) field.current?.focus();
		else if (places[row - FIRST_PLACE]) {
			onPick(places[row - FIRST_PLACE]);
			setQuery('');
			setSelected(FIELD);
		}
	};

	useOkPress({onPress: () => activate(focus), onLongPress: () => activate(focus)}, active && !editing);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'up') setSelected(clamp(focus - 1, SWITCH, last));
			else if (key === 'down') setSelected(clamp(focus + 1, SWITCH, last));
			else if (key === 'left') onExit();
			else if (key === 'back') onClose();
			return true; // OK goes through useOkPress
		},
		[focus, last, onExit, onClose]
	);
	useKeys(handleKey, active && !editing);

	/** The field's own keys; none of them reaches Settings or Home. */
	const onFieldKey = (e: KeyboardEvent) => {
		e.stopPropagation();
		const code = e.keyCode;
		if (code === KEY.enter) {
			e.preventDefault();
			searchNow();
			field.current?.blur();
		} else if (code === KEY.back || code === KEY.escape) {
			e.preventDefault();
			field.current?.blur();
		} else if (code === KEY.up || code === KEY.down) {
			e.preventDefault();
			field.current?.blur();
			setSelected(code === KEY.up ? SWITCH : clamp(FIRST_PLACE, SWITCH, last));
		}
	};

	const rowClass = (row: number, kind: string) =>
		`option ${kind}${active && focus === row && !(row === FIELD && editing) ? ' option--focused' : ''}`;
	const point = (row: number) => () => {
		if (editing) return;
		setSelected(row);
		onPointer();
	};

	return (
		<div class="weather-settings">
			<OptionRow
				option={{
					id: 'weather',
					label: t('weather.settings.show'),
					description: t('weather.settings.showDescription'),
					value: settings.enabled
				}}
				focused={active && focus === SWITCH}
				onHover={point(SWITCH)}
				onActivate={() => activate(SWITCH)}
			/>
			{!settings.enabled && <p class="weather-settings__note">{t('weather.settings.off')}</p>}
			{settings.enabled && (
				<>
					<div class="weather-settings__place">
						<span class="weather-settings__name">
							{settings.place
								? t('weather.settings.place', {name: placeLabel(settings.place)})
								: t('weather.settings.noPlace')}
						</span>
						{settings.place && view.status !== 'no-place' && <WeatherNow view={view} unit={unit} where="settings" />}
					</div>
					<div
						class={`${rowClass(FIELD, 'field')}${editing ? ' field--editing' : ''}`}
						onMouseEnter={point(FIELD)}
						onClick={() => activate(FIELD)}
					>
						<div class="option__label">{t('weather.search.label')}</div>
						<input
							ref={field}
							class="field__input"
							type="text"
							value={query}
							placeholder={t('weather.search.placeholder')}
							autocomplete="off"
							spellcheck={false}
							onInput={(e) => setQuery(e.currentTarget.value)}
							onKeyDown={onFieldKey}
							onFocus={() => {
								setSelected(FIELD);
								setEditing(true);
								onPointer();
							}}
							onBlur={() => setEditing(false)}
						/>
					</div>
					<p class="weather-settings__note">{searchNote(search)}</p>
					{places.map((place, i) => {
						const where = [place.region, place.country].filter((part) => part !== '').join(', ');
						return (
							<div
								key={i}
								class={rowClass(FIRST_PLACE + i, 'place')}
								onMouseEnter={point(FIRST_PLACE + i)}
								onClick={() => activate(FIRST_PLACE + i)}
							>
								<span class="place__name">{place.name}</span>
								{where && <span class="place__where">{where}</span>}
							</div>
						);
					})}
				</>
			)}
		</div>
	);
}

/** Where the search stands, in words. */
function searchNote(search: PlaceSearch): string {
	switch (search.status) {
		case 'idle':
			return t('weather.search.hint');
		case 'short':
			return t('weather.search.short', {count: PLACE_QUERY_MIN_LENGTH});
		case 'searching':
			return t('weather.search.searching');
		case 'found':
			return t('weather.search.found');
		case 'none':
			return t('weather.search.none', {query: search.query});
		case 'failed':
			return `${t('weather.search.failed')} ${errorMessage(search.error)}`;
	}
}
