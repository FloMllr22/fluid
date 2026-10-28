import {useCallback, useState} from 'preact/hooks';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {type MessageKey, t} from '../i18n';
import {valueKey} from '../lib/values';
import {ACCENTS, type Appearance, GLOW_LEVELS, ICON_SIZES} from '../state/settings';
import {accentColor} from '../theme/appearance';
import {COLOR} from '../theme/tokens';
import {ChevronMark} from './Glyph';
import {OptionRow} from './OptionList';

interface Props {
	appearance: Appearance;
	/** uses a new appearance at once */
	onChange: (appearance: Appearance) => void;
	/** has the remote's keys */
	active: boolean;
	/** ← from a row's first value: back to the tabs */
	onExit: () => void;
	/** Back: home */
	onClose: () => void;
	/** the pointer points into the panel, which then takes the keys */
	onPointer: () => void;
}

/** A row: a list of values to step through, or a switch (off, on). */
interface Row {
	id: string;
	label: string;
	description: string;
	/** the values by name; a switch has none */
	values?: string[];
	/** a colour beside each value, where it has one */
	swatches?: (string | undefined)[];
	/** the value in use; for a switch 0 (off) or 1 (on) */
	index: number;
	set: (index: number) => void;
}

/** The accent from the app has no colour of its own: three apps' colours stand for it. */
const APP_SWATCH = `linear-gradient(135deg, ${COLOR.previewAppBefore}, ${COLOR.previewApp}, ${COLOR.previewAppAfter})`;

/** The Appearance tab, as the Settings mockup draws it: a row each for the accent, the
 *  glow behind the app, the icon size and reduced motion. ↑ ↓ move between the rows; ← → step through a row's values
 *  (shown with arrows while it has focus), and ← on its first value goes back to the
 *  tabs; OK goes on to the next value, round to the first, or turns the switch. Every
 *  change shows at once. */
export function AppearancePanel({appearance, onChange, active, onExit, onClose, onPointer}: Props) {
	const [selected, setSelected] = useState(0);
	const change = (part: Partial<Appearance>) => onChange({...appearance, ...part});

	const rows: Row[] = [
		{
			id: 'accent',
			label: t('appearance.accent'),
			description: t('appearance.accentDescription'),
			values: ACCENTS.map((accent) => t(`accent.${accent}` as MessageKey)),
			swatches: ACCENTS.map((accent) => (accent === 'app' ? APP_SWATCH : accentColor(accent))),
			index: ACCENTS.indexOf(appearance.accent),
			set: (i) => change({accent: ACCENTS[i]})
		},
		{
			id: 'glow',
			label: t('appearance.glow'),
			description: t('appearance.glowDescription'),
			values: GLOW_LEVELS.map((level) => (level === 0 ? t('appearance.off') : t('appearance.percent', {value: level}))),
			index: GLOW_LEVELS.indexOf(appearance.glow),
			set: (i) => change({glow: GLOW_LEVELS[i]})
		},
		{
			id: 'iconSize',
			label: t('appearance.iconSize'),
			description: t('appearance.iconSizeDescription'),
			values: ICON_SIZES.map((size) => t('appearance.percent', {value: size})),
			index: ICON_SIZES.indexOf(appearance.iconSize),
			set: (i) => change({iconSize: ICON_SIZES[i]})
		},
		{
			id: 'reduceMotion',
			label: t('appearance.reduceMotion'),
			description: t('appearance.reduceMotionDescription'),
			index: appearance.reduceMotion ? 1 : 0,
			set: (i) => change({reduceMotion: i === 1})
		}
	];
	const focus = clamp(selected, 0, rows.length - 1);

	/** A key on row `i`: its next value, or back to the tabs. */
	const press = (i: number, key: 'left' | 'right' | 'enter') => {
		const row = rows[i];
		const next = valueKey(row.index, row.values ? row.values.length : 2, key);
		if (next === 'exit') onExit();
		else if (next !== null) row.set(next);
	};

	useOkPress({onPress: () => press(focus, 'enter'), onLongPress: () => press(focus, 'enter')}, active);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'up') setSelected(clamp(focus - 1, 0, rows.length - 1));
			else if (key === 'down') setSelected(clamp(focus + 1, 0, rows.length - 1));
			else if (key === 'left' || key === 'right') press(focus, key);
			else if (key === 'back') onClose();
			return true; // OK goes through useOkPress
		},
		[focus, appearance, onChange, onExit, onClose]
	);
	useKeys(handleKey, active);

	const point = (i: number) => () => {
		setSelected(i);
		onPointer();
	};

	return (
		<div class="appearance">
			{rows.map((row, i) =>
				row.values ? (
					<ValueRow
						key={row.id}
						row={row}
						focused={active && focus === i}
						onHover={point(i)}
						onActivate={() => press(i, 'enter')}
						onStep={(key) => press(i, key)}
					/>
				) : (
					<OptionRow
						key={row.id}
						option={{id: row.id, label: row.label, description: row.description, value: row.index === 1}}
						focused={active && focus === i}
						onHover={point(i)}
						onActivate={() => press(i, 'enter')}
					/>
				)
			)}
		</div>
	);
}

/** A row with its value on the right, between arrows while it has focus. */
function ValueRow({
	row,
	focused,
	onHover,
	onActivate,
	onStep
}: {
	row: Row;
	focused: boolean;
	onHover: () => void;
	onActivate: () => void;
	onStep: (key: 'left' | 'right') => void;
}) {
	const values = row.values || [];
	const swatch = row.swatches ? row.swatches[row.index] : undefined;
	/** An arrow's clicks are its own: they step, and do not go on to the next value too. */
	const arrow = (side: 'left' | 'right', shown: boolean) => (
		<span
			class={`value__arrow${shown ? '' : ' value__arrow--off'}`}
			onClick={(e) => {
				e.stopPropagation();
				if (shown) onStep(side);
			}}
		>
			<ChevronMark side={side} />
		</span>
	);
	return (
		<div class={`option${focused ? ' option--focused' : ''}`} onMouseEnter={onHover} onClick={onActivate}>
			<div class="option__text">
				<div class="option__label">{row.label}</div>
				<div class="option__description">{row.description}</div>
			</div>
			<div class="value">
				{arrow('left', focused && row.index > 0)}
				<span class="value__label">
					{swatch && <span class="value__swatch" style={{background: swatch}} />}
					{values[row.index]}
				</span>
				{arrow('right', focused && row.index < values.length - 1)}
			</div>
		</div>
	);
}
