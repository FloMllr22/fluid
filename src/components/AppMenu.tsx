import {useCallback, useState} from 'preact/hooks';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {t} from '../i18n';
import {Tile, type TileModel} from './Tile';

export type AppMenuAction = 'favorite' | 'hide' | 'cancel';

interface Props {
	app: TileModel;
	onChoose: (action: AppMenuAction) => void;
	onClose: () => void;
}

/** The options for one app, over the dimmed home screen: make it a favourite or take that
 *  back, hide it, or cancel. ← → choose, OK confirms, Back closes; the pointer chooses
 *  by pointing and clicking. Opened by holding OK, whose release it ignores. */
export function AppMenu({app, onChoose, onClose}: Props) {
	const actions: {id: AppMenuAction; label: string}[] = [
		{id: 'favorite', label: t(app.favorite ? 'menu.unfavorite' : 'menu.favorite')},
		{id: 'hide', label: t('menu.hide')},
		{id: 'cancel', label: t('menu.cancel')}
	];
	const [selected, setSelected] = useState(0);
	const last = actions.length - 1;

	useOkPress(
		{onPress: () => onChoose(actions[selected].id), onLongPress: () => onChoose(actions[selected].id)},
		true,
		true
	);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'left') setSelected((i) => clamp(i - 1, 0, last));
			else if (key === 'right') setSelected((i) => clamp(i + 1, 0, last));
			else if (key === 'back') onClose();
			return true; // the menu takes every key; OK goes through useOkPress
		},
		[last, onClose]
	);
	useKeys(handleKey);

	return (
		<div class="menu">
			<Tile model={app} focused />
			<div class="menu__actions">
				{actions.map((action, i) => (
					<div
						key={action.id}
						class={`menu__action${i === selected ? ' menu__action--focused' : ''}`}
						onMouseEnter={() => setSelected(i)}
						onClick={() => onChoose(action.id)}
					>
						{action.label}
					</div>
				))}
			</div>
			<p class="menu__hint">{t('menu.hint')}</p>
		</div>
	);
}
