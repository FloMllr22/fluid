// public/home-hook.sh runs as root on the TV, so what it does when something goes wrong is tested
// here, with a shell and with stand-ins for the TV: luna-send, mount and umount are small scripts
// that note what they were asked and answer as a TV would. The script itself is the real one, but
// for its paths and its waits. The real thing is tested on the TV (docs/TESTING.md).
//
// Skipped on Windows unless FLUID_HOOK_TESTS=1 is set, as that takes Git's sh on the PATH.

import {spawnSync} from 'node:child_process';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {ROOT, readAppInfo} from './tv.mjs';

const SCRIPT = readFileSync(join(ROOT, 'public', 'home-hook.sh'), 'utf8');
const FLUID = readAppInfo().id;
const LG_HOME = 'com.webos.app.home';
/** The parts of LG's file for the start of the TV that matter here, and one that must stay. */
const LG_START_FILE = {
	inputApps: {HDMI_1: 'com.webos.app.hdmi1'},
	common: {
		firstApp: {firstAppInNormal: '{LAST_INPUT_APP}', firstAppInHome: LG_HOME},
		firstAppByPowerOnReason: {remoteKey: '{LAST_APP}', localKey: '{LAST_APP}', upDownKey: '{LAST_APP}'}
	}
};
const shell = spawnSync('sh', ['-c', 'command -v mkfifo'], {encoding: 'utf8'});
const hasShell = shell.status === 0 && (process.platform !== 'win32' || process.env.FLUID_HOOK_TESTS === '1');

/** A path as the shell knows it (Git's shell on Windows wants /c/Users, not C:\Users). */
const posix = (path) =>
	process.platform === 'win32'
		? path.replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`).replace(/\\/g, '/')
		: path;

/** A script run with the fake TV's tools first in its PATH. */
const runInShell = (bin, script, args) =>
	spawnSync('sh', ['-c', `PATH="${posix(bin)}:$PATH"; export PATH; exec sh "$0" "$@"`, posix(script), ...args], {
		encoding: 'utf8',
		timeout: 20000,
		env: {...process.env, MSYS_NO_PATHCONV: '1'}
	});

/** Waits for what the script does in the background, as it does on the TV. */
async function eventually(check) {
	for (let i = 0; ; i++) {
		try {
			return check();
		} catch (error) {
			if (i >= 200) throw error;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
}

/** A small TV in a folder: what is in front is in a file, as far as luna-send is concerned. */
function makeTv() {
	const dir = mkdtempSync(join(tmpdir(), 'fluid-hook-'));
	const path = (...parts) => join(dir, ...parts);
	const sh = (...parts) => posix(path(...parts));
	for (const folder of ['bin', 'app', 'lg-home', 'state', 'run', 'init.d', 'usr-bin', 'calls', 'prefs']) {
		mkdirSync(path(folder));
	}
	writeFileSync(path('bootd'), sh('prefs', 'bootd.json'));
	writeFileSync(path('lg-bootd.json'), JSON.stringify(LG_START_FILE, null, 4));
	writeFileSync(path('app', 'appinfo.json'), '{}');
	writeFileSync(path('usr-bin', 'home'), 'the real program');
	writeFileSync(path('mounts'), '');
	writeFileSync(path('front'), LG_HOME);
	writeFileSync(path('launch-reply'), '{"returnValue":true}');
	writeFileSync(
		path('lg-home', 'appinfo.json'),
		JSON.stringify({type: 'native', main: `file://${sh('usr-bin', 'home')}`}, null, 4)
	);
	const tool = (name, body) => {
		writeFileSync(path('bin', name), `#!/bin/sh\n${body}\n`);
		chmodSync(path('bin', name), 0o755);
	};
	// answers by the method; opening or closing an app changes what is in front
	tool(
		'luna-send',
		`echo "$*" >>"${sh('calls', 'luna')}"
case "$*" in
*getForegroundAppInfo*) printf '{"appId":"%s","returnValue":true}\\n' "$(cat "${sh('front')}")" ;;
*applicationManager/launch*)
	case "$*" in
	*fluidCheck*) [ -e "${sh('stand-in-runs')}" ] && touch "${sh('run', 'checked')}" ;;
	*'"id":"${LG_HOME}"'*) echo ${LG_HOME} >"${sh('front')}" ;;
	*) grep -q true "${sh('launch-reply')}" && echo ${FLUID} >"${sh('front')}" ;;
	esac
	cat "${sh('launch-reply')}"
	;;
*closeByAppId*)
	grep -c usr-bin "${sh('mounts')}" >"${sh('mounted-at-close')}"
	echo "" >"${sh('front')}"
	;;
esac`
	);
	tool('mount', `echo "$*" >>"${sh('calls', 'mount')}"; echo "x $3 ext4 rw 0 0" >>"${sh('mounts')}"`);
	tool('umount', `echo "$*" >>"${sh('calls', 'umount')}"; : >"${sh('mounts')}"`);
	tool('pidof', 'exit 1'); // LG Home is not running
	tool('sleep', 'exit 0'); // no waiting in a test
	tool('sync', 'exit 0');
	tool('setsid', '"$@"');
	// the real one; on Windows it takes paths as Windows has them, which the shell turns them into
	tool('node', `unset MSYS_NO_PATHCONV; exec "${posix(process.execPath)}" "$@"`);

	const script = SCRIPT.replace(/^APP_DIR=.*$/m, `APP_DIR=${sh('app')}`)
		.replace(/^LG_HOME_DIR=.*$/m, `LG_HOME_DIR=${sh('lg-home')}`)
		.replace(/^MOUNTS=.*$/m, `MOUNTS=${sh('mounts')}`)
		.replace(/^STATE=.*$/m, `STATE=${sh('state')}`)
		.replace(/^RUN=.*$/m, `RUN=${sh('run')}`)
		.replace(/^BOOT_FILE=.*$/m, `BOOT_FILE=${sh('init.d', '60-fluid-home')}`)
		.replace(/^BOOTD=.*$/m, `BOOTD=${sh('bootd')}`)
		.replace(/^LG_START_FILE=.*$/m, `LG_START_FILE=${sh('lg-bootd.json')}`)
		.replace(/^START_FILE=.*$/m, `START_FILE=${sh('prefs', 'bootd.json')}`)
		.replace(/^VERIFY_SECONDS=.*$/m, 'VERIFY_SECONDS=2')
		.replace(/^BOOT_VERIFY_SECONDS=.*$/m, 'BOOT_VERIFY_SECONDS=2')
		// the wait for the user to leave LG Home: here the user leaves at once
		.replace(/\trm -f "\$RUN\/lg-seen" "\$RUN\/front\.\$\$"\n[\s\S]*?done <"\$RUN\/front\.\$\$"\n/, '');
	if (script.includes('done <"$RUN/front.')) throw new Error('The wait in lg_session was not found.');
	writeFileSync(path('app', 'home-hook.sh'), script);
	// the stand-in as asked once: on the TV it then stays, and waits for the app manager
	writeFileSync(
		path('app', 'once.sh'),
		script.replace(/^\tevents="\$RUN\/events\.\$\$"$/m, () => '\treturn 0')
	);

	return {
		path,
		run: (...args) => {
			const result = runInShell(path('bin'), path('app', 'home-hook.sh'), args);
			return {out: result.stdout.trim().split('\n'), code: result.status, err: result.stderr};
		},
		standIn: (args) => runInShell(path('bin'), path('app', 'once.sh'), ['stand-in', args]),
		calls: (name) => (existsSync(path('calls', name)) ? readFileSync(path('calls', name), 'utf8') : ''),
		front: () => readFileSync(path('front'), 'utf8').trim(),
		setFront: (app) => writeFileSync(path('front'), app),
		mounted: () => readFileSync(path('mounts'), 'utf8').includes(sh('usr-bin', 'home')),
		has: (...parts) => existsSync(path(...parts)),
		failures: () => readFileSync(path('state', 'failures'), 'utf8').trim(),
		startFile: () => JSON.parse(readFileSync(path('prefs', 'bootd.json'), 'utf8')),
		startsWithFluid: () => existsSync(path('prefs', 'bootd.json')),
		remove: () => rmSync(dir, {recursive: true, force: true})
	};
}

describe('home-hook.sh as a file', () => {
	it('names the app it belongs to', () => {
		expect(SCRIPT).toContain(`APP_ID=${FLUID}\n`);
	});

	it('has line ends a shell on the TV can read', () => {
		expect(SCRIPT).not.toContain('\r');
		expect(SCRIPT.startsWith('#!/bin/sh\n')).toBe(true);
	});

	it.skipIf(!hasShell)('is a script the shell can read', () => {
		expect(spawnSync('sh', ['-n', join(ROOT, 'public', 'home-hook.sh')]).status).toBe(0);
	});
});

describe.skipIf(!hasShell)('home-hook.sh on a TV', {timeout: 120000}, () => {
	let tv;
	const BOOT_FILE = ['init.d', '60-fluid-home'];
	beforeEach(() => {
		tv = makeTv();
	});
	afterEach(() => tv.remove());

	/** As after turning it on, when the app manager runs the stand-in. */
	const enable = () => {
		writeFileSync(tv.path('stand-in-runs'), '');
		const result = tv.run('enable');
		expect(result.out[0]).toBe('on');
		return result;
	};

	it('is off at first', () => {
		expect(tv.run('status').out).toEqual(['off', 'no']);
		expect(tv.mounted()).toBe(false);
	});

	it('says so where LG Home is no program of its own', () => {
		writeFileSync(tv.path('lg-home', 'appinfo.json'), JSON.stringify({type: 'web', main: 'index.html'}));
		expect(tv.run('status').out[0]).toBe('unsupported');
		expect(tv.run('enable').out[0]).toBe('unsupported');
		expect(tv.has(...BOOT_FILE)).toBe(false);
	});

	it('turned on: covers LG Home, with a boot file, and the TV starts with fluid', () => {
		expect(enable().out).toEqual(['on', 'yes']);
		expect(tv.mounted()).toBe(true);
		expect(tv.has(...BOOT_FILE)).toBe(true);
		expect(tv.startsWithFluid()).toBe(true);
	});

	it('keeps what runs as root in its own folder, not in the writable app folder', () => {
		enable();
		const copy = posix(tv.path('state', 'home-hook.sh'));
		expect(tv.has('state', 'home-hook.sh')).toBe(true);
		expect(readFileSync(tv.path('state', 'stand-in'), 'utf8')).toContain(copy);
		expect(readFileSync(tv.path(...BOOT_FILE), 'utf8')).toContain(copy);
	});

	it('gives everything back when the app manager does not run the stand-in', () => {
		expect(tv.run('enable').out[0]).toBe('unsupported');
		expect(tv.mounted()).toBe(false);
		expect(tv.has(...BOOT_FILE)).toBe(false);
		expect(tv.startsWithFluid()).toBe(false);
		expect(tv.front()).toBe(FLUID); // the check may have brought up LG Home
	});

	it('turned off: nothing stays', () => {
		enable();
		expect(tv.run('disable').out).toEqual(['off', 'no']);
		expect(tv.mounted()).toBe(false);
		expect(tv.has(...BOOT_FILE)).toBe(false);
		expect(tv.has('state', 'home-hook.sh')).toBe(false);
		expect(tv.has('state', 'stand-in')).toBe(false);
		expect(tv.startsWithFluid()).toBe(false);
	});

	it('can be turned on, off and on again', () => {
		enable();
		tv.run('disable');
		enable();
		expect(tv.mounted()).toBe(true);
	});

	describe('the TV starts with fluid', () => {
		it("by a copy of LG's file, in which only what opens first has changed", () => {
			enable();
			const copy = tv.startFile();
			expect(copy.common.firstApp.firstAppInHome).toBe(FLUID);
			expect(copy.common.firstApp.firstAppInNormal).toBe('{LAST_INPUT_APP}');
			expect(copy.common.firstAppByPowerOnReason).toEqual({
				remoteKey: FLUID,
				localKey: FLUID,
				upDownKey: FLUID,
				micomPower: FLUID
			});
			expect(copy.inputApps).toEqual(LG_START_FILE.inputApps);
		});

		it('can be turned off and on again while the Home key opens fluid', () => {
			enable();
			expect(tv.run('start', 'no').out).toEqual(['on', 'no']);
			expect(tv.startsWithFluid()).toBe(false);
			expect(tv.run('start', 'yes').out).toEqual(['on', 'yes']);
			expect(tv.startsWithFluid()).toBe(true);
		});

		it('stays off while LG Home has the Home key: nothing would look after fluid', () => {
			expect(tv.run('start', 'yes').out).toEqual(['off', 'no']);
			expect(tv.startsWithFluid()).toBe(false);
		});

		it('stays off if the user turned it off, also when asked for the state', () => {
			enable();
			tv.run('start', 'no');
			expect(tv.run('status').out).toEqual(['on', 'no']);
		});

		it('leaves alone a copy that is not its own', () => {
			writeFileSync(tv.path('prefs', 'bootd.json'), '{"someone":"else"}');
			expect(enable().out).toEqual(['on', 'unsupported']);
			expect(tv.startFile()).toEqual({someone: 'else'});
			tv.run('disable');
			expect(tv.startFile()).toEqual({someone: 'else'});
		});

		it('is not offered where bootd does not read a copy', () => {
			writeFileSync(tv.path('bootd'), 'another bootd');
			expect(tv.run('status').out).toEqual(['off', 'unsupported']);
			expect(enable().out).toEqual(['on', 'unsupported']);
			expect(tv.startsWithFluid()).toBe(false);
		});

		it("is not offered where LG's file has no table of reasons", () => {
			writeFileSync(tv.path('lg-bootd.json'), '{"common":{}}');
			expect(enable().out).toEqual(['on', 'unsupported']);
			expect(tv.startsWithFluid()).toBe(false);
		});

		it('writes nothing from an LG file it cannot read, and leaves nothing half done', () => {
			writeFileSync(tv.path('lg-bootd.json'), '"firstAppByPowerOnReason" and no JSON');
			expect(enable().out[0]).toBe('on');
			expect(tv.startsWithFluid()).toBe(false);
			expect(tv.has('prefs', 'bootd.json.new')).toBe(false);
		});
	});

	it('being asked for its state covers LG Home again, if that is not so yet', () => {
		enable();
		writeFileSync(tv.path('mounts'), '');
		tv.run('status');
		expect(tv.mounted()).toBe(true);
	});

	it('being asked for its state also means that fluid is up', () => {
		enable();
		tv.run('status');
		expect(tv.has('run', 'alive')).toBe(true);
	});

	describe('fluid does not come up', () => {
		const failOnce = () => {
			tv.setFront(FLUID);
			rmSync(tv.path('run', 'alive'), {force: true});
			return tv.run('watch', '1');
		};

		it('counts it, closes fluid and opens LG Home', () => {
			enable();
			failOnce();
			expect(tv.failures()).toBe('1');
			expect(tv.calls('luna')).toContain('closeByAppId');
			expect(tv.calls('luna')).toContain(`"id":"${LG_HOME}"`);
		});

		it("takes back LG Home's program before closing fluid: the TV asks for Home then", () => {
			enable();
			failOnce();
			expect(readFileSync(tv.path('mounted-at-close'), 'utf8').trim()).toBe('0');
		});

		it('puts the stand-in back once the user has left LG Home', () => {
			enable();
			failOnce();
			expect(tv.mounted()).toBe(true);
		});

		it('leaves alone a user who has moved on to another app', () => {
			enable();
			tv.setFront('com.webos.app.browser');
			rmSync(tv.path('run', 'alive'), {force: true});
			tv.run('watch', '1');
			expect(tv.calls('luna')).not.toContain('closeByAppId');
			expect(tv.front()).toBe('com.webos.app.browser');
			expect(tv.failures()).toBe('1');
		});

		it('after three times in a row it turns itself off, and says so', () => {
			enable();
			failOnce();
			failOnce();
			expect(tv.has(...BOOT_FILE)).toBe(true);
			failOnce();
			expect(tv.has(...BOOT_FILE)).toBe(false);
			expect(tv.mounted()).toBe(false);
			expect(tv.front()).toBe(LG_HOME);
			expect(tv.startsWithFluid()).toBe(false);
			expect(tv.run('status').out[0]).toBe('gave-up');
			tv.run('ack');
			expect(tv.run('status').out[0]).toBe('off');
		});

		it('coming up in between starts the count again', () => {
			enable();
			failOnce();
			failOnce();
			writeFileSync(tv.path('run', 'alive'), '');
			tv.run('watch', '1');
			expect(tv.has('state', 'failures')).toBe(false);
			failOnce();
			expect(tv.has(...BOOT_FILE)).toBe(true);
		});

		it('does nothing once it has been turned off meanwhile', () => {
			enable();
			tv.run('disable');
			tv.setFront(FLUID);
			tv.run('watch', '1');
			expect(tv.calls('luna')).not.toContain('closeByAppId');
			expect(tv.has('state', 'failures')).toBe(false);
		});

		it('turning it on again starts afresh', () => {
			enable();
			failOnce();
			failOnce();
			failOnce();
			enable();
			expect(tv.run('status').out[0]).toBe('on');
			expect(tv.has('state', 'failures')).toBe(false);
		});
	});

	describe('Home asked for', () => {
		it('opens fluid when the Home key is pressed', () => {
			enable();
			tv.setFront('com.webos.app.hdmi3');
			tv.standIn('{"event":"launch","reason":"hotKey","parameters":{"launchType":"homeKey"}}');
			expect(tv.front()).toBe(FLUID);
		});

		it('opens nothing for a preload: fluid would jump in front of a film', () => {
			enable();
			tv.setFront('netflix');
			tv.standIn('{"event":"launch","reason":"preload","parameters":{}}');
			expect(tv.front()).toBe('netflix');
		});

		it('opens nothing for the snapshot taken at boot', () => {
			enable();
			tv.setFront('netflix');
			tv.standIn('{"event":"launch","reason":"undefined","parameters":{"snapshot":true}}');
			expect(tv.front()).toBe('netflix');
		});

		it('understands the app manager with spaces in its JSON too', async () => {
			enable();
			tv.setFront('netflix');
			tv.standIn('{ "event": "launch", "reason": "preload", "parameters": { } }');
			expect(tv.front()).toBe('netflix');
			writeFileSync(tv.path('launch-reply'), '{ "returnValue": true }');
			tv.standIn('{ "event": "launch", "reason": "hotKey", "parameters": { } }');
			expect(tv.front()).toBe(FLUID);
			expect(tv.has('state', 'failures')).toBe(false);
			expect(readFileSync(tv.path('state', 'home-hook.log'), 'utf8')).not.toContain('refused');
		});

		it('with fluid uninstalled: gives everything back, and leaves nothing behind', async () => {
			enable();
			rmSync(tv.path('app', 'appinfo.json'));
			tv.standIn('{"event":"launch","reason":"hotKey","parameters":{}}');
			await eventually(() => expect(tv.has('state')).toBe(false));
			expect(tv.has(...BOOT_FILE)).toBe(false);
			expect(tv.mounted()).toBe(false);
			expect(tv.front()).toBe(LG_HOME);
			expect(tv.startsWithFluid()).toBe(false);
		});

		it('refused at once by the app manager: LG Home, even over another app', async () => {
			enable();
			writeFileSync(tv.path('launch-reply'), '{"returnValue":false,"errorCode":-101}');
			tv.setFront('com.webos.app.browser');
			tv.standIn('{"event":"launch","reason":"hotKey","parameters":{}}');
			await eventually(() => expect(tv.front()).toBe(LG_HOME));
			expect(tv.failures()).toBe('1');
		});
	});

	describe('at the start of the TV', () => {
		const afterRestart = (front) => {
			enable();
			writeFileSync(tv.path('mounts'), '');
			rmSync(tv.path('run', 'alive'), {force: true});
			tv.setFront(front);
		};

		it("takes LG Home's place, with fluid in front", () => {
			afterRestart(LG_HOME);
			tv.run('boot-job');
			expect(tv.mounted()).toBe(true);
			expect(tv.front()).toBe(FLUID);
		});

		it('stays behind an input the TV started on', () => {
			afterRestart('com.webos.app.hdmi3');
			tv.run('boot-job');
			expect(tv.mounted()).toBe(true);
			expect(tv.front()).toBe('com.webos.app.hdmi3');
		});

		it('looks whether fluid is up if the TV started on it: it may hang', async () => {
			afterRestart(FLUID);
			tv.run('boot-job');
			await eventually(() => expect(tv.has('state', 'failures')).toBe(true));
		});

		it('does not open fluid again if the TV started on it: that would close what the user has opened', async () => {
			afterRestart(FLUID);
			writeFileSync(tv.path('run', 'alive'), '');
			writeFileSync(tv.path('calls', 'luna'), '');
			tv.run('boot-job');
			await new Promise((resolve) => setTimeout(resolve, 300));
			expect(tv.calls('luna')).not.toContain('homeKey');
			expect(tv.has('state', 'failures')).toBe(false);
		});

		it("writes its copy anew once a firmware update has changed LG's file", () => {
			afterRestart(FLUID);
			writeFileSync(tv.path('run', 'alive'), '');
			writeFileSync(tv.path('lg-bootd.json'), JSON.stringify({...LG_START_FILE, inputApps: {HDMI_9: 'new'}}));
			tv.run('boot-job');
			expect(tv.startFile().inputApps).toEqual({HDMI_9: 'new'});
			expect(tv.startFile().common.firstApp.firstAppInHome).toBe(FLUID);
			expect(tv.run('status').out).toEqual(['on', 'yes']);
		});

		it("removes its copy if LG's file has become one it does not know", () => {
			afterRestart(FLUID);
			writeFileSync(tv.path('run', 'alive'), '');
			writeFileSync(tv.path('lg-bootd.json'), '{"common":{}}');
			tv.run('boot-job');
			expect(tv.startsWithFluid()).toBe(false);
		});

		it('leaves the copy alone once someone else has changed it', () => {
			afterRestart(FLUID);
			writeFileSync(tv.path('run', 'alive'), '');
			writeFileSync(tv.path('prefs', 'bootd.json'), '{"someone":"else"}');
			tv.run('boot-job');
			expect(tv.startFile()).toEqual({someone: 'else'});
			expect(tv.run('status').out).toEqual(['on', 'unsupported']);
		});

		describe('once fluid is gone, its boot file', () => {
			const bootWithoutFluid = () => {
				rmSync(tv.path('app', 'appinfo.json'));
				expect(runInShell(tv.path('bin'), tv.path(...BOOT_FILE), []).status).toBe(0);
			};

			it('removes itself and all else', () => {
				enable();
				bootWithoutFluid();
				expect(tv.has(...BOOT_FILE)).toBe(false);
				expect(tv.has('state')).toBe(false);
				expect(tv.startsWithFluid()).toBe(false);
			});

			it('opens LG Home if the TV is left in front of nothing', () => {
				enable();
				tv.setFront('');
				bootWithoutFluid();
				expect(tv.front()).toBe(LG_HOME);
			});

			it("opens LG Home over LG's page that says the app is not there", () => {
				enable();
				tv.setFront('com.webos.app.discovery');
				bootWithoutFluid();
				expect(tv.front()).toBe(LG_HOME);
			});

			it('stays behind what the TV has opened by itself', () => {
				enable();
				tv.setFront('com.webos.app.hdmi3');
				bootWithoutFluid();
				expect(tv.front()).toBe('com.webos.app.hdmi3');
			});

			it('leaves a copy alone that is not its own', () => {
				enable();
				writeFileSync(tv.path('prefs', 'bootd.json'), '{"someone":"else"}');
				bootWithoutFluid();
				expect(tv.startFile()).toEqual({someone: 'else'});
			});
		});
	});
});
