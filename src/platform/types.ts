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

/** Where an app list came from (the Homebrew Channel falls back to the catalogue). */
export type AppSource = 'catalog' | 'homebrew' | 'mock';

export interface AppList {
	apps: AppEntry[];
	source: AppSource;
}

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

export interface Platform {
	/** 'webos' on the TV; 'mock' in a desktop browser and in unit tests */
	readonly kind: 'webos' | 'mock';
	/** The Apps row of a fresh install */
	readonly defaultAppIds: readonly string[];
	/** Apps that can be shown. With `useHomebrew`, the live list read through the Homebrew Channel. */
	listApps(options: {useHomebrew: boolean}): Promise<AppList>;
	/** Live TV (when the TV has a tuner) and the external inputs, in port order */
	listInputs(): Promise<InputSource[]>;
	/** Opens an app, or switches to an input */
	launch(appId: string): Promise<void>;
	/** Opens LG's own home screen */
	launchLgHome(): Promise<void>;
	/** The TV's 12/24-hour setting. Never rejects: falls back to DEFAULT_TIME_FORMAT. */
	getTimeFormat(): Promise<TimeFormat>;
	/** Hides the Magic Remote pointer; the user brings it back by moving the remote. */
	hidePointer(): void;
	/** Calls back whenever fluid comes to the foreground, including a relaunch while it
	 *  is running. Returns a function that stops it. */
	onForeground(callback: () => void): () => void;
}
