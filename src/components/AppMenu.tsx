import {useCallback, useState} from 'preact/hooks';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {t} from '../i18n';
import {popoverTop} from '../lib/home';
import {LAYOUT} from '../theme/tokens';
import type {GlyphName} from './Glyph';
import {Menu, menuHeight} from './Menu';
import type {TileModel} from './Tile';

export type AppMenuAction = 'favorite' | 'move' | 'hide' | 'uninstall' | 'cancel';

interface Props {
	app: TileModel;
	/** where the app's row is on the screen, and its height: the menu opens beside it */
	row: {top: number; height: number};
	/** where the menu starts, right of the app's row */
	left: number;
	onChoose: (action: AppMenuAction) => void;
	onClose: () => void;
}

interface Action {
	id: AppMenuAction;
	label: string;
	glyph: GlyphName;
	danger?: boolean;
}

/** The options for one app, beside it on the wheel: make it a favourite or take that back,
 *  move it along the list, hide it, uninstall it where the TV lets it, or cancel. ↑ ↓ choose,
 *  OK confirms, ← or Back close; the pointer chooses by pointing and clicking, and closes it by
 *  clicking elsewhere. Opened by holding OK, whose release it ignores.
 *  Uninstalling cannot be undone, so it asks once more, with focus on cancelling. */
export function AppMenu({app, row, left, onChoose, onClose}: Props) {
	const [asking, setAsking] = useState(false);
	const cancel: Action = {id: 'cancel', label: t('menu.cancel'), glyph: 'close'};
	const actions: Action[] = asking
		? [{id: 'uninstall', label: t('menu.uninstallConfirm'), glyph: 'uninstall', danger: true}, cancel]
		: [
				{id: 'favorite', label: t(app.favorite ? 'menu.unfavorite' : 'menu.favorite'), glyph: 'star'},
				{id: 'move', label: t('menu.move'), glyph: 'move'},
				{id: 'hide', label: t('menu.hide'), glyph: 'hide'},
				...(app.removable
					? [{id: 'uninstall' as const, label: t('menu.uninstall'), glyph: 'uninstall' as const, danger: true}]
					: []),
				cancel
			];
	const [selected, setSelected] = useState(0);
	const last = actions.length - 1;

	const choose = (action: AppMenuAction) => {
		if (action === 'uninstall' && !asking) {
			setAsking(true);
			setSelected(1); // cancel
		} else onChoose(action);
	};
	const press = () => choose(actions[selected].id);

	useOkPress({onPress: press, onLongPress: press}, true, true);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'up') setSelected((i) => clamp(i - 1, 0, last));
			else if (key === 'down') setSelected((i) => clamp(i + 1, 0, last));
			else if (key === 'left' || key === 'back') onClose();
			return true; // the menu takes every key; OK goes through useOkPress
		},
		[last, onClose]
	);
	useKeys(handleKey);

	const top = popoverTop(
		row.top,
		row.height,
		menuHeight(actions.length),
		LAYOUT.safeY,
		LAYOUT.screenHeight - LAYOUT.safeY
	);
	return (
		<>
			<div class="catcher catcher--menu" onClick={onClose} />
			<Menu
				className="menu--app"
				top={top}
				left={left}
				entries={actions.map((action) => ({
					key: action.id,
					label: action.label,
					glyph: action.glyph,
					danger: action.danger
				}))}
				focus={selected}
				onPoint={setSelected}
				onPick={(i) => choose(actions[i].id)}
			/>
		</>
	);
}
