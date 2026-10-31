import {describe, expect, it} from 'vitest';
import {homeHookScript, iconsScript, isSafePath, removeAppScript, shellQuote, sizesScript} from './shell';

describe('homeHookScript', () => {
	it("runs the script in fluid's own folder, with a command from the list", () => {
		expect(homeHookScript('status')).toBe(
			"sh '/media/developer/apps/usr/palm/applications/io.github.flomllr22.fluid/home-hook.sh' status"
		);
	});
});

describe('removeAppScript', () => {
	it('names the app', () => {
		expect(removeAppScript('com.example.app')).toContain('"id":"com.example.app"');
		expect(removeAppScript('spotify-beehive')).toContain('"id":"spotify-beehive"');
	});

	it('refuses anything a shell could interpret', () => {
		for (const id of ["a'b", 'a;reboot', 'a$(id)', 'a b', '', '../x', '-rf']) {
			expect(() => removeAppScript(id)).toThrow('unsafe');
		}
	});
});

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

describe('sizesScript', () => {
	it('measures the validated paths, and succeeds when some are missing', () => {
		expect(sizesScript(['/a/one.png', '/b/two.png'])).toBe("wc -c '/a/one.png' '/b/two.png' 2>/dev/null || true");
	});

	it('refuses to build a command with an unsafe path', () => {
		expect(() => sizesScript(['/ok.png', '/bad;reboot'])).toThrow(/unsafe path/);
	});

	it('refuses an empty list, which would leave wc waiting for input', () => {
		expect(() => sizesScript([])).toThrow(/No files/);
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
