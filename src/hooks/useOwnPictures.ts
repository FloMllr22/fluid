import {useEffect, useState} from 'preact/hooks';
import type {Photo} from '../lib/backgrounds';
import {joinPath} from '../lib/pictures';
import {platform} from '../platform';
import type {Background} from '../state/settings';

const photoOf = (path: string): Photo => {
	const url = platform.pictureUrl(path);
	return {id: path, url, thumbUrl: url};
};

const samePhotos = (a: Photo[], b: Photo[]) => a.length === b.length && a.every((photo, i) => photo.id === b[i].id);

/** The pictures of the background the user chose from the TV: the picture, or those in the folder.
 *  None until they are known, and none for any other background. They are looked for again whenever
 *  fluid comes back to the front: pictures come and go, so do USB drives, and just after the TV has
 *  started the Homebrew Channel may not answer yet. A failure is reported through `onError`, once
 *  until reading works again, and the default background shows meanwhile. */
export function useOwnPictures(background: Background, onError: (error: unknown) => void): Photo[] {
	const [photos, setPhotos] = useState<Photo[]>([]);
	const path = background.kind === 'picture' || background.kind === 'folder' ? background.path : undefined;

	useEffect(() => {
		if (path === undefined) {
			setPhotos([]);
			return;
		}
		let current = true;
		let told = false;
		const read = () => {
			const found: Promise<Photo[]> =
				background.kind === 'picture'
					? platform.preparePictures().then(() => [photoOf(path)])
					: platform.listPictures(path).then((folder) => folder.pictures.map((name) => photoOf(joinPath(path, name))));
			found.then(
				(next) => {
					if (!current) return;
					told = false;
					setPhotos((shown) => (samePhotos(shown, next) ? shown : next));
				},
				(error: unknown) => {
					if (!current) return;
					setPhotos([]);
					if (!told) onError(error);
					told = true;
				}
			);
		};
		read();
		const stop = platform.onForeground(read);
		return () => {
			current = false;
			stop();
		};
	}, [background.kind, path]);

	return photos;
}
