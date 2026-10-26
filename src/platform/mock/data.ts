// Neutral sample data for developing in a desktop browser, where there is no TV to ask.
// No real apps, brands or logos: the apps are letter tiles with IDs under the reserved
// example.com domain. Places and weather are fixed, so the browser never goes online.

import {type AppEntry, type InputSource, LIVE_TV_ID, type Place, type Weather} from '../types';

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

/** Inputs as the TV reports them; the icon names pick fluid's own glyphs. */
export const MOCK_INPUTS: InputSource[] = [
	{id: LIVE_TV_ID, appId: 'com.webos.app.livetv', label: 'Live TV', port: 0, connected: true, icon: 'tv.png'},
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

/** Places the browser's place search knows, matched from the start of their name. Three
 *  Springfields show how fluid tells places of the same name apart. */
export const MOCK_PLACES: Place[] = [
	{name: 'Berlin', region: 'Land Berlin', country: 'Germany', latitude: 52.52437, longitude: 13.41053},
	{name: 'Bern', region: '', country: 'Switzerland', latitude: 46.94809, longitude: 7.44744},
	{name: 'Bergen', region: 'Vestland', country: 'Norway', latitude: 60.39299, longitude: 5.32415},
	{name: 'Hamburg', region: '', country: 'Germany', latitude: 53.55073, longitude: 9.99302},
	{name: 'Springfield', region: 'Illinois', country: 'United States', latitude: 39.80172, longitude: -89.64371},
	{name: 'Springfield', region: 'Missouri', country: 'United States', latitude: 37.21533, longitude: -93.29824},
	{name: 'Springfield', region: 'Massachusetts', country: 'United States', latitude: 42.10148, longitude: -72.58981},
	{name: 'Vienna', region: '', country: 'Austria', latitude: 48.20849, longitude: 16.37208}
];

/** The weather anywhere, in the browser. */
export const MOCK_WEATHER: Weather = {temperature: 12.4, code: 2, isDay: true};
