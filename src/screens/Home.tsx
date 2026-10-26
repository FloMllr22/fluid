import {useCallback, useEffect, useState} from 'preact/hooks';
import {AppList, listRowTop, type MoveArrows} from '../components/AppList';
import {AppMenu, type AppMenuAction} from '../components/AppMenu';
import {Bar} from '../components/Bar';
import {Greeting} from '../components/Greeting';
import type {TileModel} from '../components/Tile';
import {WeatherNow} from '../components/WeatherNow';
import {useClock} from '../hooks/useClock';
import {type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {t} from '../i18n';
import {focusIndex, followItem, type RowFocus} from '../lib/focus';
import {BAR_ITEMS, type HomeFocus, homeStep, homeZone} from '../lib/home';
import type {TemperatureUnit, WeatherView} from '../lib/weather';

/** The app being moved along the list, and which ways it can go. */
export interface MovingApp {
	key: string;
	arrows: MoveArrows;
}

/** An app's menu, open beside it. */
export interface OpenMenu {
	app: TileModel;
	onChoose: (action: AppMenuAction) => void;
	onClose: () => void;
}

interface Props {
	apps: TileModel[];
	/** says why there are no apps: still loading, failed, or none chosen */
	appsEmptyText: string;
	sources: TileModel[];
	sourcesEmptyText: string;
	/** the weather at the foot; nothing while it is off */
	weather: WeatherView;
	unit: TemperatureUnit;
	active: boolean;
	/** another screen is in front: Home stays mounted, keeping its focus, but is not drawn */
	hidden?: boolean;
	/** OK on an app or a source */
	onOpen: (item: TileModel) => void;
	onLgHome: () => void;
	onSettings: () => void;
	/** OK held on an app, or the pointer's button held on it */
	onAppMenu: (app: TileModel) => void;
	/** the focused app's menu, open beside it; it then has the keys */
	menu?: OpenMenu;
	/** move mode: the focused app, being moved; the list shows its new place as it goes */
	moving?: MovingApp;
	/** ↑ or ↓ in move mode */
	onMove: (step: -1 | 1) => void;
	/** OK (keep the new place) or Back (put it back) in move mode */
	onMoveEnd: (keep: boolean) => void;
}

/** The home screen: the apps in a list on the left, Sources, LG Home and Settings at the
 *  top right, the greeting with date and time at the foot, and the weather.
 *  In the list ↑ ↓ move and → goes to the bar; in the bar ← → move, ← from Sources or ↓
 *  go back to the list (see homeStep). OK opens what has focus; on Sources it opens the
 *  menu of the inputs below it (↑ ↓ choose, OK switches, Back closes). Holding OK on an
 *  app opens its menu beside it.
 *  Move mode is a variant of this: the focused app stays focused and lifted while ↑ ↓
 *  move it along the list, OK keeps its new place and Back cancels. Focus is kept by app,
 *  so it follows the app and stays on it afterwards. */
export function Home({
	apps,
	appsEmptyText,
	sources,
	sourcesEmptyText,
	weather,
	unit,
	active,
	hidden,
	onOpen,
	onLgHome,
	onSettings,
	onAppMenu,
	menu,
	moving,
	onMove,
	onMoveEnd
}: Props) {
	const now = useClock();
	const timeFormat = useTimeFormat();
	/** where focus is; the app is kept apart, by key (appFocus) */
	const [focus, setFocus] = useState<HomeFocus>({zone: 'apps', app: 0, bar: 0, source: 0});
	const [appFocus, setAppFocus] = useState<RowFocus | undefined>(undefined);

	const keys = apps.map((app) => app.key);
	const app = focusIndex(keys, appFocus);
	const counts = {apps: apps.length, sources: sources.length};
	const current: HomeFocus = {...focus, app};
	const zone = homeZone(current, counts);

	const focusApp = (index: number) => {
		if (apps[index]) setAppFocus({key: apps[index].key, index});
		setFocus((f) => ({...f, zone: 'apps'}));
	};
	const moveTo = (next: HomeFocus) => {
		if (next.app !== app) focusApp(next.app);
		setFocus(next);
	};

	/** Sources opens its menu; LG Home and Settings close it (the pointer reaches them
	 *  while it is open), so that it is not open still when fluid shows Home again. */
	const activateBar = (index: number) => {
		const item = BAR_ITEMS[index];
		setFocus((f) => ({...f, zone: item === 'sources' ? 'sources' : 'bar', bar: index, source: 0}));
		if (item === 'lg-home') onLgHome();
		else if (item === 'settings') onSettings();
	};
	const pickSource = (index: number) => {
		setFocus((f) => ({...f, zone: 'bar'}));
		if (sources[index]) onOpen(sources[index]);
	};
	const closeSources = () => setFocus((f) => ({...f, zone: 'bar'}));

	const press = (held: boolean) => () => {
		if (zone === 'apps') {
			if (apps[app]) (held ? onAppMenu : onOpen)(apps[app]);
		} else if (zone === 'bar') activateBar(focus.bar);
		else if (sources.length === 0) closeSources();
		else pickSource(focus.source);
	};

	// In move mode OK puts the app down; holding OK does nothing there, so that move mode
	// never ends while OK is still held (its release would then open the app). Move mode
	// is opened from the menu, possibly by holding OK: then OK counts once released.
	const drop = () => onMoveEnd(true);
	useOkPress(
		moving ? {onPress: drop, onLongPress: () => undefined} : {onPress: press(false), onLongPress: press(true)},
		active,
		moving !== undefined
	);

	// When the list changes order, the remembered place moves with its app: hiding the
	// focused app then leaves focus where that app last was.
	useEffect(() => {
		setAppFocus((remembered) => (remembered ? followItem(keys, remembered) : remembered));
	}, [apps]);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (moving) {
				if (key === 'up') onMove(-1);
				else if (key === 'down') onMove(1);
				else if (key === 'back') onMoveEnd(false);
				return true; // OK goes through useOkPress; ← → stay in the list
			}
			if (key === 'enter') return true; // handled by useOkPress (press vs hold)
			if (key === 'back') {
				if (zone === 'sources') closeSources();
				return true; // otherwise swallowed: Back on the home screen does nothing
			}
			moveTo(homeStep(current, key, counts));
			return true;
		},
		[apps, sources, focus, appFocus, moving, onMove, onMoveEnd]
	);

	useKeys(handleKey, active);

	const movingApp = moving ? apps.find((item) => item.key === moving.key) : undefined;
	const note = moving ? t('move.hint') : menu ? t('menu.hint') : zone === 'sources' ? t('sources.hint') : undefined;
	const classes = ['screen', 'home', hidden && 'screen--hidden', moving && 'home--moving'].filter(Boolean).join(' ');

	// In move mode the pointer neither moves focus nor opens anything: it clicks the
	// arrows, or the moving app to put it down. Holding the pointer's button focuses the
	// app before its menu opens, as the arrow keys may have moved focus away meanwhile:
	// the menu, and move mode, act on the focused app. While a menu is open, a click
	// anywhere else closes it.
	return (
		<div class={classes}>
			<AppList
				items={apps}
				emptyText={appsEmptyText}
				focused={zone === 'apps' || moving !== undefined || menu !== undefined}
				selected={app}
				moving={moving?.arrows}
				dimmed={moving !== undefined || menu !== undefined}
				onSelect={(i) => {
					if (!moving && !menu) focusApp(i);
				}}
				onActivate={(i) => {
					if (!moving) onOpen(apps[i]);
					else if (i === app) drop();
				}}
				onLongPress={(i) => {
					if (moving) return;
					focusApp(i);
					onAppMenu(apps[i]);
				}}
				onMove={onMove}
			/>
			<Greeting now={now} format={timeFormat} moving={movingApp?.label} note={note} />
			<WeatherNow view={weather} unit={unit} where="home" />
			{zone === 'sources' && <div class="catcher" onClick={closeSources} />}
			<Bar
				focus={zone === 'bar' && !moving ? focus.bar : -1}
				sources={sources}
				sourcesEmptyText={sourcesEmptyText}
				sourcesOpen={zone === 'sources'}
				sourceFocus={focus.source}
				onPoint={(i) => {
					if (!moving && zone !== 'sources') setFocus((f) => ({...f, zone: 'bar', bar: i}));
				}}
				onActivate={(i) => {
					if (moving) return;
					if (zone === 'sources' && BAR_ITEMS[i] === 'sources') closeSources();
					else activateBar(i);
				}}
				onPointSource={(i) => setFocus((f) => ({...f, source: i}))}
				onPickSource={pickSource}
			/>
			{menu && !hidden && apps[app] && (
				<AppMenu
					app={menu.app}
					rowTop={listRowTop(apps.length, app, app)}
					onChoose={menu.onChoose}
					onClose={menu.onClose}
				/>
			)}
		</div>
	);
}
