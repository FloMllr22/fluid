// What fluid needs from the device it runs on. The UI and state only ever use this
// interface, through `platform` from ./index: webos/ talks to the TV, mock/ stands in for
// it in a desktop browser and in unit tests.

import type {PictureFolder} from '../lib/pictures';

export type {PictureFolder};

/** An app that can be shown on the home screen. */
export interface AppEntry {
	id: string;
	title: string;
	/** image URL (a data: URI read from the TV); undefined → letter tile */
	iconUrl?: string;
	/** background of the letter tile */
	color?: string;
	/** the TV lets it be uninstalled */
	removable?: boolean;
}

export interface AppList {
	/** in the order of LG's own launcher */
	apps: AppEntry[];
	/** Icons that could not be read; those apps show a letter tile, and the next listing
	 *  tries again. */
	failedIcons: number;
}

/** ID of the Live TV entry. fluid adds it itself (it is not an external input), so the
 *  UI names it in the user's language; other inputs carry the names set on the TV. */
export const LIVE_TV_ID = 'LIVE_TV';

/** Live TV or an external input; switching to it means launching its app. */
export interface InputSource {
	id: string; // e.g. HDMI_1
	appId: string; // e.g. com.webos.app.hdmi1
	label: string; // user-visible name from the TV's input settings
	port: number;
	connected: boolean;
	icon: string; // icon name the TV reports, e.g. gameconsole.png; empty when there is none
}

export type TimeFormat = '12h' | '24h';

/** Used before the TV has answered, and when it cannot. */
export const DEFAULT_TIME_FORMAT: TimeFormat = '24h';

/** A place found by the place search; fluid keeps it for the weather. */
export interface Place {
	/** "Berlin" */
	name: string;
	/** state or region, e.g. "Land Berlin"; empty when there is none or it repeats the name */
	region: string;
	/** in the language of the search; empty when unknown */
	country: string;
	latitude: number;
	longitude: number;
}

/** The weather now at a place. */
export interface Weather {
	/** air temperature 2 m above the ground, in °C */
	temperature: number;
	/** WMO weather code: 0 clear sky … 99 thunderstorm with hail */
	code: number;
	/** daytime at the place (the sun rather than the moon) */
	isDay: boolean;
}

/** A place on the TV with pictures of the user's. */
export interface PicturePlace {
	kind: 'internal' | 'usb';
	path: string;
}

/** What the Home key opens. `on`: fluid. `off`: LG Home. `gave-up`: LG Home again, since fluid
 *  did not come up several times, which the user has not been told yet. `unsupported`: LG Home,
 *  and on this TV it cannot be otherwise. */
export const HOME_KEY_STATES = ['on', 'off', 'gave-up', 'unsupported'] as const;

export type HomeKeyState = (typeof HOME_KEY_STATES)[number];

/** Whether the TV starts with fluid when it is switched on, whatever was on last. `unsupported`:
 *  it cannot be told so. */
export const START_STATES = ['yes', 'no', 'unsupported'] as const;

export type StartState = (typeof START_STATES)[number];

export interface HomeKey {
	state: HomeKeyState;
	start: StartState;
}

/** Shorter queries find nothing, so they are not sent. */
export const PLACE_QUERY_MIN_LENGTH = 2;

/** How many places a search lists at most; Settings has room for that many. */
export const PLACE_SEARCH_LIMIT = 6;

export interface Platform {
	/** 'webos' on the TV; 'mock' in a desktop browser and in unit tests */
	readonly kind: 'webos' | 'mock';
	/** Every app on the TV's launcher, read through the Homebrew Channel (root). Rejects
	 *  with `no-homebrew` or `no-root` when that is why it failed. */
	listApps(): Promise<AppList>;
	/** Live TV (when the TV has a tuner) and the external inputs, in port order */
	listInputs(): Promise<InputSource[]>;
	/** Opens an app, or switches to an input */
	launch(appId: string): Promise<void>;
	/** Uninstalls an app, and resolves once it is gone from the TV. Rejects with `timeout` when
	 *  it is still there after a while, or `rejected`. */
	uninstallApp(appId: string): Promise<void>;
	/** Opens LG's own home screen */
	launchLgHome(): Promise<void>;
	/** What the Home key opens. Asking also tells the TV that fluid is up (see setHomeKey). Rejects
	 *  with `no-homebrew` or `no-root` when that is why it cannot be told. */
	getHomeKey(): Promise<HomeKey>;
	/** Makes the Home key open fluid, or LG Home again, also after the next start of the TV.
	 *  Resolves with how that turned out. Should fluid then not come up when the key is pressed,
	 *  LG Home opens instead, and after several times the key stays with LG Home. */
	setHomeKey(open: boolean): Promise<HomeKey>;
	/** Whether the TV starts with fluid, see HomeKey; from the next time it is switched on. */
	setStartsWithFluid(start: boolean): Promise<HomeKey>;
	/** The user has been told that the Home key went back to LG Home (`gave-up`). */
	acknowledgeHomeKey(): Promise<void>;
	/** Calls back when the Home key is pressed while it opens fluid, whichever app was in front.
	 *  Returns a function that stops it. */
	onHomeKey(callback: () => void): () => void;
	/** The TV's UI language as a locale such as "de-DE". Synchronous, so the first frame is
	 *  already in the right language. */
	getLocale(): string;
	/** The TV's 12/24-hour setting. Never rejects: falls back to DEFAULT_TIME_FORMAT. */
	getTimeFormat(): Promise<TimeFormat>;
	/** Hides the Magic Remote pointer; the user brings it back by moving the remote. */
	hidePointer(): void;
	/** Calls back whenever fluid comes to the foreground, including a relaunch while it
	 *  is running. Returns a function that stops it. */
	onForeground(callback: () => void): () => void;
	/** Calls back whenever fluid leaves the foreground (another app or input in front, or
	 *  the screen off), so timers can pause. Returns a function that stops it. */
	onBackground(callback: () => void): () => void;
	/** The TV's own folder for pictures, and each USB drive plugged in. */
	listPicturePlaces(): Promise<PicturePlace[]>;
	/** What is in a folder of one of those places, for showing pictures. */
	listPictures(path: string): Promise<PictureFolder>;
	/** Gets ready to draw pictures with pictureUrl, as an update of fluid may have undone that. */
	preparePictures(): Promise<void>;
	/** A URL an image can be drawn from, for a picture in one of those places; '' for any other. */
	pictureUrl(path: string): string;
	/** Places whose name matches `query`, best first, named in `language` ("de"). Asks
	 *  Open-Meteo's place search over the network, sending the query and the language.
	 *  Resolves with none for a query shorter than PLACE_QUERY_MIN_LENGTH, without asking.
	 *  Rejects with `offline` or `service`. */
	searchPlaces(query: string, language: string): Promise<Place[]>;
	/** The weather now at a place, from Open-Meteo over the network; only the coordinates
	 *  are sent. Rejects with `offline` or `service`. */
	getWeather(latitude: number, longitude: number): Promise<Weather>;
}
