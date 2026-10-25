import {describe, expect, it} from 'vitest';
import {iconsScript, isSafePath, shellQuote} from './shell';

describe('shellQuote', () => {
	it('wraps a plain value in single quotes', () => {
		expect(shellQuote('/usr/palm/applications/app/icon.png')).toBe("'/usr/palm/applications/app/icon.png'");
	});

	it('escapes embedded single quotes', () => {
		expect(shellQuote("it's")).toBe("'it'\\''s'");
	});

	it('keeps shell syntax inert', () => {
		expect(shellQuote('$(reboot); `id` && rm -rf /')).toBe("'$(reboot); `id` && rm -rf /'");
	});
});

describe('isSafePath', () => {
	it('accepts icon paths as webOS reports them', () => {
		expect(isSafePath('/media/cryptofs/apps/usr/palm/applications/com.example.app/icon_130x130.png')).toBe(true);
		expect(isSafePath('/media/cryptofs/apps/usr/palm/applications/com.example.app/./assets/largeIcon.png')).toBe(true);
		expect(isSafePath('/usr/palm/applications/com.webos.app.example/sys-assets/ic_app_2k.png')).toBe(true);
	});

	it('refuses anything a shell could interpret', () => {
		for (const path of [
			'relative/icon.png',
			'/path with space.png',
			"/it's.png",
			'/a;reboot',
			'/a$(id)',
			'/a`id`',
			'/a\nreboot',
			'/a|sh',
			''
		]) {
			expect(isSafePath(path)).toBe(false);
		}
	});
});

describe('iconsScript', () => {
	it('reads each file by index, so nothing but the validated path reaches the shell', () => {
		expect(iconsScript(['/a/one.png', '/b/two.png'])).toBe(
			"printf '%d ' 0; base64 '/a/one.png' 2>/dev/null | tr -d '\\n'; echo; " +
				"printf '%d ' 1; base64 '/b/two.png' 2>/dev/null | tr -d '\\n'; echo"
		);
	});

	it('refuses to build a command with an unsafe path', () => {
		expect(() => iconsScript(['/ok.png', '/bad;reboot'])).toThrow(/unsafe path/);
	});
});
