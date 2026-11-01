import {useCallback, useState} from 'preact/hooks';
import type {HomeKey} from '../hooks/useHomeKey';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {t} from '../i18n';
import {type OptionItem, OptionRow} from './OptionList';

interface Props {
	homeKey: HomeKey;
	/** has the remote's keys */
	active: boolean;
	/** ←: back to the tabs */
	onExit: () => void;
	/** Back: home */
	onClose: () => void;
	/** the pointer points into the panel, which then takes the keys */
	onPointer: () => void;
}

/** What the row says about the Home key: what it does, or why that is not so now. */
function homeKeyText({known, problem, busy, gaveUp}: HomeKey): string {
	if (busy) return t('tv.homeKeyBusy');
	if (problem) return `${t('tv.homeKeyUnknown')} ${problem}`;
	if (!known) return t('tv.homeKeyLoading');
	if (known.state === 'unsupported') return t('tv.homeKeyUnsupported');
	return gaveUp ? t('tv.homeKeyGaveUp') : t('tv.homeKeyDescription');
}

interface Row {
	option: OptionItem;
	toggle: () => void;
}

/** The TV tab: what fluid may take over from the TV. ↑ ↓ move between the rows, OK or a click
 *  switches, ← goes back to the tabs. Starting with fluid only shows while the Home key opens
 *  fluid: giving the key back to LG Home gives all of it back. */
export function TvPanel({homeKey, active, onExit, onClose, onPointer}: Props) {
	const [selected, setSelected] = useState(0);
	const rows: Row[] = [
		{
			option: {
				id: 'homeKey',
				label: t('tv.homeKey'),
				description: homeKeyText(homeKey),
				value: homeKey.known?.state === 'on'
			},
			toggle: homeKey.toggle
		}
	];
	if (homeKey.known?.state === 'on' && homeKey.known.start !== 'unsupported') {
		rows.push({
			option: {
				id: 'start',
				label: t('tv.start'),
				description: t('tv.startDescription'),
				value: homeKey.known.start === 'yes'
			},
			toggle: homeKey.toggleStart
		});
	}
	const focus = clamp(selected, 0, rows.length - 1);
	const press = () => rows[focus].toggle();
	useOkPress({onPress: press, onLongPress: press}, active);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'up') setSelected(clamp(focus - 1, 0, rows.length - 1));
			else if (key === 'down') setSelected(clamp(focus + 1, 0, rows.length - 1));
			else if (key === 'left') onExit();
			else if (key === 'back') onClose();
			return true; // OK goes through useOkPress
		},
		[focus, rows.length, onExit, onClose]
	);
	useKeys(handleKey, active);

	return (
		<div class="appearance">
			{rows.map((row, i) => (
				<OptionRow
					key={row.option.id}
					option={row.option}
					focused={active && focus === i}
					onHover={() => {
						setSelected(i);
						onPointer();
					}}
					onActivate={row.toggle}
				/>
			))}
		</div>
	);
}
