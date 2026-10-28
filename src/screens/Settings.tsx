import type {ComponentChildren} from 'preact';
import {useCallback, useState} from 'preact/hooks';
import {Grid} from '../components/Grid';
import {type OptionItem, OptionList} from '../components/OptionList';
import {timeText} from '../components/Time';
import {useClock} from '../hooks/useClock';
import {type SettingsTab, useGridTab} from '../hooks/useGridTab';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {t} from '../i18n';
import {LAYOUT} from '../theme/tokens';

export type {SettingsTab} from '../hooks/useGridTab';

/** How Settings hands the keys to a panel, and takes them back. */
export interface PanelNav {
	/** has the remote's keys */
	active: boolean;
	/** ← from the panel's left edge: back to the tabs */
	onExit: () => void;
	/** Back: home */
	onClose: () => void;
	/** the pointer points into the panel, which then takes the keys */
	onPointer: () => void;
}

/** A tab with content of its own (Weather, Language), which takes the keys while focus is
 *  in it. */
export interface SettingsPanel {
	id: string;
	label: string;
	/** the key hint at the foot */
	hint: string;
	render: (nav: PanelNav) => ComponentChildren;
}

interface Props {
	tabs: SettingsTab[];
	/** tabs of their own, after the grid tabs */
	panels: SettingsPanel[];
	options: OptionItem[];
	active: boolean;
	/** OK on an item: add or remove it, or on a tab for picking, pick it */
	onToggle: (tabId: string, key: string, order: string[]) => void;
	onReorder: (tabId: string, keys: string[]) => void;
	onOption: (optionId: string) => void;
	onClose: () => void;
}

/** Focus is on the tabs (left), the re-order button, or in the tab's content. */
type Zone = 'tabs' | 'button' | 'content';

const COLS = LAYOUT.settingsGridColumns;

/** Settings: pick which apps and sources Home shows and their order, the background,
 *  plus panels (weather, language) and options.
 *
 *  The tabs stand one below the other on the left, the open tab's content on the right:
 *  ↑ ↓ choose a tab, → or OK go into its content, ← from its left edge comes back.
 *  Tabs: one grid tab for the apps and one for the sources, then Background, the panels,
 *  then Options if there are any.
 *  Grid tabs, select mode: everything available, what's on the home screen first and in
 *  its order; OK adds/removes an item, which stays in place.
 *  Grid tabs, re-order mode (hold OK or the pointer's button on an item, which is then
 *  picked up, or the button above the grid): only what's on the home screen, in order;
 *  OK picks an item up, arrows move it, OK puts it down. Hold OK or press Done to leave.
 *  Background tab: previews of every background; OK picks one, which shows at once.
 *  Panels: their own content, which takes the keys while focus is in it. */
export function Settings({tabs, panels, options, active, onToggle, onReorder, onOption, onClose}: Props) {
	const [tabIndex, setTabIndex] = useState(0);
	const [zone, setZone] = useState<Zone>('tabs');
	const [optionIndex, setOptionIndex] = useState(0);

	const hasOptions = options.length > 0;
	const tabCount = tabs.length + panels.length + (hasOptions ? 1 : 0);
	const tab: SettingsTab | undefined = tabIndex < tabs.length ? tabs[tabIndex] : undefined;
	const panel: SettingsPanel | undefined = tab ? undefined : panels[tabIndex - tabs.length];
	const onOptions = tabIndex === tabs.length + panels.length;
	const grid = useGridTab(tab, onToggle, onReorder, COLS);
	// a panel always has something to focus
	const count = onOptions ? options.length : panel ? 1 : grid.items.length;
	/** focus is in a panel, which then takes the keys */
	const inPanel = panel !== undefined && zone === 'content';

	const selectTab = (i: number) => {
		if (grid.reordering) return; // tab is locked while re-ordering
		setTabIndex(i);
		grid.reset();
		setOptionIndex(0);
	};

	/** Into the tab's content; with nothing in it, to its re-order button if it has one. */
	const enter = () => {
		if (count > 0) setZone('content');
		else if (tab && grid.canReorder) setZone('button');
	};

	/** Switch re-order mode; entering it from the tabs, or with nothing to show, focuses
	 *  the button. */
	const setMode = (next: boolean) => {
		if (!grid.canReorder || next === grid.reordering) return;
		const shown = grid.setReordering(next);
		if (next && (zone === 'tabs' || shown === 0)) setZone('button');
	};

	const onPress = () => {
		if (zone === 'button') {
			setMode(!grid.reordering);
			return;
		}
		if (zone === 'tabs') {
			enter();
			return;
		}
		if (onOptions) {
			if (options[optionIndex]) onOption(options[optionIndex].id);
			return;
		}
		grid.activate(grid.index);
	};

	/** Holding OK or the pointer's button on item `i`: re-order mode with it picked up (one
	 *  not on the home screen cannot be moved, and is not), or back out of it. */
	const hold = (i: number) => {
		if (!grid.canReorder) return;
		setZone(grid.setReordering(!grid.reordering, i) === 0 ? 'button' : 'content');
	};

	const onLongPress = () => {
		if (!tab) return;
		if (zone === 'content') hold(grid.index);
		else setMode(!grid.reordering);
	};

	useOkPress({onPress, onLongPress}, active && !inPanel);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'enter') return true; // handled by useOkPress (press vs hold)

			if (key === 'back') {
				if (!grid.back()) onClose();
				return true;
			}

			if (grid.held !== -1) {
				grid.arrow(key);
				return true;
			}

			if (zone === 'tabs') {
				if (key === 'up') selectTab(clamp(tabIndex - 1, 0, tabCount - 1));
				else if (key === 'down') selectTab(clamp(tabIndex + 1, 0, tabCount - 1));
				else if (key === 'right') enter();
				return true;
			}
			if (zone === 'button') {
				if (key === 'left' && !grid.reordering) setZone('tabs');
				else if (key === 'down' && count > 0) setZone('content');
				return true;
			}

			if (onOptions) {
				if (key === 'left') setZone('tabs');
				else if (key === 'up') setOptionIndex(clamp(optionIndex - 1, 0, count - 1));
				else if (key === 'down') setOptionIndex(clamp(optionIndex + 1, 0, count - 1));
				return true;
			}

			// ← from the left column goes back to the tabs (not while re-ordering, when they
			// are locked); ↑ from the top row to the re-order button above the grid
			if (key === 'left' && grid.index % COLS === 0 && !grid.reordering) setZone('tabs');
			else if (!grid.arrow(key) && grid.canReorder) setZone('button');
			return true;
		},
		[zone, tabIndex, tabCount, optionIndex, count, onOptions, options, grid, onClose]
	);

	useKeys(handleKey, active && !inPanel);

	const hint = panel
		? panel.hint
		: t(
				onOptions
					? 'settings.hint.options'
					: grid.held !== -1
						? 'settings.hint.holding'
						: grid.reordering
							? 'settings.hint.reorder'
							: grid.canReorder
								? 'settings.hint.select'
								: 'settings.hint.pick'
			);
	const labels = tabs
		.map((tb) => tb.label)
		.concat(panels.map((p) => p.label))
		.concat(hasOptions ? [t('settings.options')] : []);
	const buttonClass = [
		'settings__button',
		grid.reordering && 'settings__button--active',
		zone === 'button' && 'settings__button--focused'
	]
		.filter(Boolean)
		.join(' ');
	const toolbar = tab !== undefined && grid.canReorder;
	const note = tab && !toolbar ? tab.note : undefined;

	return (
		<div class="screen settings">
			<h1 class="settings__title">{t('settings.title')}</h1>
			<SettingsClock />
			<nav class="settings__tabs">
				{labels.map((label, i) => (
					<div
						key={label}
						class={[
							'settings__tab',
							i === tabIndex && 'settings__tab--active',
							grid.reordering && i !== tabIndex && 'settings__tab--locked',
							zone === 'tabs' && i === tabIndex && 'settings__tab--focused'
						]
							.filter(Boolean)
							.join(' ')}
						onMouseEnter={() => {
							if (!grid.reordering) {
								setZone('tabs');
								selectTab(i);
							}
						}}
					>
						{label}
					</div>
				))}
			</nav>
			<div class="settings__content">
				{toolbar && (
					<div class="settings__toolbar">
						<div class={buttonClass} onMouseEnter={() => setZone('button')} onClick={() => setMode(!grid.reordering)}>
							{grid.reordering ? t('settings.done') : tab.reorderLabel}
						</div>
					</div>
				)}
				{note && <p class="settings__note">{note}</p>}
				{tab && count > 0 && (
					<Grid
						items={grid.items}
						cols={COLS}
						mode={grid.mode}
						checkedKeys={tab.shown.map((tile) => tile.key)}
						liftedIndex={grid.held}
						focused={zone === 'content'}
						selected={grid.index}
						height={toolbar || note ? LAYOUT.settingsGridHeight : LAYOUT.settingsGridHeight + LAYOUT.settingsToolbar}
						onSelect={(i) => {
							if (grid.point(i)) setZone('content');
						}}
						onActivate={(i) => {
							setZone('content');
							grid.activate(i);
						}}
						onHold={grid.canReorder ? hold : undefined}
					/>
				)}
				{tab && count === 0 && (
					<p class="settings__empty">{grid.reordering ? t('settings.reorderEmpty') : tab.emptyText}</p>
				)}
				{panel?.render({
					active: active && inPanel,
					onExit: () => setZone('tabs'),
					onClose,
					onPointer: () => setZone('content')
				})}
				{onOptions && (
					<OptionList
						options={options}
						focused={zone === 'content'}
						selected={optionIndex}
						onSelect={(i) => {
							setZone('content');
							setOptionIndex(i);
						}}
						onActivate={(i) => {
							setZone('content');
							onOption(options[i].id);
						}}
					/>
				)}
			</div>
			<p class="settings__hint">{hint}</p>
		</div>
	);
}

/** The time at the top right; on its own, so that its tick redraws nothing else. */
function SettingsClock() {
	const now = useClock();
	const format = useTimeFormat();
	return <div class="settings__clock">{timeText(now, format)}</div>;
}
