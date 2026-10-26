import {usePointerHold} from '../hooks/usePointerHold';
import {listPlacement} from '../lib/home';
import {LAYOUT} from '../theme/tokens';
import {AppIcon} from './AppIcon';
import {ChevronMark, StarMark} from './Glyph';
import type {TileModel} from './Tile';

/** Which ways an app being moved can go, shown as arrows in its row. */
export interface MoveArrows {
	up: boolean;
	down: boolean;
}

interface Props {
	items: TileModel[];
	/** says why there are no apps: still loading, failed, or none chosen */
	emptyText: string;
	/** the selected app is drawn with focus (focus is in the list, or the app is being
	 *  moved or has its menu open) */
	focused: boolean;
	selected: number;
	/** move mode: the selected app is lifted, with arrows where it can go */
	moving?: MoveArrows;
	/** the others step back: an app is being moved, or has its menu open */
	dimmed: boolean;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
	/** the pointer's button held on an app */
	onLongPress: (index: number) => void;
	/** an arrow of the app being moved clicked */
	onMove: (step: -1 | 1) => void;
}

const STEP = LAYOUT.listRowHeight + LAYOUT.listRowGap;
/** the height the list is laid out in: the screen inside the safe area */
const SAFE_HEIGHT = LAYOUT.screenHeight - 2 * LAYOUT.safeY;

const placement = (count: number, selected: number) =>
	listPlacement(count, selected, LAYOUT.listRowHeight, LAYOUT.listRowGap, SAFE_HEIGHT);

/** Where the row of the app at `index` is on the screen, with `selected` in focus. */
export function listRowTop(count: number, selected: number, index: number): number {
	const {top, offset} = placement(count, selected);
	return LAYOUT.safeY + top + index * STEP - offset;
}

/** The apps, one below the other on the left: icon and name. Centred when they fit;
 *  otherwise the list keeps the focused app in the middle, running out to the screen's
 *  top and foot rather than being cut at the safe area. */
export function AppList({
	items,
	emptyText,
	focused,
	selected,
	moving,
	dimmed,
	onSelect,
	onActivate,
	onLongPress,
	onMove
}: Props) {
	if (items.length === 0)
		return (
			<nav class="applist">
				<p class="applist__empty">{emptyText}</p>
			</nav>
		);
	const {top, offset} = placement(items.length, selected);
	return (
		<nav class="applist">
			<div class="applist__track" style={{top: `${LAYOUT.safeY + top}px`, transform: `translateY(${-offset}px)`}}>
				{items.map((item, i) => (
					<AppRow
						key={item.key}
						model={item}
						focused={focused && i === selected}
						arrows={moving && i === selected ? moving : undefined}
						dimmed={dimmed && i !== selected}
						onHover={() => onSelect(i)}
						onActivate={() => onActivate(i)}
						onLongPress={() => onLongPress(i)}
						onMove={onMove}
					/>
				))}
			</div>
		</nav>
	);
}

interface RowProps {
	model: TileModel;
	focused: boolean;
	/** move mode: this app is lifted, with these arrows */
	arrows?: MoveArrows;
	dimmed: boolean;
	onHover: () => void;
	onActivate: () => void;
	onLongPress: () => void;
	onMove: (step: -1 | 1) => void;
}

/** One app: focused, it moves right on a light pill, its icon grows with a ring and its
 *  name with it (the name is laid out at its focused size and drawn smaller without focus,
 *  so only transforms animate). */
function AppRow({model, focused, arrows, dimmed, onHover, onActivate, onLongPress, onMove}: RowProps) {
	const pointer = usePointerHold(onActivate, onLongPress);
	const classes = [
		'applist__row',
		focused && 'applist__row--focused',
		arrows && 'applist__row--lifted',
		dimmed && 'applist__row--dimmed'
	]
		.filter(Boolean)
		.join(' ');
	return (
		<div class={classes} onMouseEnter={onHover} {...pointer}>
			<span class="applist__icon">
				<AppIcon model={model} />
			</span>
			<span class="applist__name">
				<span class="applist__label">{model.label}</span>
				{model.favorite && (
					<span class="applist__star">
						<StarMark />
					</span>
				)}
			</span>
			{arrows && (
				<span class="applist__arrows">
					<MoveArrow side="up" shown={arrows.up} onMove={onMove} />
					<MoveArrow side="down" shown={arrows.down} onMove={onMove} />
				</span>
			)}
		</div>
	);
}

/** An arrow of the app being moved; hidden where it cannot go. Its clicks and presses
 *  stay its own: they neither put the app down nor start a held press on it. */
function MoveArrow({side, shown, onMove}: {side: 'up' | 'down'; shown: boolean; onMove: (step: -1 | 1) => void}) {
	return (
		<span
			class={`applist__arrow${shown ? '' : ' applist__arrow--off'}`}
			onMouseDown={(e) => e.stopPropagation()}
			onClick={(e) => {
				e.stopPropagation();
				if (shown) onMove(side === 'up' ? -1 : 1);
			}}
		>
			<ChevronMark side={side} />
		</span>
	);
}
