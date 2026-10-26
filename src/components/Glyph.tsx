// Inline SVG line icons (24×24, drawn as strokes): the More row, the input sources, the
// slideshow tile, the weather, the tile badges and the arrows of move mode. All drawn for
// fluid; no third-party artwork.

import type {ComponentChildren} from 'preact';

export type GlyphName =
	| 'house'
	| 'gear'
	| 'tv'
	| 'input'
	| 'console'
	| 'player'
	| 'speaker'
	| 'monitor'
	| 'phone'
	| 'camera'
	| 'slideshow'
	| 'sun'
	| 'moon'
	| 'cloud-sun'
	| 'cloud-moon'
	| 'cloud'
	| 'fog'
	| 'drizzle'
	| 'rain'
	| 'snow'
	| 'thunder';

/** A cloud in the upper part of the square, with room below for what falls from it. */
const HIGH_CLOUD = 'M7 15h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 6.1 4.5 4.5 0 0 0 7 15z';

/** A smaller cloud at the lower right, with room above for the sun or the moon. */
const LOW_CLOUD = 'M11.4 21.6h8a3.2 3.2 0 0 0 .5-6.35A4.8 4.8 0 0 0 10.8 14.5a3.6 3.6 0 0 0 .6 7.1z';

const SHAPES: Record<GlyphName, () => ComponentChildren> = {
	house: () => <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8M10 20v-6h4v6" />,
	gear: () => (
		<>
			<circle cx="12" cy="12" r="3.2" />
			<path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
		</>
	),
	// a screen with an antenna: Live TV, aerial, satellite
	tv: () => (
		<>
			<rect x="3" y="7.5" width="18" height="12" rx="2" />
			<path d="M8.5 3.5 12 7l3.5-3.5" />
		</>
	),
	// an arrow into a frame: any port without a more specific device (HDMI, AV, USB …)
	input: () => <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M4 12h11M11 8l4 4-4 4" />,
	console: () => (
		<path d="M7.5 7.5h9a4.5 4.5 0 0 1 4.4 5.5l-.9 4a2.6 2.6 0 0 1-4.4 1.2L14 16.5h-4l-1.6 1.7A2.6 2.6 0 0 1 4 17l-.9-4a4.5 4.5 0 0 1 4.4-5.5zM8 10.5v3M6.5 12h3M15.5 11h.01M17.5 13h.01" />
	),
	// a flat box: set-top box, streaming box, disc player, media server
	player: () => (
		<>
			<rect x="3" y="8" width="18" height="8" rx="2" />
			<path d="M6.5 12h4M15.5 12h.01M18 12h.01M6 16v1.5M18 16v1.5" />
		</>
	),
	speaker: () => (
		<>
			<rect x="6" y="3" width="12" height="18" rx="2" />
			<circle cx="12" cy="14" r="3.2" />
			<path d="M12 7.5h.01" />
		</>
	),
	monitor: () => (
		<>
			<rect x="3" y="4" width="18" height="12.5" rx="1.5" />
			<path d="M9 20.5h6M12 16.5v4" />
		</>
	),
	phone: () => (
		<>
			<rect x="7" y="3" width="10" height="18" rx="2" />
			<path d="M11 17.5h2" />
		</>
	),
	camera: () => (
		<>
			<path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5l1.5-2h6l1.5 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
			<circle cx="12" cy="13" r="3.5" />
		</>
	),
	// a picture in front of another: the background slideshow
	slideshow: () => (
		<>
			<rect x="3" y="7" width="15" height="12" rx="1.5" />
			<path d="M7 4h12.5A1.5 1.5 0 0 1 21 5.5V15M5.5 16.5l3.5-4 3 3 2-2 3 3" />
		</>
	),
	sun: () => (
		<>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
		</>
	),
	// a crescent: the full disc, less a disc to its upper right
	moon: () => <path d="M11.5 4A8 8 0 1 0 20 12.5 6 6 0 0 1 11.5 4z" />,
	// a small sun at the upper left; no rays where the cloud is
	'cloud-sun': () => (
		<>
			<circle cx="8" cy="8" r="3" />
			<path d="M8 1.9v1.5M1.9 8h1.5M3.7 3.7l1 1M12.3 3.7l-1 1M12.6 8h1.5M3.7 12.3l1-1" />
			<path d={LOW_CLOUD} />
		</>
	),
	'cloud-moon': () => (
		<>
			<path d="M7.7 3.5A4.5 4.5 0 1 0 12.5 8.3 3.4 3.4 0 0 1 7.7 3.5z" />
			<path d={LOW_CLOUD} />
		</>
	),
	cloud: () => <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z" />,
	fog: () => <path d={`${HIGH_CLOUD}M5 18.5h14M7.5 21.5h9`} />,
	drizzle: () => <path d={`${HIGH_CLOUD}M8 18.5h.01M12 18.5h.01M16 18.5h.01M10 21.5h.01M14 21.5h.01`} />,
	rain: () => <path d={`${HIGH_CLOUD}M8.7 17.5l-1.2 4M12.7 17.5l-1.2 4M16.7 17.5l-1.2 4`} />,
	// three flakes, each three strokes crossing
	snow: () => (
		<path
			d={`${HIGH_CLOUD}M7.5 17.6l2 2M9.5 17.6l-2 2M8.5 17.2v2.8M14.5 17.6l2 2M16.5 17.6l-2 2M15.5 17.2v2.8M11 20.3l2 2M13 20.3l-2 2M12 19.9v2.8`}
		/>
	),
	thunder: () => <path d={`${HIGH_CLOUD}M13 16.5l-2 3h3l-2 3`} />
};

/** A line icon, drawn as a tile's glyph unless given another class. */
export function Glyph({name, className = 'tile__glyph'}: {name: GlyphName; className?: string}) {
	return (
		<svg class={className} viewBox="0 0 24 24" aria-hidden="true">
			{SHAPES[name]()}
		</svg>
	);
}

export function CheckMark() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M5 12.5l4.5 4.5L19 7.5" />
		</svg>
	);
}

/** The arrows either side of an app being moved. */
export function ChevronMark({side}: {side: 'left' | 'right'}) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
		</svg>
	);
}

/** Badge for a favourite app. */
export function StarMark() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
		</svg>
	);
}
