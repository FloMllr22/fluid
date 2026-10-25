// Installed apps, read through the Homebrew Channel. A sideloaded web app may not list
// the installed apps or read their icon files, so fluid asks the Homebrew Channel's root
// shell for the launch points (the live list with LG's own titles), the sizes of the icon
// files and each icon as base64 (the commands are in shell.ts). This is why fluid
// requires root.

import {APP_ID} from '../../config/constants';
import {PlatformError} from '../errors';
import type {AppList} from '../types';
import {HOMEBREW_APP, LUNA} from './constants';
import {type LunaResponse, lunaCall} from './luna';
import {isSafePath, readFileSizes, readIcons, readLaunchPoints} from './shell';

interface LaunchPoint {
	id: string;
	title: string;
	largeIcon?: string;
	icon?: string;
}

/** Apps LG lists but that make no sense on a launcher (ourselves, promos). */
const HIDDEN_IDS = [APP_ID, 'google.assistant.promo', 'com.webos.app.discovery'];

/** Icons by file path: a data URI, or "" for a file that is missing, empty or too large,
 *  so it is not asked for again. */
const ICON_CACHE_KEY = 'fluid-icon-cache-v1';

/** The Homebrew Channel runs `exec` with Node's default output limit, which on Node 8.12
 *  (webOS 6.5) is 200 KB; past it the whole call fails with "stdout maxBuffer exceeded".
 *  The 27 icons of the development TV come to 181 KB of base64, so icons are read in
 *  batches that each stay well below the limit. */
export const ICON_BATCH_BYTES = 150 * 1024;

/** Room for "<index> " and the newline around each icon's base64. */
const ICON_LINE_BYTES = 8;

export function listApps(): Promise<AppList> {
	return readLaunchPoints()
		.catch(explainFailure)
		.then(parseLaunchPoints)
		.then((points) =>
			loadIcons(points).then(
				({icons, failed}): AppList => ({
					apps: points.map((p) => ({id: p.id, title: p.title, iconUrl: icons[p.id]})),
					failedIcons: failed
				})
			)
		);
}

function parseLaunchPoints(out: string): LaunchPoint[] {
	let parsed: {launchPoints?: LaunchPoint[]};
	try {
		parsed = JSON.parse(out);
	} catch {
		throw new PlatformError('invalid-reply', 'Unreadable list of launch points');
	}
	const points = (parsed.launchPoints || []).filter((p) => p.id && p.title && HIDDEN_IDS.indexOf(p.id) === -1);
	if (!points.length) throw new PlatformError('invalid-reply', 'No launch points');
	return points;
}

interface AppLoadStatus extends LunaResponse {
	exist?: boolean;
}

interface HomebrewConfig extends LunaResponse {
	root?: boolean;
}

/** The Homebrew Channel's shell failed. Find out whether the Homebrew Channel is missing
 *  or has lost root (e.g. through a firmware update), so the user can be told what to do.
 *  If neither is the case, or it can't be told, the original error stands. */
function explainFailure(error: unknown): Promise<never> {
	const original = (): never => {
		throw error;
	};
	return lunaCall<AppLoadStatus>(LUNA.appLoadStatus, {appId: HOMEBREW_APP}).then((status) => {
		if (status.exist === false) throw new PlatformError('no-homebrew', 'The Homebrew Channel is not installed');
		return lunaCall<HomebrewConfig>(LUNA.homebrewConfig).then((config) => {
			if (config.root === false) throw new PlatformError('no-root', 'The Homebrew Channel runs without root');
			return original();
		}, original);
	}, original);
}

/** The icons by app ID, as data URIs, and how many could not be read. Icons come from the
 *  cache where possible; the cache keeps only the icons of the current apps. */
function loadIcons(points: LaunchPoint[]): Promise<{icons: Record<string, string>; failed: number}> {
	const cache = readIconCache();
	const kept: Record<string, string> = {};
	const pathOf: Record<string, string> = {};
	const missing: string[] = [];
	for (const p of points) {
		const path = p.largeIcon || p.icon;
		if (!path || !isSafePath(path)) continue;
		pathOf[p.id] = path;
		if (Object.prototype.hasOwnProperty.call(cache, path)) kept[path] = cache[path];
		else if (missing.indexOf(path) === -1) missing.push(path);
	}
	const pruned = Object.keys(kept).length < Object.keys(cache).length;
	const files: Promise<IconFiles> = missing.length
		? readIconFiles(missing)
		: Promise.resolve({urls: {}, absent: [], failed: 0});

	return files.then(({urls, absent, failed}) => {
		for (const path of Object.keys(urls)) kept[path] = urls[path];
		for (const path of absent) kept[path] = '';
		if (pruned || missing.length) writeIconCache(kept);
		const icons: Record<string, string> = {};
		for (const id of Object.keys(pathOf)) if (kept[pathOf[id]]) icons[id] = kept[pathOf[id]];
		return {icons, failed};
	});
}

/** What reading icon files gave: data URIs by path; paths without a usable file
 *  (missing, empty, or too large even for a batch of its own); and how many files could
 *  not be read, which are tried again next time. */
interface IconFiles {
	urls: Record<string, string>;
	absent: string[];
	failed: number;
}

/** Reads the icon files in batches below the Homebrew Channel's output limit: first
 *  their sizes, then the batches side by side. */
function readIconFiles(paths: string[]): Promise<IconFiles> {
	return readFileSizes(paths).then(
		(out) => {
			const sizes = parseSizes(out);
			const present = paths.filter((path) => sizes[path] > 0);
			const {batches, tooLarge} = batchIcons(
				present.map((path) => ({path, size: sizes[path]})),
				ICON_BATCH_BYTES
			);
			const result: IconFiles = {
				urls: {},
				absent: paths.filter((path) => !(sizes[path] > 0)).concat(tooLarge.map((icon) => icon.path)),
				failed: 0
			};
			return Promise.all(
				batches.map((batch) => {
					const batchPaths = batch.map((icon) => icon.path);
					return readIconBatch(batchPaths).then(
						(urls) => {
							for (const path of batchPaths) {
								if (urls[path]) result.urls[path] = urls[path];
								else result.failed++;
							}
						},
						() => {
							result.failed += batch.length;
						}
					);
				})
			).then(() => result);
		},
		(): IconFiles => ({urls: {}, absent: [], failed: paths.length})
	);
}

/** Reads `wc -c` output, "<size> <path>" per line, into sizes by path. */
function parseSizes(out: string): Record<string, number> {
	const sizes: Record<string, number> = {};
	for (const line of out.split('\n')) {
		const match = /^\s*(\d+) (\/\S+)$/.exec(line);
		if (match) sizes[match[2]] = Number(match[1]);
	}
	return sizes;
}

/** One batch of icons as data URIs by path. The files are asked for by *index*, so
 *  nothing but the validated paths reaches the shell. */
function readIconBatch(paths: string[]): Promise<Record<string, string>> {
	return readIcons(paths).then((out) => {
		const urls: Record<string, string> = {};
		for (const line of out.split('\n')) {
			const match = /^(\d+) ([A-Za-z0-9+/=]+)$/.exec(line);
			const path = match && paths[Number(match[1])];
			if (match && path) urls[path] = `data:image/png;base64,${match[2]}`;
		}
		return urls;
	});
}

/** Splits icons, in order, into batches whose base64 output stays within `budget` bytes.
 *  An icon too large even for a batch of its own is left out: its app keeps a letter tile. */
export function batchIcons<T extends {size: number}>(icons: T[], budget: number): {batches: T[][]; tooLarge: T[]} {
	const batches: T[][] = [];
	const tooLarge: T[] = [];
	let batch: T[] = [];
	let used = 0;
	for (const icon of icons) {
		const bytes = 4 * Math.ceil(icon.size / 3) + ICON_LINE_BYTES;
		if (bytes > budget) {
			tooLarge.push(icon);
			continue;
		}
		if (used + bytes > budget) {
			batches.push(batch);
			batch = [];
			used = 0;
		}
		batch.push(icon);
		used += bytes;
	}
	if (batch.length) batches.push(batch);
	return {batches, tooLarge};
}

function readIconCache(): Record<string, string> {
	try {
		return JSON.parse(localStorage.getItem(ICON_CACHE_KEY) || '{}');
	} catch {
		return {};
	}
}

function writeIconCache(cache: Record<string, string>): void {
	try {
		localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(cache));
	} catch {
		/* quota exceeded: icons will simply be re-fetched next time */
	}
}
