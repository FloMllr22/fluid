// Installed apps, read through the Homebrew Channel. A sideloaded web app may not list
// the installed apps or read their icon files, so fluid asks the Homebrew Channel's root
// shell for the launch points (the live list with LG's own titles) and for each icon as
// base64 (both commands are in shell.ts). This is why fluid requires root.

import {APP_ID} from '../../config/constants';
import {PlatformError} from '../errors';
import type {AppList} from '../types';
import {HOMEBREW_APP, LUNA} from './constants';
import {type LunaResponse, lunaCall} from './luna';
import {isSafePath, readIcons, readLaunchPoints} from './shell';

interface LaunchPoint {
	id: string;
	title: string;
	largeIcon?: string;
	icon?: string;
}

/** Apps LG lists but that make no sense on a launcher (ourselves, promos). */
const HIDDEN_IDS = [APP_ID, 'google.assistant.promo', 'com.webos.app.discovery'];

const ICON_CACHE_KEY = 'fluid-icon-cache-v1';

export function listApps(): Promise<AppList> {
	return readLaunchPoints()
		.catch(explainFailure)
		.then(parseLaunchPoints)
		.then((points) =>
			loadIcons(points).then(
				(icons): AppList => ({
					apps: points.map((p) => ({id: p.id, title: p.title, iconUrl: icons[p.id]})),
					failedIcons: 0
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

/** Read the icons as data URIs in one shell round-trip, cached in localStorage by path.
 *  Icons are requested by *index*, so app IDs never reach the shell.
 *
 *  Known limit, still to fix: the Homebrew Channel runs `exec` with Node's default output
 *  limit, and webOS 6.5 ships Node 8.12, where that is 200 KB. On the development TV,
 *  26 icons already produce 180 KB of base64, so a few more apps make the whole call fail,
 *  and the catch below hides that (every app then shows a letter tile). Fetch in batches
 *  and report the failure. */
function loadIcons(points: LaunchPoint[]): Promise<Record<string, string>> {
	const cache = readIconCache();
	const result: Record<string, string> = {};
	const missing: {id: string; path: string}[] = [];
	for (const p of points) {
		const path = p.largeIcon || p.icon;
		if (!path || !isSafePath(path)) continue;
		if (cache[path]) result[p.id] = cache[path];
		else missing.push({id: p.id, path});
	}
	if (!missing.length) return Promise.resolve(result);

	return readIcons(missing.map((m) => m.path))
		.then((out) => {
			for (const line of out.split('\n')) {
				const match = /^(\d+) ([A-Za-z0-9+/=]+)$/.exec(line);
				const entry = match && missing[Number(match[1])];
				if (!match || !entry) continue;
				const url = `data:image/png;base64,${match[2]}`;
				result[entry.id] = url;
				cache[entry.path] = url;
			}
			writeIconCache(cache);
			return result;
		})
		.catch(() => result);
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
