import {useCallback, useEffect, useState} from 'preact/hooks';
import {Clock} from '../components/Clock';
import {Header} from '../components/Header';
import {Row} from '../components/Row';
import type {MoveArrows, TileModel} from '../components/Tile';
import {useClock} from '../hooks/useClock';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {t} from '../i18n';
import {focusIndex, followItem, type RowFocus} from '../lib/focus';

export interface HomeRow {
	id: string;
	label: string;
	items: TileModel[];
	emptyText?: string;
}

/** An item being moved along its row, and which ways it can go. */
export interface MovingItem {
	rowId: string;
	key: string;
	arrows: MoveArrows;
}

interface Props {
	rows: HomeRow[];
	active: boolean;
	onActivate: (rowId: string, item: TileModel) => void;
	/** OK held on an item, or the pointer's button held on it */
	onLongPress: (rowId: string, item: TileModel) => void;
	/** move mode: the focused item, being moved; the rows show its new place as it goes */
	moving?: MovingItem;
	/** ← or → in move mode */
	onMove: (step: -1 | 1) => void;
	/** OK (keep the new place) or Back (put it back) in move mode */
	onMoveEnd: (keep: boolean) => void;
}

/** The home screen: greeting, clock and the navigable rows.
 *  Up/Down move between rows (each row remembers its item), Left/Right move along a row.
 *  OK opens the item; holding OK asks for its options.
 *  Move mode is a variant of this: the focused item stays focused and lifted while
 *  Left/Right move it along its row, OK keeps its new place and Back cancels. Focus is
 *  kept by item, so it follows the item and stays on it afterwards. */
export function Home({rows, active, onActivate, onLongPress, moving, onMove, onMoveEnd}: Props) {
	const now = useClock();
	const timeFormat = useTimeFormat();
	const [rowIndex, setRowIndex] = useState(0);
	const [focus, setFocus] = useState<Record<string, RowFocus>>({});

	const columnOf = (row: HomeRow) =>
		focusIndex(
			row.items.map((item) => item.key),
			focus[row.id]
		);
	const setColumn = (row: HomeRow, index: number) => {
		const item = row.items[index];
		if (item) setFocus((f) => ({...f, [row.id]: {key: item.key, index}}));
	};
	const withFocused = (act: (rowId: string, item: TileModel) => void) => () => {
		const row = rows[rowIndex];
		if (!row) return;
		const item = row.items[columnOf(row)];
		if (item) act(row.id, item);
	};

	// In move mode OK puts the item down; holding OK does nothing there, so that move mode
	// never ends while OK is still held (its release would then open the item). Move mode
	// is opened from the menu, possibly by holding OK: then OK counts once released.
	const drop = () => onMoveEnd(true);
	useOkPress(
		moving
			? {onPress: drop, onLongPress: () => undefined}
			: {onPress: withFocused(onActivate), onLongPress: withFocused(onLongPress)},
		active,
		moving !== undefined
	);

	// When a row changes order, the remembered places move with their items: hiding the
	// focused app then leaves focus where that app last was.
	useEffect(() => {
		setFocus((current) => {
			let next = current;
			for (const row of rows) {
				const remembered = current[row.id];
				if (!remembered) continue;
				const moved = followItem(
					row.items.map((item) => item.key),
					remembered
				);
				if (moved !== remembered) next = {...next, [row.id]: moved};
			}
			return next;
		});
	}, [rows]);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (moving) {
				if (key === 'left') onMove(-1);
				else if (key === 'right') onMove(1);
				else if (key === 'back') onMoveEnd(false);
				return true; // OK goes through useOkPress; Up and Down stay in the row
			}
			const row = rows[rowIndex];
			if (!row) return false;
			switch (key) {
				case 'up':
					setRowIndex((r) => clamp(r - 1, 0, rows.length - 1));
					return true;
				case 'down':
					setRowIndex((r) => clamp(r + 1, 0, rows.length - 1));
					return true;
				case 'left':
					setColumn(row, clamp(columnOf(row) - 1, 0, row.items.length - 1));
					return true;
				case 'right':
					setColumn(row, clamp(columnOf(row) + 1, 0, row.items.length - 1));
					return true;
				case 'enter':
					return true; // handled by useOkPress (press vs hold)
				case 'back':
					return true; // swallow: Back on the home screen does nothing
			}
		},
		[rows, rowIndex, focus, moving, onMove, onMoveEnd]
	);

	useKeys(handleKey, active);

	const movingRow = moving ? rows.find((row) => row.id === moving.rowId) : undefined;
	const movingItem = moving && movingRow ? movingRow.items.find((item) => item.key === moving.key) : undefined;

	/** Focus an item, as the pointer does by pointing at it. */
	const focusItem = (i: number, col: number) => {
		setRowIndex(i);
		setColumn(rows[i], col);
	};

	// In move mode the pointer neither moves focus nor opens anything: it clicks the
	// arrows, or the moving item to put it down. Holding the pointer's button focuses the
	// item before its menu opens, as the arrow keys may have moved focus away meanwhile:
	// the menu, and move mode, act on the focused item.
	return (
		<div class={`screen${moving ? ' home--moving' : ''}`}>
			<Header now={now} moving={movingItem ? movingItem.label : undefined} />
			<Clock now={now} format={timeFormat} />
			<div class="rows">
				{rows.map((row, i) => (
					<Row
						key={row.id}
						label={row.label}
						items={row.items}
						emptyText={row.emptyText}
						focused={i === rowIndex}
						selected={columnOf(row)}
						moving={moving && row === movingRow ? moving.arrows : undefined}
						onSelect={(col) => {
							if (!moving) focusItem(i, col);
						}}
						onActivate={(col) => {
							if (!moving) onActivate(row.id, row.items[col]);
							else if (row === movingRow && col === columnOf(row)) drop();
						}}
						onLongPress={(col) => {
							if (moving) return;
							focusItem(i, col);
							onLongPress(row.id, row.items[col]);
						}}
						onMove={onMove}
					/>
				))}
			</div>
			{moving && <p class="hint">{t('move.hint')}</p>}
		</div>
	);
}
