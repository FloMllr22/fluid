// Adapters from data (apps, inputs, backgrounds) to what the Tile component draws.

import type {GlyphName} from '../components/Glyph';
import type {TileModel} from '../components/Tile';
import {type MessageKey, t} from '../i18n';
import {type AppEntry, type InputSource, LIVE_TV_ID} from '../platform';
import {BACKGROUND_COLORS, type BackgroundColor} from '../state/settings';
import {COLOR_BACKGROUNDS} from '../theme/backgrounds';
import {backgroundKey, type Photo} from './backgrounds';

/** EIM's icon names (LG's images, which fluid does not ship) → fluid's own glyphs.
 *  Anything not listed, such as HDMI_1 … HDMI_4, AV, USB, gets the generic input glyph. */
const INPUT_GLYPHS: Record<string, GlyphName> = {
	tv: 'tv',
	antenna: 'tv',
	satellite: 'tv',
	portaltv: 'tv',
	gameconsole: 'console',
	settopbox: 'player',
	streamingbox: 'player',
	bluray: 'player',
	dvd: 'player',
	vcr: 'player',
	mediaserver: 'player',
	dlna: 'player',
	sound: 'speaker',
	hometheater: 'speaker',
	pc: 'monitor',
	mobile: 'phone',
	screenshare: 'phone',
	camera: 'camera'
};

/** Picks the glyph for an input from the icon name EIM reports, e.g. "gameconsole.png". */
export function inputGlyph(icon: string): GlyphName {
	const name = icon.replace(/\.png$/i, '').toLowerCase();
	return Object.prototype.hasOwnProperty.call(INPUT_GLYPHS, name) ? INPUT_GLYPHS[name] : 'input';
}

export function appTile(app: AppEntry, favorite = false): TileModel {
	const tile: TileModel = {key: app.id, label: app.title, imageUrl: app.iconUrl, color: app.color};
	if (favorite) tile.favorite = true;
	return tile;
}

/** Inputs keep the names set on the TV; Live TV, which fluid adds itself, is named in the
 *  user's language. */
export function inputTile(input: InputSource): TileModel {
	const label = input.id === LIVE_TV_ID ? t('inputs.liveTv') : input.label;
	return {key: input.appId, label, glyph: inputGlyph(input.icon)};
}

const COLOR_NAMES: Record<BackgroundColor, MessageKey> = {
	dark: 'background.dark',
	black: 'background.black',
	blue: 'background.blue'
};

/** The name of a photo that comes with fluid. Every photo has one in every language (see
 *  the locale tests). */
export function photoName(id: string): string {
	return t(`background.photo.${id}` as MessageKey);
}

/** The choices of the Background tab: the colours, each photo, and a slideshow when
 *  there are two photos or more. Each tile is a preview. */
export function backgroundTiles(photos: Photo[]): TileModel[] {
	const tiles: TileModel[] = BACKGROUND_COLORS.map((color) => ({
		key: backgroundKey({kind: 'color', color}),
		label: t(COLOR_NAMES[color]),
		swatch: COLOR_BACKGROUNDS[color]
	}));
	for (const photo of photos)
		tiles.push({
			key: backgroundKey({kind: 'photo', id: photo.id}),
			label: photoName(photo.id),
			imageUrl: photo.thumbUrl
		});
	if (photos.length > 1)
		tiles.push({key: backgroundKey({kind: 'slideshow'}), label: t('background.slideshow'), glyph: 'slideshow'});
	return tiles;
}

/** Order `items` by an ID list, dropping IDs that no longer exist. */
export function pickInOrder<T>(items: T[], ids: string[], idOf: (item: T) => string): T[] {
	const byId: Record<string, T> = {};
	for (const item of items) byId[idOf(item)] = item;
	return ids.map((id) => byId[id]).filter((x): x is T => x !== undefined);
}
