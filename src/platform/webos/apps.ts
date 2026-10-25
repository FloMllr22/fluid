// Available apps. Two providers:
//
//  1. Catalogue (default, no root): config/catalog.ts filtered by getAppLoadStatus.
//  2. Homebrew Channel (opt-in, rooted TVs only): with the user's consent (an option in
//     Settings, off by default) the launch points are read through the Homebrew Channel,
//     which gives the live list with LG's own titles, and each icon is read as base64
//     (both commands are in shell.ts). If the service isn't there, the catalogue is used.

import {APP_CATALOG, type CatalogApp} from '../../config/catalog';
import {APP_ID} from '../../config/constants';
import type {AppEntry, AppList} from '../types';
import {isSafePath, readIcons, readLaunchPoints} from './shell';
import {appExists} from './system';

export function listApps(useHomebrew: boolean): Promise<AppList> {
	const catalog = () => listViaCatalog().then((apps): AppList => ({apps, source: 'catalog'}));
	if (!useHomebrew) return catalog();
	return listViaHomebrew()
		.then((apps): AppList => ({apps, source: 'homebrew'}))
		.catch(catalog);
}

// ---------- provider 1: catalogue ----------

function catalogEntries(apps: CatalogApp[]): AppEntry[] {
	return apps.map((a) => ({id: a.id, title: a.title, color: a.color}));
}

function listViaCatalog(): Promise<AppEntry[]> {
	return Promise.all(APP_CATALOG.map((a) => appExists(a.id))).then((present) =>
		catalogEntries(APP_CATALOG.filter((_, i) => present[i]))
	);
}

// ---------- provider 2: Homebrew Channel (opt-in) ----------

interface LaunchPoint {
	id: string;
	title: string;
	largeIcon?: string;
	icon?: string;
}

/** Apps LG lists but that make no sense on a launcher (ourselves, promos). */
const HIDDEN_IDS = [APP_ID, 'google.assistant.promo', 'com.webos.app.discovery'];

const ICON_CACHE_KEY = 'fluid-icon-cache-v1';

function listViaHomebrew(): Promise<AppEntry[]> {
	return readLaunchPoints().then((out) => {
		const parsed = JSON.parse(out) as {launchPoints?: LaunchPoint[]};
		const points = (parsed.launchPoints || []).filter((p) => p.id && p.title && HIDDEN_IDS.indexOf(p.id) === -1);
		if (!points.length) throw new Error('no launch points');
		return loadIcons(points).then((icons) =>
			points.map((p) => {
				const known = APP_CATALOG.find((c) => c.id === p.id);
				return {
					id: p.id,
					// the catalogue's titles are shorter than LG's ("IPTV Player" vs "webOS IPTV Player")
					title: known ? known.title : p.title,
					iconUrl: icons[p.id],
					color: known?.color
				};
			})
		);
	});
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
