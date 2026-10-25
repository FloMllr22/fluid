// Catalogue of apps the launcher knows how to show without any privileged access.
//
// A sideloaded web app on webOS 6 is not allowed to list installed apps, and it
// cannot read other apps' icon files, so this is a list of known app IDs. At runtime it
// is filtered with applicationManager/getAppLoadStatus, which *is* permitted, so only
// apps that actually exist on the TV are offered. They are drawn as letter tiles: fluid
// ships no third-party logos. The real icons come from the TV itself through the
// Homebrew Channel option (see lib/apps.ts).
//
// The list is deliberately broad and international: an entry for an app a TV
// doesn't have costs nothing. To add apps, change the defaults, or both, without
// editing this file, create src/config/catalog.local.ts (git-ignored); see
// catalog.local.example.ts.

export interface CatalogApp {
	id: string;
	title: string;
	/** background of the letter tile */
	color?: string;
}

/** Shape of the optional src/config/catalog.local.ts. */
export interface LocalCatalog {
	/** extra apps, or replacements for entries with the same id */
	EXTRA_APPS?: CatalogApp[];
	/** replaces DEFAULT_APP_IDS */
	DEFAULT_APP_IDS?: string[];
}

// Deliberately incomplete: only some entries have a colour, the rest are grey letter
// tiles. Not worth finishing: root is required, so fluid will read the app list and the
// real icons from the TV, and this catalogue goes away.
const BASE_CATALOG: CatalogApp[] = [
	// Global streaming
	{id: 'youtube.leanback.v4', title: 'YouTube'},
	{id: 'netflix', title: 'Netflix', color: '#b1060f'},
	{id: 'amazon', title: 'Prime Video'},
	{id: 'com.disney.disneyplus-prod', title: 'Disney+', color: '#0f2b6b'},
	{id: 'com.apple.appletv', title: 'Apple TV'},
	{id: 'com.wbd.stream', title: 'Max', color: '#002be7'},
	{id: 'cdp-30', title: 'Plex'},
	{id: 'spotify-beehive', title: 'Spotify', color: '#1db954'},
	{id: 'tv.twitch.tv.starshot.lg', title: 'Twitch'},
	// North America
	{id: 'hulu', title: 'Hulu', color: '#1ce783'},
	{id: 'youtube.leanback.ytv.v1', title: 'YouTube TV', color: '#cc0000'},
	{id: 'com.plutotv.app', title: 'Pluto TV', color: '#2b2b2b'},
	{id: 'com.tubitv.ott.tubi', title: 'Tubi', color: '#7408ff'},
	{id: 'com.espn.espnplus-prod', title: 'ESPN', color: '#c8102e'},
	{id: 'vudu', title: 'Fandango at Home', color: '#3399ff'},
	// UK
	{id: 'bbc.iplayer.3.0', title: 'BBC iPlayer'},
	{id: 'bbc.sounds.1.0', title: 'BBC Sounds'},
	{id: 'com.fvp.itv', title: 'ITVX'},
	{id: 'com.fvp.ch4', title: 'Channel 4'},
	{id: 'demand5', title: 'Channel 5'},
	{id: 'com.fvp.uktv', title: 'UKTV Play'},
	{id: 'now.tv', title: 'NOW'},
	// LG built-ins
	{id: 'com.webos.app.browser', title: 'Browser'},
	{id: 'com.webos.app.mediadiscovery', title: 'Media Player'},
	{id: 'com.webos.app.igallery', title: 'Art Gallery'},
	{id: 'com.webos.app.homeconnect', title: 'Home Dashboard'},
	{id: 'amazon.alexa.view', title: 'Alexa'},
	{id: 'com.palm.app.settings', title: 'LG Settings', color: '#2f3339'},
	// webOS Homebrew
	{id: 'org.webosbrew.hbchannel', title: 'Homebrew'},
	{id: 'org.webosbrew.inputhook', title: 'Input Hook'},
	{id: 'org.webosbrew.safeupdate', title: 'HB Updater'},
	{id: 'com.lennylxx.iptv', title: 'IPTV Player'},
	{id: 'org.jellyfin.webos', title: 'Jellyfin', color: '#00a4dc'}
];

/** Apps shown on a fresh install, in row order. Anything not installed is skipped. */
const BASE_DEFAULT_APP_IDS: string[] = [
	'youtube.leanback.v4',
	'netflix',
	'amazon',
	'com.disney.disneyplus-prod',
	'com.apple.appletv',
	'com.wbd.stream',
	'cdp-30',
	'spotify-beehive'
];

// Vite resolves this at build time; it's an empty object when the file doesn't exist.
const localModules = import.meta.glob<LocalCatalog>('./catalog.local.ts', {eager: true});
const local: LocalCatalog = localModules['./catalog.local.ts'] || {};

function mergeCatalog(base: CatalogApp[], extra: CatalogApp[]): CatalogApp[] {
	const extraIds = extra.map((a) => a.id);
	return base.filter((a) => extraIds.indexOf(a.id) === -1).concat(extra);
}

export const APP_CATALOG: CatalogApp[] = mergeCatalog(BASE_CATALOG, local.EXTRA_APPS || []);
export const DEFAULT_APP_IDS: string[] = local.DEFAULT_APP_IDS || BASE_DEFAULT_APP_IDS;
