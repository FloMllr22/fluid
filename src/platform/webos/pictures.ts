// Pictures from a USB stick or the TV's own storage. A web app may only read its own folder, also
// through file://, but it follows links there: so a few links in fluid's folder lead to where
// pictures are, and a picture is an ordinary <img>, however large, with nothing passing through
// the Homebrew Channel but the names in a folder. An update of fluid takes the links away, so they
// are made anew before fluid looks for a picture.

import {parsePictureFolder} from '../../lib/pictures';
import type {PictureFolder, PicturePlace} from '../types';
import {INTERNAL_PICTURES, linkPicturePlaces, readPictureFolder, USB_PICTURES} from './shell';

/** The folder of links, relative to fluid's page, and what each link stands for. */
const LINKS: [string, string][] = [
	[USB_PICTURES, 'pictures/usb'],
	[INTERNAL_PICTURES, 'pictures/internal']
];

let partitions: Promise<string> | undefined;

/** Makes the links, once per start of fluid; a failure may be tried again. Resolves with the USB
 *  drives on the TV at that time. */
function linked(): Promise<string> {
	if (partitions) return partitions;
	const attempt = linkPicturePlaces();
	partitions = attempt;
	attempt.catch(() => {
		if (partitions === attempt) partitions = undefined;
	});
	return attempt;
}

export function preparePictures(): Promise<void> {
	return linked().then(() => undefined);
}

/** The places with pictures: the TV's own, and each USB drive, read anew each time, as drives come
 *  and go. */
export function listPicturePlaces(): Promise<PicturePlace[]> {
	partitions = undefined;
	return linked().then((out) => {
		const drives = out.split('\n').filter((line) => line.startsWith(`${USB_PICTURES}/`));
		const usb: PicturePlace[] = drives.map((path) => ({kind: 'usb', path}));
		return [{kind: 'internal', path: INTERNAL_PICTURES} as PicturePlace].concat(usb);
	});
}

export function listPictures(path: string): Promise<PictureFolder> {
	return linked()
		.then(() => readPictureFolder(path))
		.then(parsePictureFolder);
}

/** Where fluid's page finds a picture: the path, with the link in place of the place it stands
 *  for, and every part written so that a URL can carry it. */
export function pictureUrl(path: string): string {
	for (const [place, link] of LINKS) {
		if (path.startsWith(`${place}/`)) {
			return `${link}/${path
				.slice(place.length + 1)
				.split('/')
				.map(encodeURIComponent)
				.join('/')}`;
		}
	}
	return '';
}
