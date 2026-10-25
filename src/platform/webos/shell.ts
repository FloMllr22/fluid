// The only shell commands fluid runs. They go through the Homebrew Channel's `exec`
// service, which runs any command it is given as root, so nothing else may reach it:
// `exec` is private to this module, each command is fixed, and every parameter is
// validated here before it becomes part of a command.

import {LUNA} from './constants';
import {type LunaResponse, lunaCall} from './luna';

interface ExecResponse extends LunaResponse {
	stdoutString?: string;
}

/** Plain absolute paths only. Anything else (quotes, spaces, control characters, shell
 *  syntax) is refused rather than passed to a root shell. */
const SAFE_PATH = /^\/[A-Za-z0-9._/+@-]+$/;

export function isSafePath(path: string): boolean {
	return SAFE_PATH.test(path);
}

/** Quote a value for a POSIX shell. Defence in depth: paths are also validated. */
export function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function exec(command: string, timeoutMs: number): Promise<string> {
	return lunaCall<ExecResponse>(LUNA.homebrewExec, {command}, timeoutMs).then((r) => r.stdoutString || '');
}

/** Command 1: every app on the TV's launcher (applicationManager/listLaunchPoints), as JSON. */
export function readLaunchPoints(): Promise<string> {
	return exec("luna-send -n 1 luna://com.webos.applicationManager/listLaunchPoints '{}'", 8000);
}

/** The script behind readIcons: one output line per file, "<index> <base64>" (busybox
 *  base64 has no -w, so its line breaks are removed). Throws on an unsafe path. */
export function iconsScript(paths: string[]): string {
	return paths
		.map((path, i) => {
			if (!isSafePath(path)) throw new Error(`Refusing unsafe path: ${path}`);
			return `printf '%d ' ${i}; base64 ${shellQuote(path)} 2>/dev/null | tr -d '\\n'; echo`;
		})
		.join('; ');
}

/** Command 2: the given image files as base64, one "<index> <base64>" line each. */
export function readIcons(paths: string[]): Promise<string> {
	return exec(iconsScript(paths), 15000);
}
