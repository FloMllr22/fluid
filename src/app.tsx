import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {AppMenu, type AppMenuAction} from './components/AppMenu';
import {Background} from './components/Background';
import {LanguagePanel} from './components/LanguageChoice';
import type {OptionItem} from './components/OptionList';
import type {TileModel} from './components/Tile';
import {Toast, type ToastMessage} from './components/Toast';
import {WeatherPanel} from './components/WeatherPanel';
import {TIMING} from './config/constants';
import {useWeather} from './hooks/useWeather';
import {errorMessage, localeFor, setLocale, t, tn} from './i18n';
import {backgroundFromKey, backgroundKey, shownBackground} from './lib/backgrounds';
import {favoritesFirst, setFavorite, swapNeighbour, toggleId} from './lib/order';
import {appTile, backgroundTiles, inputTile, pickInOrder} from './lib/tiles';
import {temperatureUnit} from './lib/weather';
import {type AppEntry, type InputSource, type Place, PlatformError, platform} from './platform';
import {Home, type HomeRow, type MovingItem} from './screens/Home';
import {Settings, type SettingsPanel, type SettingsTab} from './screens/Settings';
import {type LanguageChoice, type LoadedSettings, saveSettings, type Settings as UserSettings} from './state/settings';
import {PHOTOS} from './theme/backgrounds';

type Screen = 'home' | 'settings';

/** The app list: still loading, read from the TV, or failed. */
type AppsState = {status: 'loading'} | {status: 'ready'; apps: AppEntry[]} | {status: 'failed'; error: unknown};

/** An app being moved along the Apps row (move mode), and the row's order meanwhile;
 *  stored once OK puts it down. */
interface Moving {
	id: string;
	order: string[];
}

const ROW = {apps: 'apps', sources: 'sources', misc: 'misc'} as const;
const MISC = {lgHome: 'lg-home', settings: 'settings'} as const;
/** the Settings tab that is not a Home row */
const BACKGROUND_TAB = 'background';

const PHOTO_IDS = PHOTOS.map((p) => p.id);

/** The TV's UI language, which fluid follows unless the user picks another */
const TV_LOCALE = platform.getLocale();

/** °C or °F, by the TV's region */
const UNIT = temperatureUnit(TV_LOCALE);

/** No options at the moment: the Homebrew option went when root became a requirement,
 *  and the Options tab stays hidden until the next ones arrive. */
const OPTIONS: OptionItem[] = [];

/** Why there are no apps to show yet, or undefined once they are read. A missing Homebrew
 *  Channel or root explains itself; any other failure says that the apps could not be
 *  read, and why. */
function appsProblem(state: AppsState): string | undefined {
	if (state.status === 'loading') return t('apps.loading');
	if (state.status === 'ready') return undefined;
	const code = state.error instanceof PlatformError ? state.error.code : undefined;
	const reason = errorMessage(state.error);
	const what = code === 'no-homebrew' || code === 'no-root' ? reason : `${t('apps.loadFailed')} ${reason}`;
	return `${what} ${t('apps.retryHint')}`;
}

/** A toast text: what failed, then why. */
function failure(what: string, error: unknown): string {
	return `${what} ${errorMessage(error)}`;
}

export function App({loaded}: {loaded: LoadedSettings}) {
	const [screen, setScreen] = useState<Screen>('home');
	/** the app whose menu is open (OK held on it) */
	const [menuAppId, setMenuAppId] = useState<string | null>(null);
	const [moving, setMoving] = useState<Moving | null>(null);
	const [settings, setSettings] = useState<UserSettings>(loaded.settings);
	const [appsState, setAppsState] = useState<AppsState>({status: 'loading'});
	const [inputs, setInputs] = useState<InputSource[]>([]);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const toastTimer = useRef(0);
	const weather = useWeather(settings.weather);

	const showToast = useCallback((text: string, kind: ToastMessage['kind'] = 'info') => {
		window.clearTimeout(toastTimer.current);
		setToast({text, kind});
		toastTimer.current = window.setTimeout(() => setToast(null), TIMING.toastMs);
	}, []);

	/** Keeps and stores new settings; says so when the TV's storage refuses them. */
	const updateSettings = useCallback(
		(next: UserSettings) => {
			setSettings(next);
			if (!saveSettings(next)) showToast(t('settings.saveFailed'), 'error');
		},
		[showToast]
	);

	// Settings from an older fluid are stored in the current form at once. Settings that
	// could not be read are reported, then replaced by the defaults fluid starts with, so
	// the message comes once rather than at every start.
	useEffect(() => {
		if (loaded.unreadable) {
			showToast(t('settings.loadFailed'), 'error');
			saveSettings(loaded.settings);
		} else if (loaded.migrated) updateSettings(loaded.settings);
	}, [loaded, showToast, updateSettings]);

	// Start in remote (5-way) mode: hide the Magic Remote pointer whenever we come to the
	// front. Shaking the remote still brings it back.
	useEffect(() => {
		platform.hidePointer();
		return platform.onForeground(() => platform.hidePointer());
	}, []);

	// Load apps at start. After a failure, try again whenever fluid comes back to the front:
	// the Homebrew Channel may have been installed or rooted again meanwhile, or its service
	// may just have started late after the TV booted.
	useEffect(() => {
		let failed = false;
		const load = () => {
			failed = false;
			platform.listApps().then(
				(list) => {
					setAppsState({status: 'ready', apps: list.apps});
					if (list.failedIcons > 0) showToast(tn('apps.iconsFailed', list.failedIcons), 'error');
				},
				(error: unknown) => {
					failed = true;
					setAppsState({status: 'failed', error});
				}
			);
		};
		load();
		return platform.onForeground(() => {
			if (failed) load();
		});
	}, [showToast]);

	// Refresh inputs whenever fluid comes back to the foreground (labels or connections may
	// have changed).
	useEffect(() => {
		const refresh = () => {
			platform
				.listInputs()
				.then(setInputs)
				.catch((error: unknown) => showToast(failure(t('inputs.loadFailed'), error), 'error'));
		};
		refresh();
		return platform.onForeground(refresh);
	}, [showToast]);

	// ----- derived rows -----
	const apps = useMemo(() => (appsState.status === 'ready' ? appsState.apps : []), [appsState]);
	const appsText = appsProblem(appsState);
	// the chosen apps in their order, favourites first
	const shownApps = useMemo(() => {
		const chosen = settings.appIds ? pickInOrder(apps, settings.appIds, (a) => a.id) : apps;
		const order = favoritesFirst(
			chosen.map((a) => a.id),
			settings.favoriteIds
		);
		return pickInOrder(chosen, order, (a) => a.id);
	}, [apps, settings.appIds, settings.favoriteIds]);
	// while an app is being moved, the Apps row shows the order it has meanwhile
	const rowApps = useMemo(
		() => (moving ? pickInOrder(apps, moving.order, (a) => a.id) : shownApps),
		[apps, moving, shownApps]
	);
	const isFavorite = (id: string) => settings.favoriteIds.indexOf(id) !== -1;
	const tileOf = (app: AppEntry) => appTile(app, isFavorite(app.id));
	const favoriteCount = shownApps.filter((a) => isFavorite(a.id)).length;
	const shownInputs = useMemo(
		() => (settings.sourceIds ? pickInOrder(inputs, settings.sourceIds, (s) => s.appId) : inputs),
		[inputs, settings.sourceIds]
	);

	const rows: HomeRow[] = useMemo(
		() => [
			{
				id: ROW.apps,
				label: t('rows.apps'),
				items: rowApps.map(tileOf),
				emptyText: appsText || t('apps.noneSelected')
			},
			{
				id: ROW.sources,
				label: t('rows.sources'),
				items: shownInputs.map(inputTile),
				emptyText: t('inputs.noneSelected')
			},
			{
				id: ROW.misc,
				label: t('rows.more'),
				items: [
					{key: MISC.lgHome, label: t('home.lgHome'), glyph: 'house'},
					{key: MISC.settings, label: t('home.settings'), glyph: 'gear'}
				]
			}
		],
		[rowApps, shownInputs, appsText, settings.favoriteIds, settings.language]
	);

	// the stored background as it can be drawn: a photo this fluid lacks falls back
	const background = useMemo(() => shownBackground(settings.background, PHOTO_IDS), [settings.background]);
	// named in the user's language, again when it changes
	const backgroundChoices = useMemo(() => backgroundTiles(PHOTOS), [settings.language]);

	const tabs: SettingsTab[] = useMemo(
		() => [
			{
				id: ROW.apps,
				label: t('rows.apps'),
				reorderLabel: t('settings.reorder.apps'),
				items: apps.map(tileOf),
				shown: shownApps.map(tileOf),
				pinned: favoriteCount,
				emptyText: appsText || t('apps.noneFound')
			},
			{
				id: ROW.sources,
				label: t('rows.sources'),
				reorderLabel: t('settings.reorder.sources'),
				items: inputs.map(inputTile),
				shown: shownInputs.map(inputTile),
				emptyText: t('inputs.noneFound')
			},
			{
				id: BACKGROUND_TAB,
				label: t('settings.background'),
				items: backgroundChoices,
				shown: backgroundChoices.filter((tile) => tile.key === backgroundKey(background)),
				emptyText: t('rows.empty') // never: the colours are always there
			}
		],
		[
			apps,
			inputs,
			shownApps,
			shownInputs,
			appsText,
			settings.favoriteIds,
			favoriteCount,
			backgroundChoices,
			background,
			settings.language
		]
	);

	// ----- actions -----
	const open = (id: string, label: string) => {
		platform
			.launch(id)
			.catch((error: unknown) => showToast(failure(t('launch.failed', {name: label}), error), 'error'));
	};

	const onActivate = useCallback(
		(rowId: string, item: TileModel) => {
			if (rowId === ROW.misc) {
				if (item.key === MISC.settings) setScreen('settings');
				else if (item.key === MISC.lgHome)
					platform
						.launchLgHome()
						.catch((error: unknown) =>
							showToast(failure(t('launch.failed', {name: t('home.lgHome')}), error), 'error')
						);
				return;
			}
			open(item.key, item.label);
		},
		[showToast]
	);

	const onToggle = useCallback(
		(tabId: string, key: string) => {
			if (tabId === BACKGROUND_TAB) {
				const picked = backgroundFromKey(key);
				if (picked) updateSettings({...settings, background: picked});
			} else if (tabId === ROW.apps) {
				const appIds = toggleId(settings.appIds || apps.map((a) => a.id), key);
				// a hidden app is no favourite any more
				const favoriteIds = settings.favoriteIds.filter((id) => appIds.indexOf(id) !== -1);
				updateSettings({...settings, appIds, favoriteIds});
			} else {
				const current = settings.sourceIds || inputs.map((s) => s.appId);
				updateSettings({...settings, sourceIds: toggleId(current, key)});
			}
		},
		[settings, apps, inputs, updateSettings]
	);

	const onBackgroundError = useCallback(() => showToast(t('background.loadFailed'), 'error'), [showToast]);

	/** Turning the weather off keeps the place, for when it is turned on again. */
	const onWeatherToggle = useCallback(
		() => updateSettings({...settings, weather: {...settings.weather, enabled: !settings.weather.enabled}}),
		[settings, updateSettings]
	);

	const onPickPlace = useCallback(
		(place: Place) => updateSettings({...settings, weather: {...settings.weather, place}}),
		[settings, updateSettings]
	);

	/** Every text switches at once: the language is set before the next frame is drawn,
	 *  and each list of texts above depends on it. */
	const onLanguage = useCallback(
		(language: LanguageChoice) => {
			if (language === settings.language) return;
			setLocale(localeFor(language, TV_LOCALE));
			updateSettings({...settings, language});
		},
		[settings, updateSettings]
	);

	const panels: SettingsPanel[] = [
		{
			id: 'weather',
			label: t('settings.weather'),
			hint: t('settings.hint.weather'),
			render: (nav) => (
				<WeatherPanel
					settings={settings.weather}
					view={weather}
					unit={UNIT}
					onToggle={onWeatherToggle}
					onPick={onPickPlace}
					{...nav}
				/>
			)
		},
		{
			id: 'language',
			label: t('settings.language'),
			hint: t('settings.hint.language'),
			render: (nav) => <LanguagePanel chosen={settings.language} tvLocale={TV_LOCALE} onChoose={onLanguage} {...nav} />
		}
	];

	const onOption = useCallback(() => {
		/* no options at the moment, see OPTIONS */
	}, []);

	/** Holding OK on an app opens its menu; on anything else it simply opens the item. */
	const onLongPress = useCallback(
		(rowId: string, item: TileModel) => {
			if (rowId === ROW.apps) setMenuAppId(item.key);
			else onActivate(rowId, item);
		},
		[onActivate]
	);

	const menuApp = menuAppId === null ? undefined : shownApps.find((a) => a.id === menuAppId);

	const onMenuChoose = (action: AppMenuAction) => {
		setMenuAppId(null);
		if (!menuApp || action === 'cancel') return;
		const order = shownApps.map((a) => a.id);
		if (action === 'favorite') {
			const next = setFavorite(order, settings.favoriteIds, menuApp.id, !isFavorite(menuApp.id));
			updateSettings({...settings, appIds: next.order, favoriteIds: next.favoriteIds});
		} else if (action === 'move') {
			setMoving({id: menuApp.id, order});
		} else {
			updateSettings({
				...settings,
				appIds: order.filter((id) => id !== menuApp.id),
				favoriteIds: settings.favoriteIds.filter((id) => id !== menuApp.id)
			});
			showToast(t('apps.hidden', {name: menuApp.title}));
		}
	};

	/** Move mode: ← → swap the app with its neighbour, within its group (favourites or not). */
	const onMove = useCallback(
		(step: -1 | 1) => {
			setMoving((m) => {
				if (!m) return m;
				const order = swapNeighbour(m.order, settings.favoriteIds, m.id, step);
				return order === m.order ? m : {...m, order};
			});
		},
		[settings.favoriteIds]
	);

	/** OK stores the new order, Back drops it. An app put down where it was changes
	 *  nothing, so a row of all apps (no choice stored yet) stays one. */
	const onMoveEnd = useCallback(
		(keep: boolean) => {
			setMoving(null);
			if (!keep || !moving) return;
			const saved = shownApps.map((a) => a.id);
			if (moving.order.some((id, i) => id !== saved[i])) updateSettings({...settings, appIds: moving.order});
		},
		[moving, shownApps, settings, updateSettings]
	);

	const movingItem = useMemo((): MovingItem | undefined => {
		if (!moving) return undefined;
		const canMove = (step: -1 | 1) =>
			swapNeighbour(moving.order, settings.favoriteIds, moving.id, step) !== moving.order;
		return {rowId: ROW.apps, key: moving.id, arrows: {left: canMove(-1), right: canMove(1)}};
	}, [moving, settings.favoriteIds]);

	/** Replace a row's order with `keys` (the full list of what's shown). */
	const onReorder = useCallback(
		(tabId: string, keys: string[]) => {
			if (tabId === ROW.apps) updateSettings({...settings, appIds: keys});
			else updateSettings({...settings, sourceIds: keys});
		},
		[settings, updateSettings]
	);

	return (
		<div class={background.kind === 'color' ? 'app' : 'app app--photo'}>
			<Background background={background} photos={PHOTOS} onError={onBackgroundError} />
			{/* Home stays mounted under Settings so it keeps its focus position. */}
			<Home
				rows={rows}
				weather={weather}
				unit={UNIT}
				active={screen === 'home' && !menuApp}
				hidden={screen !== 'home'}
				onActivate={onActivate}
				onLongPress={onLongPress}
				moving={movingItem}
				onMove={onMove}
				onMoveEnd={onMoveEnd}
			/>
			{screen === 'home' && menuApp && (
				<AppMenu app={tileOf(menuApp)} onChoose={onMenuChoose} onClose={() => setMenuAppId(null)} />
			)}
			{screen === 'settings' && (
				<Settings
					tabs={tabs}
					panels={panels}
					options={OPTIONS}
					active
					onToggle={onToggle}
					onReorder={onReorder}
					onOption={onOption}
					onClose={() => setScreen('home')}
				/>
			)}
			<Toast message={toast} />
		</div>
	);
}
