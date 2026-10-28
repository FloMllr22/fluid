import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {AppearancePanel} from './components/AppearancePanel';
import type {AppMenuAction} from './components/AppMenu';
import {Background} from './components/Background';
import {LanguagePanel} from './components/LanguageChoice';
import type {OptionItem} from './components/OptionList';
import type {TileModel} from './components/Tile';
import {Toast, type ToastMessage} from './components/Toast';
import {WeatherPanel} from './components/WeatherPanel';
import {TIMING} from './config/constants';
import {useWeather} from './hooks/useWeather';
import {errorMessage, localeFor, setLocale, t, tn} from './i18n';
import {sameApps, withNewApps} from './lib/apps';
import {backgroundFromKey, backgroundKey, shownBackground} from './lib/backgrounds';
import {favoritesFirst, setFavorite, swapNeighbour, toggleId} from './lib/order';
import {appTile, backgroundTiles, inputTile, pickInOrder} from './lib/tiles';
import {temperatureUnit} from './lib/weather';
import {markFrame} from './perf';
import {type AppEntry, type InputSource, type Place, PlatformError, platform} from './platform';
import {Home, type MovingApp} from './screens/Home';
import {Onboarding} from './screens/Onboarding';
import {Settings, type SettingsPanel, type SettingsTab} from './screens/Settings';
import {
	type Appearance,
	type LanguageChoice,
	type LoadedSettings,
	saveSettings,
	type Settings as UserSettings
} from './state/settings';
import {applyAppearance} from './theme/appearance';
import {PHOTOS} from './theme/backgrounds';

type Screen = 'home' | 'settings';

/** The app list: still loading, read from the TV, or failed. */
type AppsState = {status: 'loading'} | {status: 'ready'; apps: AppEntry[]} | {status: 'failed'; error: unknown};

/** An app being moved along the list on Home (move mode), and the list's order meanwhile;
 *  stored once OK puts it down. */
interface Moving {
	id: string;
	order: string[];
}

/** the grid tabs of Settings: the apps and the sources shown on Home, and the background */
const TAB = {apps: 'apps', sources: 'sources', background: 'background'} as const;

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
	/** the first start: the onboarding runs, and the settings are a draft until it is done */
	const [onboarding, setOnboarding] = useState(loaded.firstStart);
	const draft = useRef(loaded.firstStart);
	const toastTimer = useRef(0);
	const weather = useWeather(settings.weather);

	const showToast = useCallback((text: string, kind: ToastMessage['kind'] = 'info') => {
		window.clearTimeout(toastTimer.current);
		setToast({text, kind});
		toastTimer.current = window.setTimeout(() => setToast(null), TIMING.toastMs);
	}, []);

	/** Keeps and stores new settings; says so when the TV's storage refuses them. During
	 *  the onboarding they are only kept: nothing is stored before it is done, so it comes
	 *  again if the TV is switched off halfway. */
	const updateSettings = useCallback(
		(next: UserSettings) => {
			setSettings(next);
			if (!draft.current && !saveSettings(next)) showToast(t('settings.saveFailed'), 'error');
		},
		[showToast]
	);

	const finishOnboarding = useCallback(() => {
		draft.current = false;
		setOnboarding(false);
		if (!saveSettings(settings)) showToast(t('settings.saveFailed'), 'error');
	}, [settings, showToast]);

	// The look follows the settings before the next frame is drawn, the first one included.
	useLayoutEffect(() => applyAppearance(settings.appearance), [settings.appearance]);

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

	// Load apps at start, and read them again whenever fluid comes back to the front: apps
	// may have been installed or uninstalled meanwhile (in LG's store, on LG Home, in the
	// Homebrew Channel). After a failure the Homebrew Channel may also have been installed
	// or rooted again, or its service may just have started late after the TV booted. A
	// reading that changes nothing is not drawn again, so icons that still fail are not
	// reported again either; one that fails while apps are shown leaves them, and says so.
	useEffect(() => {
		let shown: AppEntry[] | undefined;
		let reading = false;
		const load = () => {
			if (reading) return;
			reading = true;
			platform.listApps().then(
				(list) => {
					reading = false;
					if (shown && sameApps(shown, list.apps)) return;
					shown = list.apps;
					setAppsState({status: 'ready', apps: list.apps});
					markFrame('appsShown');
					// a move under way was of the list as it was: it is dropped, not stored
					setMoving(null);
					if (list.failedIcons > 0) showToast(tn('apps.iconsFailed', list.failedIcons), 'error');
				},
				(error: unknown) => {
					reading = false;
					if (shown) showToast(failure(t('apps.refreshFailed'), error), 'error');
					else setAppsState({status: 'failed', error});
				}
			);
		};
		load();
		return platform.onForeground(load);
	}, [showToast]);

	// An app installed since the list was last read joins Home (see withNewApps).
	useEffect(() => {
		if (appsState.status !== 'ready') return;
		const next = withNewApps(
			settings,
			appsState.apps.map((a) => a.id)
		);
		if (next !== settings) updateSettings(next);
	}, [appsState]);

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
	// while an app is being moved, the list shows the order it has meanwhile
	const listApps = useMemo(
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

	const homeApps = useMemo(() => listApps.map(tileOf), [listApps, settings.favoriteIds]);
	// Live TV is named in the user's language, again when it changes
	const homeSources = useMemo(() => shownInputs.map(inputTile), [shownInputs, settings.language]);

	// the stored background as it can be drawn: a photo this fluid lacks falls back
	const background = useMemo(() => shownBackground(settings.background, PHOTO_IDS), [settings.background]);
	// named in the user's language, again when it changes
	const backgroundChoices = useMemo(() => backgroundTiles(PHOTOS), [settings.language]);

	const tabs: SettingsTab[] = useMemo(
		() => [
			{
				id: TAB.apps,
				label: t('rows.apps'),
				reorderLabel: t('settings.reorder.apps'),
				items: apps.map(tileOf),
				shown: shownApps.map(tileOf),
				pinned: favoriteCount,
				emptyText: appsText || t('apps.noneFound')
			},
			{
				id: TAB.sources,
				label: t('rows.sources'),
				reorderLabel: t('settings.reorder.sources'),
				items: inputs.map(inputTile),
				shown: shownInputs.map(inputTile),
				emptyText: t('inputs.noneFound')
			},
			{
				id: TAB.background,
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

	/** a grid tab of Settings, for the onboarding */
	const tabById = (id: string): SettingsTab => tabs.find((tab) => tab.id === id) || tabs[0];

	// ----- actions -----
	const open = (id: string, label: string) => {
		platform
			.launch(id)
			.catch((error: unknown) => showToast(failure(t('launch.failed', {name: label}), error), 'error'));
	};

	const onOpen = useCallback((item: TileModel) => open(item.key, item.label), [showToast]);

	const onLgHome = useCallback(() => {
		platform
			.launchLgHome()
			.catch((error: unknown) => showToast(failure(t('launch.failed', {name: t('home.lgHome')}), error), 'error'));
	}, [showToast]);

	const onSettings = useCallback(() => setScreen('settings'), []);

	/** An app or source added goes to Home where the grid shows it (`order`). */
	const onToggle = useCallback(
		(tabId: string, key: string, order: string[]) => {
			if (tabId === TAB.background) {
				const picked = backgroundFromKey(key);
				if (picked) updateSettings({...settings, background: picked});
			} else if (tabId === TAB.apps) {
				const appIds = toggleId(settings.appIds || apps.map((a) => a.id), key, order);
				// a hidden app is no favourite any more
				const favoriteIds = settings.favoriteIds.filter((id) => appIds.indexOf(id) !== -1);
				updateSettings({...settings, appIds, favoriteIds});
			} else {
				const current = settings.sourceIds || inputs.map((s) => s.appId);
				updateSettings({...settings, sourceIds: toggleId(current, key, order)});
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

	const onAppearance = useCallback(
		(appearance: Appearance) => updateSettings({...settings, appearance}),
		[settings, updateSettings]
	);

	const panels: SettingsPanel[] = [
		{
			id: 'appearance',
			label: t('settings.appearance'),
			hint: t('settings.hint.appearance'),
			render: (nav) => <AppearancePanel appearance={settings.appearance} onChange={onAppearance} {...nav} />
		},
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

	/** Holding OK on an app opens its menu. */
	const onAppMenu = useCallback((item: TileModel) => setMenuAppId(item.key), []);

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

	/** Move mode: ↑ ↓ swap the app with its neighbour, within its group (favourites or not). */
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
	 *  nothing, so a list of all apps (no choice stored yet) stays one. */
	const onMoveEnd = useCallback(
		(keep: boolean) => {
			setMoving(null);
			if (!keep || !moving) return;
			const saved = shownApps.map((a) => a.id);
			if (moving.order.some((id, i) => id !== saved[i])) updateSettings({...settings, appIds: moving.order});
		},
		[moving, shownApps, settings, updateSettings]
	);

	const movingApp = useMemo((): MovingApp | undefined => {
		if (!moving) return undefined;
		const canMove = (step: -1 | 1) =>
			swapNeighbour(moving.order, settings.favoriteIds, moving.id, step) !== moving.order;
		return {key: moving.id, arrows: {up: canMove(-1), down: canMove(1)}};
	}, [moving, settings.favoriteIds]);

	/** Replace a row's order with `keys` (the full list of what's shown). */
	const onReorder = useCallback(
		(tabId: string, keys: string[]) => {
			if (tabId === TAB.apps) updateSettings({...settings, appIds: keys});
			else updateSettings({...settings, sourceIds: keys});
		},
		[settings, updateSettings]
	);

	return (
		<div class={background.kind === 'color' ? 'app' : 'app app--photo'}>
			<Background background={background} photos={PHOTOS} onError={onBackgroundError} />
			{/* Home stays mounted under Settings so it keeps its focus position. */}
			<Home
				apps={homeApps}
				appsEmptyText={appsText || t('apps.noneSelected')}
				sources={homeSources}
				sourcesEmptyText={t('inputs.noneSelected')}
				weather={weather}
				unit={UNIT}
				appearance={settings.appearance}
				active={screen === 'home' && !menuApp && !onboarding}
				hidden={screen !== 'home' || onboarding}
				onOpen={onOpen}
				onLgHome={onLgHome}
				onSettings={onSettings}
				onAppMenu={onAppMenu}
				menu={
					screen === 'home' && menuApp
						? {app: tileOf(menuApp), onChoose: onMenuChoose, onClose: () => setMenuAppId(null)}
						: undefined
				}
				moving={movingApp}
				onMove={onMove}
				onMoveEnd={onMoveEnd}
			/>
			{onboarding && (
				<Onboarding
					language={settings.language}
					tvLocale={TV_LOCALE}
					onLanguage={onLanguage}
					apps={tabById(TAB.apps)}
					background={tabById(TAB.background)}
					onToggle={onToggle}
					onReorder={onReorder}
					onFinish={finishOnboarding}
					active
				/>
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
