import {clamp} from '../hooks/useKeys';
import {t} from '../i18n';
import {LAYOUT} from '../theme/tokens';
import {type MoveArrows, Tile, type TileModel} from './Tile';

interface Props {
	label: string;
	items: TileModel[];
	focused: boolean;
	selected: number;
	emptyText?: string;
	/** move mode: the selected tile is lifted, with arrows where it can go; the others are dimmed */
	moving?: MoveArrows;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
	/** OK or the pointer's button held on a tile */
	onLongPress?: (index: number) => void;
	/** an arrow of the moving tile clicked */
	onMove?: (step: -1 | 1) => void;
}

/** Width the tiles are laid out in: the screen inside the safe area. Tiles scrolled
 *  beyond it stay visible out to the screen edges (see .row__viewport). */
const SAFE_WIDTH = LAYOUT.screenWidth - 2 * LAYOUT.edgePadding;
const STEP = LAYOUT.tileSize + LAYOUT.tileGap;

/** Horizontal strip of tiles. Centred when it fits; otherwise a carousel that keeps
 *  the selected tile in the middle (clamped at the ends). */
export function Row({
	label,
	items,
	focused,
	selected,
	emptyText,
	moving,
	onSelect,
	onActivate,
	onLongPress,
	onMove
}: Props) {
	const lifted = moving ? selected : -1;
	// the moving tile gets room for its arrows on either side (see .row__track .tile--lifted)
	const room = moving ? LAYOUT.moveRoom : 0;
	const total = items.length * STEP - LAYOUT.tileGap + 2 * room;
	const fits = total <= SAFE_WIDTH;
	const middle = selected * STEP + room + LAYOUT.tileSize / 2;
	const offset = fits ? 0 : clamp(middle - SAFE_WIDTH / 2, 0, total - SAFE_WIDTH);

	return (
		<section class={`row${focused ? ' row--focused' : ''}${moving ? ' row--moving' : ''}`}>
			<h2 class="row__label">{label}</h2>
			<div class="row__viewport">
				{items.length === 0 ? (
					<div class="row__empty">{emptyText || t('rows.empty')}</div>
				) : (
					<div
						class={`row__track${fits ? ' row__track--centered' : ''}`}
						style={{transform: `translateX(${-offset}px)`}}
					>
						{items.map((item, i) => (
							<Tile
								key={item.key}
								model={item}
								focused={focused && i === selected}
								lifted={i === lifted}
								arrows={i === lifted ? moving : undefined}
								onMove={onMove}
								dimmed={lifted !== -1 && i !== lifted}
								onHover={() => onSelect(i)}
								onActivate={() => onActivate(i)}
								onLongPress={onLongPress ? () => onLongPress(i) : undefined}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
