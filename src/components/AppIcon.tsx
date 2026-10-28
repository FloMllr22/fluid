import {Glyph} from './Glyph';
import type {TileModel} from './Tile';

/** An app's icon in a rounded square: its artwork from the TV, otherwise a glyph or its
 *  first letter on its colour. */
export function AppIcon({model}: {model: TileModel}) {
	const fill = model.color && !model.imageUrl ? model.color : undefined;
	return (
		<span class={fill ? 'app-icon app-icon--color' : 'app-icon'} style={fill ? {background: fill} : undefined}>
			{model.imageUrl ? (
				<img class="app-icon__image" src={model.imageUrl} alt="" />
			) : model.glyph ? (
				<Glyph name={model.glyph} className="app-icon__glyph" />
			) : (
				<span class="app-icon__monogram">{model.label.charAt(0).toUpperCase()}</span>
			)}
		</span>
	);
}
