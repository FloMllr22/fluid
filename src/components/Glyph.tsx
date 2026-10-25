// Inline SVG line icons (24×24, drawn as strokes): the More row, the input sources and
// the settings badge. All drawn for fluid; no third-party artwork.

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
	| 'camera';

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
	)
};

export function Glyph({name}: {name: GlyphName}) {
	return (
		<svg class="tile__glyph" viewBox="0 0 24 24" aria-hidden="true">
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

/** Badge for a favourite app. */
export function StarMark() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
		</svg>
	);
}
