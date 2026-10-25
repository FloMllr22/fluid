import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import type {OptionItem} from './components/OptionList';
import type {TileModel} from './components/Tile';
import {Toast, type ToastMessage} from './components/Toast';
import {TIMING} from './config/constants';
import {loadConfig, saveConfig, toggleId, type UserConfig} from './lib/storage';
import {appTile, inputTile, pickInOrder} from './lib/tiles';
import {type AppEntry, type InputSource, PlatformError, platform} from './platform';
import {Home, type HomeRow} from './screens/Home';
import {Settings, type SettingsTab} from './screens/Settings';

type Screen = 'home' | 'settings';

/** The app list: still loading, read from the TV, or failed. */
type AppsState = {status: 'loading'} | {status: 'ready'; apps: AppEntry[]} | {status: 'failed'; error: unknown};

const ROW = {apps: 'apps', sources: 'sources', misc: 'misc'} as const;
const MISC = {lgHome: 'lg-home', settings: 'settings'} as const;

const MISC_TILES: TileModel[] = [
	{key: MISC.lgHome, label: 'LG Home', glyph: 'house'},
	{key: MISC.settings, label: 'Settings', glyph: 'gear'}
];

/** No options at the moment: the Homebrew option went when root became a requirement,
 *  and the Options tab stays hidden until the next ones arrive. */
const OPTIONS: OptionItem[] = [];

const APPS_TEXT = {
	loading: 'Loading apps…',
	none: 'No apps selected — add some in Settings',
	noneFound: 'The TV lists no apps',
	noHomebrew: 'fluid needs the Homebrew Channel to show your apps. Install it on a rooted TV, then come back to fluid.',
	noRoot:
		'The Homebrew Channel has no root access, so fluid cannot read your apps. A firmware update may have removed root: root the TV again, then come back to fluid.',
	failed: "Couldn't read your apps. fluid tries again when you come back to it."
} as const;

const INPUTS_TEXT = {
	none: 'No sources selected',
	noneFound: 'The TV reports no inputs'
} as const;

/** Why there are no apps to show yet, or undefined once they are read. */
function appsProblem(state: AppsState): string | undefined {
	if (state.status === 'loading') return APPS_TEXT.loading;
	if (state.status === 'ready') return undefined;
	const code = state.error instanceof PlatformError ? state.error.code : undefined;
	if (code === 'no-homebrew') return APPS_TEXT.noHomebrew;
	if (code === 'no-root') return APPS_TEXT.noRoot;
	return APPS_TEXT.failed;
}

export function App() {
	const [screen, setScreen] = useState<Screen>('home');
	const [config, setConfig] = useState<UserConfig>(loadConfig);
	const [appsState, setAppsState] = useState<AppsState>({status: 'loading'});
	const [inputs, setInputs] = useState<InputSource[]>([]);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const toastTimer = useRef(0);

	const showToast = useCallback((text: string, kind: ToastMessage['kind'] = 'info') => {
		window.clearTimeout(toastTimer.current);
		setToast({text, kind});
		toastTimer.current = window.setTimeout(() => setToast(null), TIMING.toastMs);
	}, []);

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
				(list) => setAppsState({status: 'ready', apps: list.apps}),
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
	}, []);

	// Refresh inputs whenever fluid comes back to the foreground (labels or connections may
	// have changed).
	useEffect(() => {
		const refresh = () => {
			platform
				.listInputs()
				.then(setInputs)
				.catch(() => showToast('Could not read the inputs', 'error'));
		};
		refresh();
		return platform.onForeground(refresh);
	}, [showToast]);

	const updateConfig = (next: UserConfig) => {
		setConfig(next);
		saveConfig(next);
	};

	// ----- derived rows -----
	const apps = useMemo(() => (appsState.status === 'ready' ? appsState.apps : []), [appsState]);
	const appsText = appsProblem(appsState);
	const shownApps = useMemo(
		() => (config.appIds ? pickInOrder(apps, config.appIds, (a) => a.id) : apps),
		[apps, config.appIds]
	);
	const shownInputs = useMemo(
		() => (config.sourceIds ? pickInOrder(inputs, config.sourceIds, (s) => s.appId) : inputs),
		[inputs, config.sourceIds]
	);

	const rows: HomeRow[] = useMemo(
		() => [
			{id: ROW.apps, label: 'Apps', items: shownApps.map(appTile), emptyText: appsText || APPS_TEXT.none},
			{id: ROW.sources, label: 'Sources', items: shownInputs.map(inputTile), emptyText: INPUTS_TEXT.none},
			{id: ROW.misc, label: 'More', items: MISC_TILES}
		],
		[shownApps, shownInputs, appsText]
	);

	const tabs: SettingsTab[] = useMemo(
		() => [
			{
				id: ROW.apps,
				label: 'Apps',
				noun: 'apps',
				items: apps.map(appTile),
				shown: shownApps.map(appTile),
				emptyText: appsText || APPS_TEXT.noneFound
			},
			{
				id: ROW.sources,
				label: 'Sources',
				noun: 'sources',
				items: inputs.map(inputTile),
				shown: shownInputs.map(inputTile),
				emptyText: INPUTS_TEXT.noneFound
			}
		],
		[apps, inputs, shownApps, shownInputs, appsText]
	);

	// ----- actions -----
	const open = (id: string, label: string) => {
		platform.launch(id).catch(() => showToast(`Couldn't open ${label}`, 'error'));
	};

	const onActivate = useCallback(
		(rowId: string, item: TileModel) => {
			if (rowId === ROW.misc) {
				if (item.key === MISC.settings) setScreen('settings');
				else if (item.key === MISC.lgHome)
					platform.launchLgHome().catch(() => showToast("Couldn't open LG Home", 'error'));
				return;
			}
			open(item.key, item.label);
		},
		[showToast]
	);

	const onToggle = useCallback(
		(tabId: string, key: string) => {
			if (tabId === ROW.apps) {
				const current = config.appIds || apps.map((a) => a.id);
				updateConfig({...config, appIds: toggleId(current, key)});
			} else {
				const current = config.sourceIds || inputs.map((s) => s.appId);
				updateConfig({...config, sourceIds: toggleId(current, key)});
			}
		},
		[config, apps, inputs]
	);

	const onOption = useCallback(() => {
		/* no options at the moment, see OPTIONS */
	}, []);

	/** Replace a row's order with `keys` (the full list of what's shown). */
	const onReorder = useCallback(
		(tabId: string, keys: string[]) => {
			if (tabId === ROW.apps) updateConfig({...config, appIds: keys});
			else updateConfig({...config, sourceIds: keys});
		},
		[config]
	);

	return (
		<>
			{/* Home stays mounted under Settings so it keeps its focus position. */}
			<Home rows={rows} active={screen === 'home'} onActivate={onActivate} />
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
