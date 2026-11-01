// Pictures of the user's on the TV, as pure functions: what counts as a picture, and how a listing
// from the TV reads. See platform/webos/pictures.ts for how they get to the screen.

/** Larger files are not offered: decoding them takes too long and too much memory on a TV. */
export const PICTURE_MAX_MB = 16;

/** What the TV's browser can draw. */
const PICTURE_NAME = /\.(jpe?g|png|webp|bmp|gif)$/i;

export function isPictureName(name: string): boolean {
	return PICTURE_NAME.test(name) && !name.startsWith('.');
}

/** A folder on the TV: what is in it, by name, in the order a person expects. */
export interface PictureFolder {
	folders: string[];
	pictures: string[];
	/** pictures left out for being larger than PICTURE_MAX_MB */
	tooLarge: number;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});

/** The line between the two parts of a listing: no file can be called that. */
export const LISTING_DIVIDER = '//';

/** Reads a listing: the folder's entries, one per line, folders ending in a slash; a divider; then
 *  the files too large to offer, as "./name". */
export function parsePictureFolder(out: string): PictureFolder {
	const lines = out.split('\n').filter((line) => line !== '');
	const at = lines.indexOf(LISTING_DIVIDER);
	const entries = at === -1 ? lines : lines.slice(0, at);
	const large = at === -1 ? [] : lines.slice(at + 1).map((line) => line.replace(/^\.\//, ''));
	const isLarge = (name: string) => large.indexOf(name) !== -1;
	const pictures = entries.filter((name) => !name.endsWith('/') && isPictureName(name));
	return {
		folders: entries
			.filter((name) => name.endsWith('/'))
			.map((name) => name.slice(0, -1))
			.sort(byName),
		pictures: pictures.filter((name) => !isLarge(name)).sort(byName),
		tooLarge: pictures.filter(isLarge).length
	};
}

/** A path's last part: the name of a file or folder. */
export function baseName(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

/** A file or folder within a folder. */
export function joinPath(folder: string, name: string): string {
	return `${folder}/${name}`;
}
