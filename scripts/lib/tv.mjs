// Shared helpers for the scripts that talk to the TV (package, deploy): reading tv.env,
// building ssh arguments and reading the install service's replies. The parsing and
// validation functions have no side effects so they can be unit-tested.
import {existsSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** The project root, wherever the scripts are started from. */
export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** webOS app IDs: lowercase letters, digits, "." "+" "-". Checked before an ID is put
 *  into a command that runs on the TV. */
export const APP_ID_PATTERN = /^[a-z0-9][a-z0-9.+-]*[a-z0-9]$/;

const HOSTNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/;
const IPV6 = /^[0-9A-Fa-f]*:[0-9A-Fa-f:.]*$/;
const USER = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function readAppInfo() {
	return JSON.parse(readFileSync(join(ROOT, 'public', 'appinfo.json'), 'utf8'));
}

/** File name ares-package gives the package. */
export function ipkName(appInfo) {
	return `${appInfo.id}_${appInfo.version}_all.ipk`;
}

/** Parses KEY=VALUE lines. Blank lines and lines starting with # are skipped; a value
 *  may be wrapped in single or double quotes. */
export function parseEnvFile(text) {
	const vars = {};
	text.split(/\r?\n/).forEach((raw, index) => {
		const line = raw.trim();
		if (!line || line.startsWith('#')) return;
		const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
		if (!match) throw new Error(`line ${index + 1}: expected KEY=VALUE, found "${line}"`);
		const quoted = /^(["'])(.*)\1$/.exec(match[2]);
		vars[match[1]] = quoted ? quoted[2] : match[2];
	});
	return vars;
}

/** Validates the TV_* settings and fills in defaults. Throws one error listing every
 *  problem. TV_HOST may also be given as user@host. */
export function resolveTarget(vars, home = homedir()) {
	const problems = [];
	let host = (vars.TV_HOST || '').trim();
	let user = (vars.TV_USER || '').trim();
	const at = host.lastIndexOf('@');
	if (at !== -1) {
		user = user || host.slice(0, at);
		host = host.slice(at + 1);
	}
	user = user || 'root';
	const portText = (vars.TV_PORT || '').trim() || '22';
	const port = Number(portText);
	const keyText = (vars.TV_KEY || '').trim();

	if (!host) problems.push('TV_HOST is not set');
	else if (!HOSTNAME.test(host) && !IPV6.test(host))
		problems.push(`TV_HOST "${host}" is not a host name or IP address`);
	if (!USER.test(user)) problems.push(`TV_USER "${user}" is not a valid user name`);
	if (!/^\d+$/.test(portText) || port < 1 || port > 65535) problems.push(`TV_PORT "${portText}" is not a port number`);
	if (problems.length) throw new Error(problems.join('\n'));

	const key = keyText ? resolve(keyText.replace(/^~(?=$|[\\/])/, home)) : undefined;
	return {host, port, user, key};
}

/** Reads tv.env (values in the environment win) and checks that the key file exists. */
export function loadTarget(env = process.env) {
	const file = join(ROOT, 'tv.env');
	let vars = {};
	if (existsSync(file)) {
		try {
			vars = parseEnvFile(readFileSync(file, 'utf8'));
		} catch (error) {
			throw new Error(`tv.env ${error.message}`);
		}
	} else if (!env.TV_HOST) {
		throw new Error('tv.env not found. Copy tv.env.example to tv.env and fill in your TV and SSH key.');
	}
	for (const name of ['TV_HOST', 'TV_PORT', 'TV_USER', 'TV_KEY']) {
		if (env[name]) vars[name] = env[name];
	}
	const target = resolveTarget(vars);
	if (target.key && !existsSync(target.key)) throw new Error(`TV_KEY: no key file at ${target.key}`);
	return target;
}

/** ssh options for an unattended session: key authentication only, so a missing or
 *  wrong key fails at once instead of waiting at a password prompt. The remote command
 *  goes after these. */
export function sshArgs(target, {tty = false} = {}) {
	// LogLevel=ERROR hides notices such as "Connection closed" but keeps real errors.
	const args = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'LogLevel=ERROR', '-p', String(target.port)];
	if (target.key) args.push('-i', target.key, '-o', 'IdentitiesOnly=yes');
	if (tty) args.push('-tt');
	args.push(`${target.user}@${target.host}`);
	return args;
}

/** Reads the reply of a one-shot luna-send call (`-n 1`; it only prints with a terminal,
 *  see sshArgs' tty): whether it succeeded, the app ID it names (getForegroundAppInfo),
 *  and its error text. Anything unreadable counts as a failure. */
export function parseLunaReply(output) {
	const json = /\{[\s\S]*\}/.exec(output);
	let reply = {};
	try {
		reply = json ? JSON.parse(json[0]) : {};
	} catch {
		reply = {};
	}
	return {
		ok: reply.returnValue === true,
		appId: typeof reply.appId === 'string' ? reply.appId : '',
		error: typeof reply.errorText === 'string' ? reply.errorText : ''
	};
}

/** Reads the replies of appInstallService/dev/install (one JSON object per reply).
 *  `states` lists each install state once, in order. `finished` turns true with the
 *  last reply that matters: the subscription itself stays open until it times out. */
export function parseInstallReplies(output) {
	const states = [];
	for (const match of output.matchAll(/"state"\s*:\s*"([^"]*)"/g)) {
		if (states[states.length - 1] !== match[1]) states.push(match[1]);
	}
	const errors = [];
	for (const match of output.matchAll(/"(?:errorText|reason)"\s*:\s*"([^"]*)"/g)) {
		if (errors.indexOf(match[1]) === -1) errors.push(match[1]);
	}
	const rejected = /"returnValue"\s*:\s*false/.test(output);
	const failed = rejected || /"errorCode"\s*:/.test(output) || states.some((state) => /fail/i.test(state));
	const installed = states.indexOf('installed') !== -1 && !failed;
	return {states, errors, installed, finished: installed || failed};
}
