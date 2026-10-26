import {firstShownRow} from '../lib/gridTab';
import {FONT, LAYOUT} from '../theme/tokens';
import {Tile, type TileModel} from './Tile';

interface Props {
	items: TileModel[];
	cols: number;
	/** select: tick badges on chosen items, others dimmed. pick: a tick badge on the one
	 *  chosen, nothing dimmed (the tiles are previews). reorder: plain tiles. */
	mode: 'select' | 'pick' | 'reorder';
	checkedKeys: string[];
	/** index of the tile picked up in re-order mode, or -1 */
	liftedIndex: number;
	focused: boolean;
	selected: number;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
	/** of the visible part with the room around it (gridBleed); it shows whole rows */
	height: number;
}

/** a tile's name: two lines and the space above them (see .tile__label) */
const LABEL_HEIGHT = Math.round(FONT.tileLabel * 2.4) + LAYOUT.tileLabelGap;
const GRID_ROW_GAP = LAYOUT.gridRowGap;
const ROW_STEP = LAYOUT.tileSize + LABEL_HEIGHT + GRID_ROW_GAP;

/** Full grid of tiles, `cols` to a row. It shows as many whole rows as fit, and scrolls
 *  by rows to keep the focused one in view. */
export function Grid({
	items,
	cols,
	mode,
	checkedKeys,
	liftedIndex,
	focused,
	selected,
	onSelect,
	onActivate,
	height
}: Props) {
	const rows = Math.ceil(items.length / cols);
	const visible = Math.max(1, Math.floor((height - 2 * LAYOUT.gridBleed + GRID_ROW_GAP) / ROW_STEP));
	const offset = firstShownRow(Math.floor(selected / cols), rows, visible) * ROW_STEP;

	return (
		<div class="grid__viewport" style={{height: `${height}px`}}>
			<div
				class="grid__track"
				style={{width: `${cols * (LAYOUT.tileSize + LAYOUT.tileGap)}px`, transform: `translateY(${-offset}px)`}}
			>
				{items.map((item, i) => {
					const checked = mode !== 'reorder' && checkedKeys.indexOf(item.key) !== -1;
					return (
						<Tile
							key={item.key}
							model={item}
							focused={focused && i === selected}
							lifted={i === liftedIndex}
							checked={checked}
							dimmed={mode === 'select' && !checked}
							onHover={() => onSelect(i)}
							onActivate={() => onActivate(i)}
						/>
					);
				})}
			</div>
		</div>
	);
}
