import {useEffect, useState} from 'preact/hooks';
import type {TileModel} from '../components/Tile';
import {dominantColor, parseColor, type Rgb} from '../lib/color';

/** The icon is read this small: enough for its main colour, and quick on any TV. */
const SAMPLE = 24;

/** Each icon's colour once read, by its URL; the icons are data URIs read from the TV. */
const cache = new Map<string, Rgb | null>();

/** The colour of an app: its icon's main colour, or the colour it has without artwork;
 *  null for none (no app, an icon without colour, one that cannot be read). Read once per
 *  icon, then from memory. */
export function useAppColor(model: TileModel | undefined): Rgb | null {
	const url = model?.imageUrl;
	const own = model && !url ? model.color : undefined;
	const [color, setColor] = useState<Rgb | null>(null);

	useEffect(() => {
		if (!url) {
			setColor(own ? colorOf(own) : null);
			return;
		}
		const known = cache.get(url);
		if (known !== undefined) {
			setColor(known);
			return;
		}
		let current = true;
		const image = new Image();
		image.onload = () => {
			const read = readColor(image);
			cache.set(url, read);
			if (current) setColor(read);
		};
		// An icon that does not load shows its first letter instead (AppIcon); the colours
		// that follow the app then fall back to Ice blue, which needs no message.
		image.onerror = () => {
			cache.set(url, null);
			if (current) setColor(null);
		};
		image.src = url;
		return () => {
			current = false;
		};
	}, [url, own]);

	return color;
}

function colorOf(css: string): Rgb | null {
	try {
		return parseColor(css);
	} catch {
		return null; // the sample data's colours are hex; anything else has no colour to follow
	}
}

/** The main colour of a loaded icon, drawn small on a canvas. */
function readColor(image: HTMLImageElement): Rgb | null {
	const canvas = document.createElement('canvas');
	canvas.width = SAMPLE;
	canvas.height = SAMPLE;
	const context = canvas.getContext('2d');
	if (!context) return null;
	context.drawImage(image, 0, 0, SAMPLE, SAMPLE);
	try {
		return dominantColor(context.getImageData(0, 0, SAMPLE, SAMPLE).data);
	} catch {
		return null; // a canvas tainted by an icon from elsewhere cannot be read: no colour to follow
	}
}
