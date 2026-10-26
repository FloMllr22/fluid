import {usePointerHold} from '../hooks/usePointerHold';
import {CheckMark, Glyph, type GlyphName, StarMark} from './Glyph';

/** Everything a tile needs to draw itself; lists and grids build these from app/input data. */
export interface TileModel {
	key: string;
	label: string;
	/** full-bleed artwork (app icons read from the TV) */
	imageUrl?: string;
	/** built-in vector icon (input sources, the slideshow) */
	glyph?: GlyphName;
	/** monogram background when there is no artwork */
	color?: string;
	/** a CSS background that fills the tile, with nothing on it (the background colours) */
	swatch?: string;
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
	const pointer = usePointerHold(onActivate, onLongPress);
	const classes = ['tile', focused && 'tile--focused', lifted && 'tile--lifted', dimmed && 'tile--dimmed']
		.filter(Boolean)
		.join(' ');
	const fill = model.swatch || (model.color && !model.imageUrl ? model.color : undefined);
	return (
		<div class={classes} onMouseEnter={onHover} {...pointer}>
			<div class="tile__box" style={fill ? {background: fill} : undefined}>
				{model.imageUrl ? (
					<img class="tile__image" src={model.imageUrl} alt="" />
				) : model.glyph ? (
					<Glyph name={model.glyph} />
				) : model.swatch ? null : (
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
