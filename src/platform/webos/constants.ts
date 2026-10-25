// webOS app IDs and Luna service URIs fluid uses.

/** webOS apps fluid opens itself. */
export const SYSTEM_APP = {
	lgHome: 'com.webos.app.home',
	liveTv: 'com.webos.app.livetv'
} as const;

/** Luna service URIs. A sideloaded web app on webOS 6 may only call methods in the
 *  TV's "public" LS2 group; everything here except homebrewExec is in that group. */
export const LUNA = {
	launch: 'luna://com.webos.applicationManager/launch',
	appLoadStatus: 'luna://com.webos.applicationManager/getAppLoadStatus',
	inputStatus: 'luna://com.webos.service.eim/getAllInputStatus',
	preferences: 'luna://com.webos.service.systemservice/getPreferences',
	/** Homebrew Channel's root shell; only reachable through the whitelist in shell.ts */
	homebrewExec: 'luna://org.webosbrew.hbchannel.service/exec'
} as const;

/** How long a Luna call may take before it counts as failed. */
export const LUNA_TIMEOUT_MS = 4000;
