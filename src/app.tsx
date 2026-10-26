import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {AppMenu, type AppMenuAction} from './components/AppMenu';
import type {OptionItem} from './components/OptionList';
import type {TileModel} from './components/Tile';
import {Toast, type ToastMessage} from './components/Toast';
import {TIMING} from './config/constants';
import {errorMessage, t, tn} from './i18n';
import {favoritesFirst, setFavorite, toggleId} from './lib/order';
import {appTile, inputTile, pickInOrder} from './lib/tiles';
import {type AppEntry, type InputSource, PlatformError, platform} from './platform';
import {Home, type HomeRow} from './screens/Home';
import {Settings, type SettingsTab} from './screens/Settings';
import {loadSettings, saveSettings, type Settings as UserSettings} from './state/settings';

type Screen = 'home' | 'settings';

/** The app list: still loading, read from the TV, or failed. */
type AppsState = {status: 'loading'} | {status: 'ready'; apps: AppEntry[]} | {status: 'failed'; error: unknown};

const ROW = {apps: 'apps', sources: 'sources', misc: 'misc'} as const;
const MISC = {lgHome: 'lg-home', settings: 'settings'} as const;

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

export function App() {
	const [screen, setScreen] = useState<Screen>('home');
	/** the app whose menu is open (OK held on it) */
	const [menuAppId, setMenuAppId] = useState<string | null>(null);
	const [loaded] = useState(loadSettings);
	const [settings, setSettings] = useState<UserSettings>(loaded.settings);
	const [appsState, setAppsState] = useState<AppsState>({status: 'loading'});
	const [inputs, setInputs] = useState<InputSource[]>([]);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const toastTimer = useRef(0);

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
				items: shownApps.map(tileOf),
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
		[shownApps, shownInputs, appsText, settings.favoriteIds]
	);

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
			}
		],
		[apps, inputs, shownApps, shownInputs, appsText, settings.favoriteIds, favoriteCount]
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
			if (tabId === ROW.apps) {
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
		} else {
			updateSettings({
				...settings,
				appIds: order.filter((id) => id !== menuApp.id),
				favoriteIds: settings.favoriteIds.filter((id) => id !== menuApp.id)
			});
			showToast(t('apps.hidden', {name: menuApp.title}));
		}
	};

	/** Replace a row's order with `keys` (the full list of what's shown). */
	const onReorder = useCallback(
		(tabId: string, keys: string[]) => {
			if (tabId === ROW.apps) updateSettings({...settings, appIds: keys});
			else updateSettings({...settings, sourceIds: keys});
		},
		[settings, updateSettings]
	);

	return (
		<>
			{/* Home stays mounted under Settings so it keeps its focus position. */}
			<Home rows={rows} active={screen === 'home' && !menuApp} onActivate={onActivate} onLongPress={onLongPress} />
			{screen === 'home' && menuApp && (
				<AppMenu app={tileOf(menuApp)} onChoose={onMenuChoose} onClose={() => setMenuAppId(null)} />
			)}
			{screen === 'settings' && (
				<Settings
					tabs={tabs}
					options={OPTIONS}
					active
					onToggle={onToggle}
					onReorder={onReorder}
					onOption={onOption}
					onClose={() => setScreen('home')}
				/>
			)}
			<Toast message={toast} />
		</>
	);
}
