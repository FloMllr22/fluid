import {firstShownRow, shownRows} from '../lib/gridTab';
import {LAYOUT} from '../theme/tokens';
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
	/** the pointer's button held on a tile, like holding OK; without it, a click */
	onHold?: (index: number) => void;
	/** the most the visible part may take, with the room around it (gridBleed); it shows
	 *  only whole rows, and is no higher than they are */
	height: number;
}

/** a tile's name: two lines and the space above them (see .tile__label) */
const LABEL_HEIGHT = LAYOUT.tileLabelHeight + LAYOUT.tileLabelGap;
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
	onHold,
	height
}: Props) {
	const rows = Math.ceil(items.length / cols);
	const shown = shownRows(height, ROW_STEP, GRID_ROW_GAP, LAYOUT.gridBleed);
	const offset = firstShownRow(Math.floor(selected / cols), rows, shown.rows) * ROW_STEP;

	return (
		<div class="grid__viewport" style={{height: `${shown.height}px`}}>
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
							onLongPress={onHold && (() => onHold(i))}
						/>
					);
				})}
			</div>
		</div>
	);
}
