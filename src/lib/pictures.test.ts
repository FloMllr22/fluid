import {describe, expect, it} from 'vitest';
import {baseName, isPictureName, joinPath, LISTING_DIVIDER, parsePictureFolder} from './pictures';

describe('isPictureName', () => {
	it('knows what the TV can draw, in any case', () => {
		for (const name of ['a.jpg', 'a.JPEG', 'a.png', 'a.webp', 'a.bmp', 'a.gif', 'Urlaub 2024.JPG']) {
			expect(isPictureName(name)).toBe(true);
		}
	});

	it('leaves out everything else, and the hidden files of other systems', () => {
		for (const name of ['a.mp4', 'a.txt', 'jpg', '.a.jpg', '._Urlaub.jpg']) {
			expect(isPictureName(name)).toBe(false);
		}
	});
});

describe('parsePictureFolder', () => {
	const listing = (...lines: string[]) => lines.join('\n');

	it('tells folders from pictures, and drops what is neither', () => {
		expect(parsePictureFolder(listing('Berge/', 'a.jpg', 'film.mp4', LISTING_DIVIDER))).toEqual({
			folders: ['Berge'],
			pictures: ['a.jpg'],
			tooLarge: 0
		});
	});

	it('sorts as a person would, numbers by their value', () => {
		const {pictures, folders} = parsePictureFolder(listing('b/', 'A/', 'bild10.jpg', 'Bild2.jpg', 'bild1.jpg'));
		expect(pictures).toEqual(['bild1.jpg', 'Bild2.jpg', 'bild10.jpg']);
		expect(folders).toEqual(['A', 'b']);
	});

	it('leaves out pictures that are too large, and counts them', () => {
		const out = listing('klein.jpg', 'riesig.jpg', 'film.mp4', LISTING_DIVIDER, './riesig.jpg', './film.mp4');
		expect(parsePictureFolder(out)).toEqual({folders: [], pictures: ['klein.jpg'], tooLarge: 1});
	});

	it('keeps names with spaces and other characters as they are', () => {
		expect(parsePictureFolder(listing("Mamas Foto (1) #2 'alt'.jpg")).pictures).toEqual([
			"Mamas Foto (1) #2 'alt'.jpg"
		]);
	});

	it('is empty for an empty folder', () => {
		expect(parsePictureFolder('')).toEqual({folders: [], pictures: [], tooLarge: 0});
		expect(parsePictureFolder(`${LISTING_DIVIDER}\n`)).toEqual({folders: [], pictures: [], tooLarge: 0});
	});
});

describe('paths', () => {
	it('takes a path apart and puts it together', () => {
		expect(baseName('/tmp/usb/sda/sda1/Urlaub')).toBe('Urlaub');
		expect(joinPath('/tmp/usb', 'a b.jpg')).toBe('/tmp/usb/a b.jpg');
	});
});
