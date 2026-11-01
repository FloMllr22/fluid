// The only shell commands fluid runs. They go through the Homebrew Channel's `exec`
// service, which runs any command it is given as root, so nothing else may reach it:
// `exec` is private to this module, each command is fixed, and every parameter is
// validated here before it becomes part of a command.

import {APP_ID} from '../../config/constants';
import {LISTING_DIVIDER, PICTURE_MAX_MB} from '../../lib/pictures';
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

/** A validated, quoted path, ready for a command. Throws on an unsafe path. */
function quotePath(path: string): string {
	if (!isSafePath(path)) throw new Error(`Refusing unsafe path: ${path}`);
	return shellQuote(path);
}

function exec(command: string, timeoutMs: number): Promise<string> {
	return lunaCall<ExecResponse>(LUNA.homebrewExec, {command}, timeoutMs).then((r) => r.stdoutString || '');
}

/** Command 1: every app on the TV's launcher (applicationManager/listLaunchPoints), as JSON. */
export function readLaunchPoints(): Promise<string> {
	return exec("luna-send -n 1 luna://com.webos.applicationManager/listLaunchPoints '{}'", 8000);
}

/** The script behind readFileSizes: one "<size> <path>" line per file that exists (busybox
 *  pads the size with spaces, and adds a "total" line for several files). wc exits with 1
 *  when a file is missing, and the Homebrew Channel fails any command that exits non-zero,
 *  hence `|| true`. Throws on an unsafe path, and on an empty list: wc would then wait for
 *  input until the call times out. */
export function sizesScript(paths: string[]): string {
	if (!paths.length) throw new Error('No files to measure');
	return `wc -c ${paths.map(quotePath).join(' ')} 2>/dev/null || true`;
}

/** Command 2: the size in bytes of each given file that exists. */
export function readFileSizes(paths: string[]): Promise<string> {
	return exec(sizesScript(paths), 8000);
}

/** The script behind readIcons: one output line per file, "<index> <base64>" (busybox
 *  base64 has no -w, so its line breaks are removed). Throws on an unsafe path. */
export function iconsScript(paths: string[]): string {
	return paths
		.map((path, i) => `printf '%d ' ${i}; base64 ${quotePath(path)} 2>/dev/null | tr -d '\\n'; echo`)
		.join('; ');
}

/** Command 3: the given image files as base64, one "<index> <base64>" line each. The
 *  caller keeps the output below the Homebrew Channel's limit (see apps.ts). */
export function readIcons(paths: string[]): Promise<string> {
	return exec(iconsScript(paths), 15000);
}

/** App IDs as webOS has them. Anything else is refused rather than passed to a root shell. */
const SAFE_APP_ID = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

/** The script behind removeApp. It works for apps from LG's store and for those installed
 *  through the Homebrew Channel alike. Throws on an unsafe ID. */
export function removeAppScript(appId: string): string {
	if (!SAFE_APP_ID.test(appId)) throw new Error(`Refusing unsafe app ID: ${appId}`);
	return `luna-send -n 1 luna://com.webos.appInstallService/remove '{"id":"${appId}","subscribe":false}'`;
}

/** Command 4: starts uninstalling an app. It takes its time after the answer. */
export function removeApp(appId: string): Promise<string> {
	return exec(removeAppScript(appId), 8000);
}

/** Where pictures of the user's are: USB drives appear below the first as /<disk>/<partition>; the
 *  second is fluid's own folder in the TV's storage. */
export const USB_PICTURES = '/tmp/usb';
export const INTERNAL_PICTURES = '/media/developer/pictures';

/** Paths in those places, from what a USB drive holds, so any name a file can have: only line
 *  ends and going up are refused, and the name is quoted on its way to the shell. */
export function isPicturePath(path: string): boolean {
	const within =
		path === INTERNAL_PICTURES || path.startsWith(`${INTERNAL_PICTURES}/`) || /^\/tmp\/usb\/[^/]+\/[^/]+/.test(path);
	return within && !/[\r\n\0]/.test(path) && path.split('/').indexOf('..') === -1;
}

/** The script behind linkPicturePlaces. */
export function linkPicturesScript(): string {
	const folder = quotePath(`/media/developer/apps/usr/palm/applications/${APP_ID}/pictures`);
	return (
		`mkdir -p ${quotePath(INTERNAL_PICTURES)} ${folder} && ` +
		`ln -sfn ${quotePath(USB_PICTURES)} ${folder}/usb && ` +
		`ln -sfn ${quotePath(INTERNAL_PICTURES)} ${folder}/internal && ` +
		`{ ls -d ${USB_PICTURES}/*/* 2>/dev/null || true; }`
	);
}

/** Command 7: makes the links in fluid's own folder that lead to the places with pictures (see
 *  pictures.ts), and lists the USB drives, one per line. */
export function linkPicturePlaces(): Promise<string> {
	return exec(linkPicturesScript(), 8000);
}

/** The script behind readPictureFolder: what is in a folder, then those of its files too large to
 *  offer. Throws on a path outside the places with pictures. */
export function pictureFolderScript(path: string): string {
	if (!isPicturePath(path)) throw new Error(`Refusing path outside the pictures: ${path}`);
	return `cd ${shellQuote(path)} && ls -1p && echo ${LISTING_DIVIDER} && find . -maxdepth 1 -type f -size +${PICTURE_MAX_MB * 1024}k`;
}

/** Command 8: reads a folder of pictures. */
export function readPictureFolder(path: string): Promise<string> {
	return exec(pictureFolderScript(path), 10000);
}

/** What fluid may ask of its script for the Home key (public/home-hook.sh, shipped next to
 *  index.html). */
export type HomeHookCommand = 'status' | 'enable' | 'disable' | 'start yes' | 'start no' | 'open-lg' | 'ack';

/** The script behind homeHook. */
export function homeHookScript(command: HomeHookCommand): string {
	return `sh ${quotePath(`/media/developer/apps/usr/palm/applications/${APP_ID}/home-hook.sh`)} ${command}`;
}

/** Command 5: fluid's script for the Home key. Turning it on waits to see that it works. */
export function homeHook(command: HomeHookCommand): Promise<string> {
	return exec(homeHookScript(command), command === 'enable' || command === 'disable' ? 25000 : 8000);
}

/** Command 6: tells the script for the Home key that fluid is up. Exits with 0 also while
 *  that script is not in use, as the Homebrew Channel fails any command that does not. */
export function markFluidAlive(): Promise<string> {
	return exec('[ ! -d /run/fluid-home ] || touch /run/fluid-home/alive', 5000);
}
