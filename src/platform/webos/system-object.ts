// The system object webOS injects into every web app: `webOSSystem`, or `PalmSystem` on
// older firmware.

export interface WebOSSystemObject {
	/** the TV's UI language, e.g. "de-DE" */
	locale?: string;
	setCursorHidden?(hidden: boolean): void;
}

declare global {
	interface Window {
		webOSSystem?: WebOSSystemObject;
		PalmSystem?: WebOSSystemObject;
	}
}

export function systemObject(): WebOSSystemObject | undefined {
	return typeof window === 'undefined' ? undefined : window.webOSSystem || window.PalmSystem;
}
