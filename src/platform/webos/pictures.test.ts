import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PlatformError} from '../errors';
import {lunaCall} from './luna';
import {listPicturePlaces, listPictures, pictureUrl} from './pictures';
import {isPicturePath, pictureFolderScript} from './shell';

vi.mock('./luna', () => ({lunaCall: vi.fn()}));

describe('isPicturePath', () => {
	it('accepts the places with pictures, and what is in them', () => {
		for (const path of [
			'/media/developer/pictures',
			'/media/developer/pictures/Urlaub 2024',
			'/tmp/usb/sda/sda1',
			"/tmp/usb/sda/sda1/Mamas Foto (1) 'alt' #2.jpg"
		]) {
			expect(isPicturePath(path)).toBe(true);
		}
	});

	it('refuses all else: this goes to a root shell', () => {
		for (const path of [
			'/',
			'/etc/passwd',
			'/tmp/usb',
			'/media/developer/pictures/../../../etc',
			'/tmp/usb/sda/../../../etc',
			'/media/developer/picturesother',
			'/tmp/usb/sda/sda1/a\nreboot',
			'relative/path',
			''
		]) {
			expect(isPicturePath(path)).toBe(false);
		}
	});
});

describe('pictureFolderScript', () => {
	it('keeps shell syntax in a name inert', () => {
		const script = pictureFolderScript("/tmp/usb/sda/sda1/$(reboot); it's");
		expect(script).toContain("cd '/tmp/usb/sda/sda1/$(reboot); it'\\''s' &&");
	});

	it('throws on a path outside the places with pictures', () => {
		expect(() => pictureFolderScript('/etc')).toThrow('Refusing');
	});
});

describe('pictureUrl', () => {
	it("leads through the link in fluid's own folder", () => {
		expect(pictureUrl('/media/developer/pictures/a.jpg')).toBe('pictures/internal/a.jpg');
		expect(pictureUrl('/tmp/usb/sda/sda1/a.jpg')).toBe('pictures/usb/sda/sda1/a.jpg');
	});

	it('writes every part so that a URL can carry it', () => {
		expect(pictureUrl('/tmp/usb/sda/sda1/Urlaub #1/a b?.jpg')).toBe('pictures/usb/sda/sda1/Urlaub%20%231/a%20b%3F.jpg');
	});

	it('has nothing for a path elsewhere', () => {
		expect(pictureUrl('/etc/passwd')).toBe('');
	});
});

describe('on the TV', () => {
	const reply = (stdoutString: string) => vi.mocked(lunaCall).mockResolvedValue({returnValue: true, stdoutString});

	beforeEach(() => {
		vi.mocked(lunaCall).mockReset();
	});

	it("finds the TV's own place and each USB drive", async () => {
		reply('/tmp/usb/sda/sda1\n/tmp/usb/sdb/sdb1\n');
		await expect(listPicturePlaces()).resolves.toEqual([
			{kind: 'internal', path: '/media/developer/pictures'},
			{kind: 'usb', path: '/tmp/usb/sda/sda1'},
			{kind: 'usb', path: '/tmp/usb/sdb/sdb1'}
		]);
	});

	it("has only the TV's own place without a USB drive", async () => {
		reply('');
		await expect(listPicturePlaces()).resolves.toEqual([{kind: 'internal', path: '/media/developer/pictures'}]);
	});

	it('reads a folder', async () => {
		reply('Berge/\na.jpg\n//\n');
		await expect(listPictures('/media/developer/pictures')).resolves.toEqual({
			folders: ['Berge'],
			pictures: ['a.jpg'],
			tooLarge: 0
		});
	});

	it('passes on a failure', async () => {
		vi.mocked(lunaCall).mockImplementation(() => Promise.reject(new PlatformError('rejected', 'no such folder')));
		const error = await listPicturePlaces().catch((e: unknown) => e);
		expect(error).toBeInstanceOf(PlatformError);
		expect((error as PlatformError).code).toBe('rejected');
	});
});
