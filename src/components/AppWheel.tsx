import type {Ref} from 'preact';
import {useRef} from 'preact/hooks';
import {usePointerHold} from '../hooks/usePointerHold';
import {type WheelLayout, wheelLayout, wheelOpacity, wheelPoint, wheelSlot, wheelTurn} from '../lib/wheel';
import type {IconSize} from '../state/settings';
import {LAYOUT, MOTION, WHEEL} from '../theme/tokens';
import {AppIcon} from './AppIcon';
import {ChevronMark, StarMark} from './Glyph';
import type {TileModel} from './Tile';

/** Which ways an app being moved can go, shown as arrows beside its name. */
export interface MoveArrows {
	up: boolean;
	down: boolean;
}

interface Props {
	items: TileModel[];
	/** says why there are no apps: still loading, failed, or none chosen */
	emptyText: string;
	/** the selected app is drawn with focus (focus is on the wheel, or the app is being
	 *  moved or has its menu open) */
	focused: boolean;
	/** the app in the middle */
	selected: number;
	/** its shape and sizes, for the icon size chosen (see layoutFor) */
	layout: WheelLayout;
	/** move mode: the selected app is lifted, with arrows where it can go */
	moving?: MoveArrows;
	/** the others step back: an app is being moved, or has its menu open */
	dimmed: boolean;
	/** an app clicked */
	onActivate: (index: number) => void;
	/** the pointer's button held on an app */
	onLongPress: (index: number) => void;
	/** an arrow of the app being moved clicked */
	onMove: (step: -1 | 1) => void;
	/** the wheel's element, for wheelMenuLeft */
	navRef?: Ref<HTMLElement>;
}

/** The layouts for each icon size, worked out once. */
const LAYOUTS: Partial<Record<IconSize, WheelLayout>> = {};

/** The wheel's layout for an icon size, in % of the usual size. */
export function layoutFor(iconSize: IconSize): WheelLayout {
	const known = LAYOUTS[iconSize];
	if (known) return known;
	const layout = wheelLayout(iconSize / 100, {
		shape: WHEEL,
		icon: LAYOUT.appIcon,
		iconRadius: LAYOUT.appIconRadius,
		rowHeight: LAYOUT.wheelRowHeight,
		gap: LAYOUT.wheelGap,
		gapRest: LAYOUT.wheelGapRest,
		safeX: LAYOUT.safeX,
		screenHeight: LAYOUT.screenHeight
	});
	LAYOUTS[iconSize] = layout;
	return layout;
}

/** From the middle of an app's icon to the top left of its row. */
const rowLeft = (layout: WheelLayout) => -(LAYOUT.wheelPad + layout.icon / 2);

/** The top of the selected app's row: its menu opens beside it. */
export function wheelRowTop(layout: WheelLayout): number {
	return layout.centreY - layout.rowHeight / 2;
}

/** Where the menu of the app `key` opens: right of the pill it has in the middle. A row is
 *  laid out as when selected, so its width is that of the pill wherever the app is. */
export function wheelMenuLeft(nav: HTMLElement | null, key: string, layout: WheelLayout): number {
	const rows = nav ? nav.children : [];
	let width = LAYOUT.wheelPad + layout.icon;
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (row instanceof HTMLElement && row.getAttribute('data-key') === key) width = row.offsetWidth;
	}
	return layout.centreX + rowLeft(layout) + width + LAYOUT.menuGap;
}

/** What the wheel keeps between renders: its turn, where each app was, and the apps that
 *  last came round from one end to the other. Such an app gets a new row, which fades in at
 *  its new place, while its old row goes on and fades out (a ghost). */
interface Memory {
	turn: number;
	placed: Map<string, {offset: number; lap: number}>;
	entering: string[];
	ghosts: {key: string; model: TileModel; offset: number}[];
}

/** The apps on a large circle on the left: the selected one in the middle, the furthest
 *  right, the others above and below it along the circle, fainter further out. Selecting
 *  another turns the wheel the shortest way until it is in the middle; after the last app
 *  comes the first again. A long list runs out at the screen's top and foot. */
export function AppWheel({
	items,
	emptyText,
	focused,
	selected,
	layout,
	moving,
	dimmed,
	onActivate,
	onLongPress,
	onMove,
	navRef
}: Props) {
	const memory = useRef<Memory>({turn: selected, placed: new Map(), entering: [], ghosts: []}).current;
	// the sizes of a row for the icon size, over those of the tokens
	const sizes = {
		'--layout-app-icon': `${layout.icon}px`,
		'--layout-app-icon-radius': `${layout.iconRadius}px`,
		'--layout-wheel-row-height': `${layout.rowHeight}px`,
		'--layout-wheel-gap': `${layout.gap}px`,
		'--layout-wheel-gap-rest': `${layout.gapRest}px`
	};
	if (items.length === 0)
		return (
			<nav class="wheel" ref={navRef}>
				<p class="wheel__empty">{emptyText}</p>
			</nav>
		);

	const turn = wheelTurn(memory.turn, items.length, selected);
	const slots = items.map((_, i) => wheelSlot(i, items.length, turn));
	const entering: string[] = [];
	const ghosts: Memory['ghosts'] = [];
	items.forEach((item, i) => {
		const was = memory.placed.get(item.key);
		if (!was || was.lap === slots[i].lap) return;
		entering.push(item.key);
		// the old row goes on as the wheel turned, and fades out
		ghosts.push({key: `${item.key}:${was.lap}`, model: item, offset: was.offset - (turn - memory.turn)});
	});
	// kept until the wheel turns again, as Home draws anew every second
	if (entering.length > 0 || turn !== memory.turn) {
		memory.entering = entering;
		memory.ghosts = ghosts;
	}
	memory.turn = turn;
	memory.placed = new Map(items.map((item, i): [string, {offset: number; lap: number}] => [item.key, slots[i]]));

	return (
		<nav class={dimmed ? 'wheel wheel--still' : 'wheel'} style={sizes} ref={navRef}>
			{items.map((item, i) => {
				const {offset, lap} = slots[i];
				const opacity = wheelOpacity(offset, layout.shape.reach, MOTION.wheelRestOpacity, MOTION.wheelOpacityStep);
				return (
					<WheelRow
						key={`${item.key}:${lap}`}
						model={item}
						layout={layout}
						offset={offset}
						opacity={dimmed && offset !== 0 ? Math.min(opacity, MOTION.dimmedOpacity) : opacity}
						focused={focused && offset === 0}
						arrows={moving && offset === 0 ? moving : undefined}
						entering={memory.entering.indexOf(item.key) !== -1}
						onActivate={() => onActivate(i)}
						onLongPress={() => onLongPress(i)}
						onMove={onMove}
					/>
				);
			})}
			{memory.ghosts.map((ghost) => (
				<WheelRow key={ghost.key} model={ghost.model} layout={layout} offset={ghost.offset} opacity={0} ghost />
			))}
		</nav>
	);
}

interface RowProps {
	model: TileModel;
	layout: WheelLayout;
	/** places from the selected app; 0 is the selected app */
	offset: number;
	opacity: number;
	focused?: boolean;
	/** move mode: this app is lifted, with these arrows */
	arrows?: MoveArrows;
	/** it has just come round from the other end */
	entering?: boolean;
	/** what is left where it was: no pointer, hidden once faded out */
	ghost?: boolean;
	onActivate?: () => void;
	onLongPress?: () => void;
	onMove?: (step: -1 | 1) => void;
}

/** One app on the wheel. Selected, its icon grows, with a ring in focus, and its name grows
 *  on a light pill; the name is laid out at its selected size and drawn smaller otherwise, so
 *  only transforms and opacity animate. Beneath the pointer a fainter pill shows. */
function WheelRow({
	model,
	layout,
	offset,
	opacity,
	focused,
	arrows,
	entering,
	ghost,
	onActivate,
	onLongPress,
	onMove
}: RowProps) {
	const pointer = usePointerHold(onActivate, onLongPress);
	const point = wheelPoint(offset, layout.shape);
	const left = Math.round(layout.centreX + rowLeft(layout) + point.x);
	const top = Math.round(wheelRowTop(layout) + point.y);
	const classes = [
		'wheel__row',
		offset === 0 && 'wheel__row--selected',
		focused && 'wheel__row--focused',
		arrows && 'wheel__row--lifted',
		Math.abs(offset) > layout.shape.reach && 'wheel__row--away',
		entering && 'wheel__row--entering',
		ghost && 'wheel__row--ghost'
	]
		.filter(Boolean)
		.join(' ');
	return (
		<div
			class={classes}
			data-key={ghost ? undefined : model.key}
			style={{transform: `translate(${left}px, ${top}px)`, opacity}}
			{...(ghost ? {} : pointer)}
		>
			<span class="wheel__icon">
				<AppIcon model={model} />
			</span>
			<span class="wheel__name">
				<span class="wheel__label">{model.label}</span>
				{model.favorite && (
					<span class="wheel__star">
						<StarMark />
					</span>
				)}
				{arrows && onMove && (
					<span class="wheel__arrows">
						<MoveArrow side="up" shown={arrows.up} onMove={onMove} />
						<MoveArrow side="down" shown={arrows.down} onMove={onMove} />
					</span>
				)}
			</span>
		</div>
	);
}

/** An arrow of the app being moved; hidden where it cannot go. Its clicks and presses
 *  stay its own: they neither put the app down nor start a held press on it. */
function MoveArrow({side, shown, onMove}: {side: 'up' | 'down'; shown: boolean; onMove: (step: -1 | 1) => void}) {
	return (
		<span
			class={`wheel__arrow${shown ? '' : ' wheel__arrow--off'}`}
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
