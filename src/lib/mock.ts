// Neutral sample data for developing in a desktop browser, where there is no TV to ask.
// No real apps, brands or logos: the apps are letter tiles with IDs under the reserved
// example.com domain.

import type {AppEntry} from './apps';
import {type InputSource, LIVE_TV} from './inputs';

export const MOCK_APPS: AppEntry[] = [
	{id: 'com.example.movies', title: 'Movies', color: '#C2410C'},
	{id: 'com.example.series', title: 'Series', color: '#3D6BE0'},
	{id: 'com.example.music', title: 'Music', color: '#1F8A52'},
	{id: 'com.example.videos', title: 'Videos', color: '#B7791F'},
	{id: 'com.example.sports', title: 'Sports', color: '#138A94'},
	{id: 'com.example.photos', title: 'Photos', color: '#C2417A'},
	{id: 'com.example.library', title: 'Library', color: '#7048E8'},
	{id: 'com.example.news', title: 'News', color: '#4B5563'}
];

/** The Apps row on a fresh start in the browser. */
export const MOCK_DEFAULT_APP_IDS: string[] = MOCK_APPS.slice(0, 6).map((app) => app.id);

/** Inputs as EIM reports them; the icon names pick fluid's own glyphs. */
export const MOCK_INPUTS: InputSource[] = [
	LIVE_TV,
	{
		id: 'HDMI_1',
		appId: 'com.webos.app.hdmi1',
		label: 'Streaming Box',
		port: 1,
		connected: true,
		icon: 'streamingbox.png'
	},
	{id: 'HDMI_2', appId: 'com.webos.app.hdmi2', label: 'Sound Bar', port: 2, connected: true, icon: 'hometheater.png'},
	{
		id: 'HDMI_3',
		appId: 'com.webos.app.hdmi3',
		label: 'Games Console',
		port: 3,
		connected: true,
		icon: 'gameconsole.png'
	},
	{id: 'HDMI_4', appId: 'com.webos.app.hdmi4', label: 'HDMI 4', port: 4, connected: false, icon: 'HDMI_4.png'}
];
