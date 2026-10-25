// Sources: Live TV (the tuner, if the TV has one) followed by the external inputs
// (HDMI etc.) from the External Input Manager, which is callable from a web app. EIM
// returns the labels set in the TV's input settings and the name of the icon LG's UI
// uses for each port. fluid draws its own glyph for that name (see inputGlyph in
// lib/tiles.ts); LG's images are not shipped.

import type {InputSource} from '../types';
import {LUNA, SYSTEM_APP} from './constants';
import {type LunaResponse, lunaCall} from './luna';
import {appExists} from './system';

interface EimDevice {
	id: string;
	appId: string;
	label: string;
	port: number;
	connected?: boolean;
	icon?: string;
}

interface EimResponse extends LunaResponse {
	devices?: EimDevice[];
}

/** Live TV isn't an EIM device, but launching its app switches to the tuner, so it
 *  behaves like any other source. Port 0 sorts it ahead of HDMI 1. */
const LIVE_TV: InputSource = {
	id: 'LIVE_TV',
	appId: SYSTEM_APP.liveTv,
	label: 'Live TV',
	port: 0,
	connected: true,
	icon: 'tv.png'
};

export function listInputs(): Promise<InputSource[]> {
	return Promise.all([listExternalInputs(), appExists(LIVE_TV.appId)]).then(([external, hasTuner]) =>
		(hasTuner ? [LIVE_TV] : []).concat(external)
	);
}

function listExternalInputs(): Promise<InputSource[]> {
	return lunaCall<EimResponse>(LUNA.inputStatus, {}).then((r) =>
		(r.devices || [])
			.filter((d) => d.appId && d.label)
			.sort((a, b) => a.port - b.port)
			.map((d) => ({
				id: d.id,
				appId: d.appId,
				label: d.label,
				port: d.port,
				connected: d.connected !== false,
				icon: d.icon || ''
			}))
	);
}
