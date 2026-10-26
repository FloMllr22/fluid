import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
	APP_ID_PATTERN,
	ipkName,
	parseEnvFile,
	parseInstallReplies,
	parseLunaReply,
	resolveTarget,
	sshArgs
} from './tv.mjs';

describe('parseEnvFile', () => {
	it('reads KEY=VALUE lines and skips comments and blank lines', () => {
		expect(parseEnvFile('# TV\nTV_HOST=192.0.2.10\n\n  TV_PORT = 22  \n')).toEqual({
			TV_HOST: '192.0.2.10',
			TV_PORT: '22'
		});
	});

	it('accepts Windows line endings and quoted values', () => {
		expect(parseEnvFile('TV_USER="root"\r\nTV_KEY=\'~/.ssh/fluid tv\'\r\n')).toEqual({
			TV_USER: 'root',
			TV_KEY: '~/.ssh/fluid tv'
		});
	});

	it('keeps an empty value', () => {
		expect(parseEnvFile('TV_KEY=')).toEqual({TV_KEY: ''});
	});

	it('names the line it cannot read', () => {
		expect(() => parseEnvFile('TV_HOST=tv\nthis is not a setting')).toThrow(/line 2/);
	});
});

describe('resolveTarget', () => {
	const home = resolve('/home/tester');

	it('fills in port 22 and user root', () => {
		expect(resolveTarget({TV_HOST: '192.0.2.10'}, home)).toEqual({
			host: '192.0.2.10',
			port: 22,
			user: 'root',
			key: undefined
		});
	});

	it('accepts user@host as written in older tv.env files', () => {
		expect(resolveTarget({TV_HOST: 'admin@tv.local'}, home)).toMatchObject({host: 'tv.local', user: 'admin'});
	});

	it('lets TV_USER win over the user in TV_HOST', () => {
		expect(resolveTarget({TV_HOST: 'admin@tv.local', TV_USER: 'root'}, home).user).toBe('root');
	});

	it('accepts IPv6 addresses and ssh config aliases', () => {
		expect(resolveTarget({TV_HOST: 'fe80::1'}, home).host).toBe('fe80::1');
		expect(resolveTarget({TV_HOST: 'lgtv'}, home).host).toBe('lgtv');
	});

	it('expands ~ in the key path to the home folder', () => {
		expect(resolveTarget({TV_HOST: 'tv', TV_KEY: '~/.ssh/fluid_tv'}, home).key).toBe(resolve(home, '.ssh', 'fluid_tv'));
	});

	it('rejects values that could be read as ssh options or shell syntax', () => {
		expect(() => resolveTarget({TV_HOST: '-oProxyCommand=calc'}, home)).toThrow(/TV_HOST/);
		expect(() => resolveTarget({TV_HOST: 'tv; reboot'}, home)).toThrow(/TV_HOST/);
		expect(() => resolveTarget({TV_HOST: 'tv', TV_USER: '-l'}, home)).toThrow(/TV_USER/);
	});

	it('lists every problem at once', () => {
		expect(() => resolveTarget({TV_PORT: '70000', TV_USER: 'a b'}, home)).toThrow(
			/TV_HOST is not set\nTV_USER "a b".*\nTV_PORT "70000"/
		);
	});
});

describe('sshArgs', () => {
	it('never waits for a password and puts the destination last', () => {
		const args = sshArgs({host: 'tv', port: 2222, user: 'root', key: '/k'});
		expect(args).toContain('BatchMode=yes');
		expect(args).toContain('LogLevel=ERROR');
		expect(args.slice(args.indexOf('-p'), args.indexOf('-p') + 2)).toEqual(['-p', '2222']);
		expect(args.slice(args.indexOf('-i'), args.indexOf('-i') + 2)).toEqual(['-i', '/k']);
		expect(args[args.length - 1]).toBe('root@tv');
	});

	it('leaves the key to ssh when none is set and adds -tt on request', () => {
		const args = sshArgs({host: 'tv', port: 22, user: 'root'}, {tty: true});
		expect(args).not.toContain('-i');
		expect(args).toContain('-tt');
	});
});

describe('parseInstallReplies', () => {
	it('recognises a successful install', () => {
		const output = [
			'{"returnValue":true,"subscribed":true}',
			'{"id":"com.ares.defaultName","details":{"state":"installing"},"subscribed":true}',
			'{"id":"com.ares.defaultName","details":{"state":"installing"},"subscribed":true}',
			'{"id":"com.ares.defaultName","details":{"state":"installed"},"subscribed":true}'
		].join('\r\n');
		expect(parseInstallReplies(output)).toEqual({
			states: ['installing', 'installed'],
			errors: [],
			installed: true,
			finished: true
		});
	});

	it('is not finished while the install is still running', () => {
		const output = '{"returnValue":true,"subscribed":true}\n{"details":{"state":"installing : start"}}';
		expect(parseInstallReplies(output)).toMatchObject({installed: false, finished: false});
	});

	it('reports why an install failed', () => {
		const output =
			'{"returnValue":true}\n{"details":{"state":"install failed","errorCode":-5,"reason":"Installation failure"}}';
		expect(parseInstallReplies(output)).toEqual({
			states: ['install failed'],
			errors: ['Installation failure'],
			installed: false,
			finished: true
		});
	});

	it('treats a rejected request as failed', () => {
		expect(parseInstallReplies('{"returnValue":false,"errorText":"Denied method call"}')).toMatchObject({
			installed: false,
			finished: true,
			errors: ['Denied method call']
		});
	});
});

describe('package naming', () => {
	it('matches what ares-package produces', () => {
		expect(ipkName({id: 'io.github.flomllr22.fluid', version: '0.1.0'})).toBe(
			'io.github.flomllr22.fluid_0.1.0_all.ipk'
		);
	});

	it('only lets plain app IDs into commands run on the TV', () => {
		expect(APP_ID_PATTERN.test('io.github.flomllr22.fluid')).toBe(true);
		expect(APP_ID_PATTERN.test("x'; reboot; '")).toBe(false);
	});
});

describe('parseLunaReply', () => {
	it('reads a successful reply, with the terminal line ending', () => {
		expect(parseLunaReply('{"returnValue":true}\r\n')).toEqual({ok: true, appId: '', error: ''});
	});

	it('reads the foreground app', () => {
		const reply = '{"appId":"io.github.flomllr22.fluid","returnValue":true,"windowId":"","processId":""}\r\n';
		expect(parseLunaReply(reply)).toMatchObject({ok: true, appId: 'io.github.flomllr22.fluid'});
	});

	it('reads a refusal and its reason', () => {
		const reply = '{"returnValue":false,"errorCode":-101,"errorText":"app is being closed"}';
		expect(parseLunaReply(reply)).toEqual({ok: false, appId: '', error: 'app is being closed'});
	});

	it('counts no reply or an unreadable one as a failure', () => {
		for (const output of ['', 'Connection closed', '{broken'])
			expect(parseLunaReply(output), output).toEqual({ok: false, appId: '', error: ''});
	});
});
