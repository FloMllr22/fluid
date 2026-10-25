import {useCallback, useEffect, useState} from 'preact/hooks';
import {Clock} from '../components/Clock';
import {Header} from '../components/Header';
import {Row} from '../components/Row';
import type {TileModel} from '../components/Tile';
import {useClock} from '../hooks/useClock';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {focusIndex, followItem, type RowFocus} from '../lib/focus';

export interface HomeRow {
	id: string;
	label: string;
	items: TileModel[];
	emptyText?: string;
}

interface Props {
	rows: HomeRow[];
	active: boolean;
	onActivate: (rowId: string, item: TileModel) => void;
	/** OK held on an item, or the pointer's button held on it */
	onLongPress: (rowId: string, item: TileModel) => void;
}

/** The home screen: greeting, clock and the navigable rows.
 *  Up/Down move between rows (each row remembers its item), Left/Right move along a row.
 *  OK opens the item; holding OK asks for its options. */
export function Home({rows, active, onActivate, onLongPress}: Props) {
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

	useOkPress({onPress: withFocused(onActivate), onLongPress: withFocused(onLongPress)}, active);

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
		[rows, rowIndex, focus]
	);

	useKeys(handleKey, active);

	return (
		<div class="screen">
			<Header now={now} />
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
						onSelect={(col) => {
							setRowIndex(i);
							setColumn(row, col);
						}}
						onActivate={(col) => onActivate(row.id, row.items[col])}
						onLongPress={(col) => onLongPress(row.id, row.items[col])}
					/>
				))}
			</div>
		</div>
	);
}
