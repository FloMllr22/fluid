// Design tokens: the single source of truth for colour, spacing, type and motion.
// `applyTokens()` exposes them as CSS custom properties so the stylesheet and the
// components read the same values.

export const COLOR = {
	bg: '#000000', // also the "OLED black" background
	bgGradientInner: '#1e1e1e', // the "dark" background
	bgGradientMid: '#0c0c0c',
	bgGradientOuter: '#000000',
	bgBlueInner: '#24324a', // the "calm blue" background
	bgBlueMid: '#18202c',
	bgBlueOuter: '#0a0e15',
	// Over a photo: darker only behind the greeting and clock (top) and the last row and
	// the hint (bottom), light in between so the photo shows. Text keeps WCAG AA through
	// a dark halo right behind its letters (photoTextHalo), measured behind the letters on
	// every bundled photo; not the dimmed rows without focus, as on the colours.
	photoScrimTop: 'rgba(0, 0, 0, 0.55)',
	photoScrimMiddle: 'rgba(0, 0, 0, 0.15)',
	photoScrimBottom: 'rgba(0, 0, 0, 0.45)',
	photoTextHalo: 'rgba(0, 0, 0, 0.95)',
	textPrimary: '#EEEEEE',
	textSecondary: '#AAAAAA',
	// labels that are not active: WCAG AA (4.5:1) behind the letters on every background
	// and photo, measured; the brightest spot is the middle of calm blue (#999999 needed)
	textMuted: '#9C9C9C',
	tileBg: '#161616',
	tileBgFocus: '#202020',
	tileBorder: '#2a2a2a',
	tileBorderFocus: '#EEEEEE',
	badge: '#EEEEEE',
	badgeText: '#000000',
	liftShadow: 'rgba(0, 0, 0, 0.7)',
	buttonBorder: '#3a3a3a',
	buttonActiveBg: '#EEEEEE',
	buttonActiveText: '#000000',
	switchTrack: '#333333',
	switchTrackOn: '#EEEEEE',
	switchKnob: '#AAAAAA',
	switchKnobOn: '#000000',
	fieldBg: '#0a0a0a', // a text field, inside its row
	pillBg: 'rgba(255, 255, 255, 0.08)', // a language choice without focus
	dot: 'rgba(255, 255, 255, 0.25)', // an onboarding step still to come
	dotDone: 'rgba(255, 255, 255, 0.5)', // an onboarding step done
	danger: '#e0564f',
	overlay: 'rgba(0, 0, 0, 0.9)' // behind the app menu
} as const;

export const FONT = {
	family: '"Inter Variable", "LG Smart UI", "Helvetica Neue", Arial, sans-serif',
	greeting: 72,
	clock: 32,
	clockTime: 44,
	weather: 32, // temperature and sky, top right
	weatherNote: 24, // why there is no weather (loading, no place, failed)
	rowLabel: 20,
	tileLabel: 19,
	settingsTitle: 40,
	settingsTab: 26,
	settingsButton: 22,
	optionLabel: 26,
	optionDescription: 20,
	clockPeriod: 22,
	toast: 24,
	menuAction: 26,
	moveName: 44, // the app being moved, above its row
	pill: 28, // a language choice in Settings
	pillLarge: 34, // a language choice in the onboarding
	onboardingBrand: 36,
	onboardingStep: 26, // "Step 1 of 3"
	onboardingWelcome: 96, // the first step's title
	onboardingTitle: 80,
	onboardingLead: 32,
	onboardingHint: 24
} as const;

export const LAYOUT = {
	screenWidth: 1920,
	screenHeight: 1080,
	edgePadding: 140, // heavy padding around the screen edges
	headerTop: 84,
	weatherGlyph: 44, // the sky, left of the temperature
	weatherGap: 16, // between the glyph, the temperature and the sky
	weatherNoteWidth: 460, // a longer note wraps, clear of the longest greeting
	fieldHeight: 56, // the place search field
	placeHeight: 64, // a place found by the search
	pillHeight: 80, // a language choice in Settings
	pillHeightLarge: 104, // a language choice in the onboarding
	onboardingTop: 180, // the title of the Apps and Background steps
	onboardingWelcomeTop: 300, // the title of the first step
	onboardingGridHeight: 480, // two rows of tiles
	onboardingFooterBottom: 64, // the step dots and the key hint
	rowsTop: 236, // rows start here, below the greeting and clock
	tileSize: 144, // app / source tiles are square
	tileGap: 28,
	tileRadius: 24,
	rowLabelGap: 14, // gap between a row's subheader and its tiles
	rowGap: 28, // vertical space between rows
	rowBleed: 32, // room above and below a row's tiles for a focused or lifted tile
	gridColumns: 9, // settings picker grid
	gridHeight: 720, // the visible part of the settings picker grid, which scrolls
	gridRowGap: 40, // vertical space between rows of the settings picker grid
	liftOffset: -6, // a tile picked up in re-order or move mode rises by this much
	moveRoom: 28, // extra space either side of the tile being moved on Home, for its arrows
	moveArrowSize: 40, // the arrows either side of it (and what the pointer can click)
	moveArrowGap: 16 // between the tile and an arrow
} as const;

export const MOTION = {
	focusMs: 160,
	scrollMs: 260,
	focusScale: 1.12,
	liftScale: 1.2, // a tile picked up in re-order or move mode
	unfocusedRowOpacity: 0.55,
	moveBackdropOpacity: 0.25, // the clock while an app is being moved
	photoFadeMs: 1500 // a new background photo fading in over the last one
} as const;

/** Writes every token onto :root as --color-*, --font-*, --layout-*, --motion-*. */
export function applyTokens(root: HTMLElement = document.documentElement): void {
	const groups: Record<string, Record<string, string | number>> = {
		color: COLOR,
		font: FONT,
		layout: LAYOUT,
		motion: MOTION
	};
	for (const group in groups) {
		const values = groups[group];
		for (const key in values) {
			const value = values[key];
			const unit =
				typeof value === 'number' && !/scale|opacity|columns/i.test(key) ? (key.endsWith('Ms') ? 'ms' : 'px') : '';
			root.style.setProperty(`--${group}-${kebab(key)}`, `${value}${unit}`);
		}
	}
}

function kebab(s: string): string {
	return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}
