import {useCallback, useState} from 'preact/hooks';
import {Grid} from '../components/Grid';
import {type OptionItem, OptionList} from '../components/OptionList';
import type {TileModel} from '../components/Tile';
import {type WeatherChoice, WeatherPanel} from '../components/WeatherPanel';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {t} from '../i18n';
import {moveItem} from '../lib/order';
import {LAYOUT} from '../theme/tokens';

export interface SettingsTab {
	id: string;
	label: string;
	/** the re-order button, e.g. "Re-order apps". A tab without one is for picking one
	 *  item (the background): OK picks it, and there is no re-order mode. */
	reorderLabel?: string;
	/** everything available */
	items: TileModel[];
	/** what's on the home screen, in home-screen order; on a tab for picking, the item
	 *  picked */
	shown: TileModel[];
	/** how many items lead `shown` as their own group (favourites); re-ordering keeps each
	 *  item within its group */
	pinned?: number;
	/** says why `items` is empty: still loading, failed, or nothing there */
	emptyText: string;
}

interface Props {
	tabs: SettingsTab[];
	/** the Weather tab, after the grid tabs */
	weather: WeatherChoice;
	options: OptionItem[];
	active: boolean;
	/** OK on an item: add or remove it, or on a tab for picking, pick it */
	onToggle: (tabId: string, key: string) => void;
	onReorder: (tabId: string, keys: string[]) => void;
	onOption: (optionId: string) => void;
	onClose: () => void;
}

/** Focus is on the tabs row (a tab, or the re-order button) or in the tab's content. */
type Zone = 'tabs' | 'button' | 'content';

/** A tile that has been picked up in re-order mode, and the order to restore on Back. */
interface Held {
	index: number;
	original: string[];
}

/** Settings: pick which apps and sources appear on the home rows and their order, the
 *  background, the weather, plus options.
 *
 *  Tabs: one grid tab per row (Apps, Sources), then Background, Weather, then Options if
 *  there are any.
 *  Grid tabs, select mode: everything available; OK adds/removes an item.
 *  Grid tabs, re-order mode (hold OK, or the button): only what's on the home screen, in order;
 *  OK picks an item up, arrows move it, OK puts it down. Hold OK or press Done to leave.
 *  Background tab: previews of every background; OK picks one, which shows at once.
 *  Weather tab: its own panel, which takes the keys while focus is in it. */
export function Settings({tabs, weather, options, active, onToggle, onReorder, onOption, onClose}: Props) {
	const [tabIndex, setTabIndex] = useState(0);
	const [zone, setZone] = useState<Zone>('tabs');
	const [gridIndex, setGridIndex] = useState(0);
	const [optionIndex, setOptionIndex] = useState(0);
	const [reordering, setReordering] = useState(false);
	const [held, setHeld] = useState<Held | null>(null);

	const hasOptions = options.length > 0;
	const tabCount = tabs.length + 1 + (hasOptions ? 1 : 0); // grid tabs + Weather + Options
	const onWeather = tabIndex === tabs.length;
	const onOptions = tabIndex === tabs.length + 1;
	const tab: SettingsTab | undefined = tabIndex < tabs.length ? tabs[tabIndex] : undefined;
	const items = tab ? (reordering ? tab.shown : tab.items) : [];
	// the Weather tab always has its switch
	const count = onOptions ? options.length : onWeather ? 1 : items.length;
	/** focus is in the Weather tab, whose panel then takes the keys */
	const inPanel = onWeather && zone === 'content';
	const cols = LAYOUT.gridColumns;
	const keysOf = (list: TileModel[]) => list.map((t) => t.key);
	/** the tab has a re-order mode, and the button for it */
	const canReorder = tab !== undefined && tab.reorderLabel !== undefined;

	const selectTab = (i: number) => {
		if (reordering) return; // tab is locked while re-ordering
		setTabIndex(i);
		setGridIndex(0);
		setOptionIndex(0);
	};

	/** Switch re-order mode, keeping focus on the same item where it exists in both lists. */
	const setMode = (next: boolean) => {
		if (!tab || !canReorder || next === reordering) return;
		const focusedKey = items[gridIndex]?.key;
		const target = next ? tab.shown : tab.items;
		const i = focusedKey ? keysOf(target).indexOf(focusedKey) : -1;
		setGridIndex(Math.max(0, i));
		setHeld(null);
		setReordering(next);
		if (next && (zone === 'tabs' || target.length === 0)) setZone('button');
	};

	/** Move the held tile to `to`, updating the home screen as it goes. */
	const moveHeld = (to: number) => {
		if (!tab || !held) return;
		const pinned = tab.pinned || 0;
		const dest = held.index < pinned ? clamp(to, 0, pinned - 1) : clamp(to, pinned, count - 1);
		if (dest === held.index) return;
		onReorder(tab.id, moveItem(keysOf(tab.shown), held.index, dest));
		setHeld({...held, index: dest});
		setGridIndex(dest);
	};

	const activateGridItem = (i: number) => {
		if (!tab || !items[i]) return;
		if (!reordering) {
			onToggle(tab.id, items[i].key);
			return;
		}
		if (held) {
			// put down (pointer: at the clicked tile)
			if (i !== held.index) moveHeld(i);
			setHeld(null);
			return;
		}
		setHeld({index: i, original: keysOf(tab.shown)}); // pick up
		setGridIndex(i);
	};

	const onPress = () => {
		if (zone === 'button') {
			setMode(!reordering);
			return;
		}
		if (zone === 'tabs') {
			if (count > 0) setZone('content');
			return;
		}
		if (onOptions) {
			if (options[optionIndex]) onOption(options[optionIndex].id);
			return;
		}
		activateGridItem(gridIndex);
	};

	const onLongPress = () => {
		if (tab) setMode(!reordering);
	};

	useOkPress({onPress, onLongPress}, active && !inPanel);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'enter') return true; // handled by useOkPress (press vs hold)

			if (key === 'back') {
				if (held && tab) {
					onReorder(tab.id, held.original);
					setGridIndex(held.index);
					setHeld(null);
				} else if (reordering) setMode(false);
				else onClose();
				return true;
			}

			if (held) {
				if (key === 'left') moveHeld(held.index - 1);
				else if (key === 'right') moveHeld(held.index + 1);
				else if (key === 'up') moveHeld(held.index - cols);
				else if (key === 'down') moveHeld(held.index + cols);
				return true;
			}

			if (zone === 'tabs') {
				if (key === 'left') selectTab(clamp(tabIndex - 1, 0, tabCount - 1));
				else if (key === 'right') selectTab(clamp(tabIndex + 1, 0, tabCount - 1));
				else if (key === 'down' && count > 0) setZone('content');
				return true;
			}
			if (zone === 'button') {
				if (key === 'left' && !reordering) setZone('tabs');
				else if (key === 'down' && count > 0) setZone('content');
				return true;
			}

			if (onOptions) {
				if (key === 'up') {
					if (optionIndex === 0) setZone('tabs');
					else setOptionIndex(optionIndex - 1);
				} else if (key === 'down') setOptionIndex(clamp(optionIndex + 1, 0, count - 1));
				return true;
			}

			switch (key) {
				case 'left':
					setGridIndex((i) => clamp(i - 1, 0, count - 1));
					break;
				case 'right':
					setGridIndex((i) => clamp(i + 1, 0, count - 1));
					break;
				case 'up':
					if (gridIndex >= cols) setGridIndex((i) => i - cols);
					// Spatial: the button sits top-right, so leave the grid towards whichever is above.
					else setZone(canReorder && (reordering || gridIndex % cols >= cols / 2) ? 'button' : 'tabs');
					break;
				case 'down':
					setGridIndex((i) => (i + cols < count ? i + cols : i));
					break;
			}
			return true;
		},
		[
			zone,
			tabIndex,
			tabCount,
			gridIndex,
			optionIndex,
			count,
			tab,
			onOptions,
			options,
			reordering,
			held,
			items,
			canReorder,
			onReorder,
			onClose
		]
	);

	useKeys(handleKey, active && !inPanel);

	const hint = t(
		onWeather
			? 'settings.hint.weather'
			: onOptions
				? 'settings.hint.options'
				: held
					? 'settings.hint.holding'
					: reordering
						? 'settings.hint.reorder'
						: canReorder
							? 'settings.hint.select'
							: 'settings.hint.pick'
	);
	const labels = tabs
		.map((tb) => tb.label)
		.concat(t('settings.weather'))
		.concat(hasOptions ? [t('settings.options')] : []);
	const buttonClass = [
		'settings__button',
		reordering && 'settings__button--active',
		zone === 'button' && 'settings__button--focused'
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div class="screen">
			<div class="settings">
				<h1 class="settings__title">{t('settings.title')}</h1>
				<p class="settings__hint">{hint}</p>
				<div class="settings__tabs">
					{labels.map((label, i) => (
						<div
							key={label}
							class={[
								'tab',
								i === tabIndex && 'tab--active',
								reordering && i !== tabIndex && 'tab--locked',
								zone === 'tabs' && i === tabIndex && 'tab--focused'
							]
								.filter(Boolean)
								.join(' ')}
							onMouseEnter={() => {
								if (!reordering) {
									setZone('tabs');
									selectTab(i);
								}
							}}
						>
							{label}
						</div>
					))}
					{tab && canReorder && (
						<div class={buttonClass} onMouseEnter={() => setZone('button')} onClick={() => setMode(!reordering)}>
							{reordering ? t('settings.done') : tab.reorderLabel}
						</div>
					)}
				</div>
				{tab && (
					<Grid
						items={items}
						mode={reordering ? 'reorder' : canReorder ? 'select' : 'pick'}
						checkedKeys={keysOf(tab.shown)}
						liftedIndex={held ? held.index : -1}
						focused={zone === 'content'}
						selected={gridIndex}
						onSelect={(i) => {
							if (!held) {
								setZone('content');
								setGridIndex(i);
							}
						}}
						onActivate={(i) => {
							setZone('content');
							activateGridItem(i);
						}}
					/>
				)}
				{onWeather && (
					<WeatherPanel
						{...weather}
						active={active && inPanel}
						onExit={() => setZone('tabs')}
						onClose={onClose}
						onPointer={() => setZone('content')}
					/>
				)}
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
				{tab && count === 0 && <p class="settings__hint">{reordering ? t('settings.reorderEmpty') : tab.emptyText}</p>}
			</div>
		</div>
	);
}
