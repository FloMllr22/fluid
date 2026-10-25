import {useRef} from 'preact/hooks';
import {TIMING} from '../config/constants';
import {CheckMark, Glyph, type GlyphName, StarMark} from './Glyph';

/** Everything a tile needs to draw itself; rows and grids build these from app/input data. */
export interface TileModel {
	key: string;
	label: string;
	/** full-bleed artwork (app icons read from the TV) */
	imageUrl?: string;
	/** built-in vector icon (input sources, the More row) */
	glyph?: GlyphName;
	/** monogram background when there is no artwork */
	color?: string;
	/** a favourite app: shown with a star */
	favorite?: boolean;
}

interface Props {
	model: TileModel;
	focused: boolean;
	/** picked up in re-order mode */
	lifted?: boolean;
	/** shown with a tick badge (settings picker) */
	checked?: boolean;
	/** greyed out (settings picker: not on the home screen) */
	dimmed?: boolean;
	onHover?: () => void;
	onActivate?: () => void;
	/** the pointer's button held on the tile, like holding OK */
	onLongPress?: () => void;
}

export function Tile({model, focused, lifted, checked, dimmed, onHover, onActivate, onLongPress}: Props) {
	// A pointer press held for TIMING.longPressMs is a long press; the click that ends it
	// then does nothing.
	const hold = useRef({timer: 0, fired: false});
	const startHold = () => {
		if (!onLongPress) return;
		hold.current.fired = false;
		hold.current.timer = window.setTimeout(() => {
			hold.current.fired = true;
			onLongPress();
		}, TIMING.longPressMs);
	};
	const endHold = () => window.clearTimeout(hold.current.timer);
	const onClick = () => {
		if (hold.current.fired) hold.current.fired = false;
		else if (onActivate) onActivate();
	};

	const classes = ['tile', focused && 'tile--focused', lifted && 'tile--lifted', dimmed && 'tile--dimmed']
		.filter(Boolean)
		.join(' ');
	return (
		<div
			class={classes}
			onMouseEnter={onHover}
			onMouseDown={startHold}
			onMouseUp={endHold}
			onMouseLeave={endHold}
			onClick={onClick}
		>
			<div class="tile__box" style={model.color && !model.imageUrl ? {background: model.color} : undefined}>
				{model.imageUrl ? (
					<img class="tile__image" src={model.imageUrl} alt="" />
				) : model.glyph ? (
					<Glyph name={model.glyph} />
				) : (
					<div class="tile__monogram">{model.label.charAt(0).toUpperCase()}</div>
				)}
				{model.favorite && (
					<div class="tile__badge tile__badge--favorite">
						<StarMark />
					</div>
				)}
				{checked && (
					<div class="tile__badge">
						<CheckMark />
					</div>
				)}
			</div>
			<div class="tile__label">{model.label}</div>
		</div>
	);
}
