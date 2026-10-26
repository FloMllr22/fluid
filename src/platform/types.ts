// What fluid needs from the device it runs on. The UI and state only ever use this
// interface, through `platform` from ./index: webos/ talks to the TV, mock/ stands in for
// it in a desktop browser and in unit tests.

/** An app that can be shown on the home screen. */
export interface AppEntry {
	id: string;
	title: string;
	/** image URL (a data: URI read from the TV); undefined → letter tile */
	iconUrl?: string;
	/** background of the letter tile */
	color?: string;
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
	/** Opens LG's own home screen */
	launchLgHome(): Promise<void>;
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
	/** Places whose name matches `query`, best first, named in `language` ("de"). Asks
	 *  Open-Meteo's place search over the network, sending the query and the language.
	 *  Resolves with none for a query shorter than PLACE_QUERY_MIN_LENGTH, without asking.
	 *  Rejects with `offline` or `service`. */
	searchPlaces(query: string, language: string): Promise<Place[]>;
	/** The weather now at a place, from Open-Meteo over the network; only the coordinates
	 *  are sent. Rejects with `offline` or `service`. */
	getWeather(latitude: number, longitude: number): Promise<Weather>;
}
