// Adapters from data (apps, inputs) to what the Tile component draws.

import type {GlyphName} from '../components/Glyph';
import type {TileModel} from '../components/Tile';
import type {AppEntry} from './apps';
import type {InputSource} from './inputs';

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

export function appTile(app: AppEntry): TileModel {
	return {key: app.id, label: app.title, imageUrl: app.iconUrl, color: app.color};
}

export function inputTile(input: InputSource): TileModel {
	return {key: input.appId, label: input.label, glyph: inputGlyph(input.icon)};
}

/** Order `items` by an ID list, dropping IDs that no longer exist. */
export function pickInOrder<T>(items: T[], ids: string[], idOf: (item: T) => string): T[] {
	const byId: Record<string, T> = {};
	for (const item of items) byId[idOf(item)] = item;
	return ids.map((id) => byId[id]).filter((x): x is T => x !== undefined);
}
