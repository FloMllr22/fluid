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
	// "dusk": an evening sky over the sea, from the design mockup. Sky from the top down to
	// the bright horizon, the sea below it; a warm glow and a pink bloom on the horizon.
	duskSkyTop: '#091735',
	duskSkyHigh: '#14346a',
	duskSkyMid: '#36508f',
	duskSkyLow: '#86589f',
	duskHorizon: '#df8b6c',
	duskSeaTop: '#3b3a72',
	duskSeaMid: '#1c2352',
	duskSeaBottom: '#0b1030',
	duskGlow: 'rgba(255, 160, 96, 0.55)',
	duskGlowEdge: 'rgba(255, 160, 96, 0)',
	duskBloom: 'rgba(206, 86, 170, 0.5)',
	duskBloomEdge: 'rgba(206, 86, 170, 0)',
	// shade over its left part, where the app list crosses the horizon: the names of the
	// apps without focus keep WCAG AA there (5.3:1 on the brightest line; 3.7:1, enough
	// for their large text, where a long name reaches the end of the list)
	duskShade: 'rgba(6, 10, 28, 0.5)',
	duskShadeEdge: 'rgba(6, 10, 28, 0)',
	// Over a photo: darker behind the app list (left) and the greeting (foot), light
	// elsewhere so the photo shows. Text keeps WCAG AA through a dark halo right behind its
	// letters (photoTextHalo), measured behind the letters on every bundled photo.
	photoScrimSide: 'rgba(0, 0, 0, 0.5)',
	photoScrimFoot: 'rgba(0, 0, 0, 0.5)',
	photoScrimClear: 'rgba(0, 0, 0, 0.1)',
	photoTextHalo: 'rgba(0, 0, 0, 0.95)',
	textPrimary: '#FFFFFF',
	textSoft: 'rgba(255, 255, 255, 0.88)', // the date line under the greeting
	textSecondary: '#C9CDD3',
	// labels that are not active: WCAG AA (4.5:1) behind the letters on every background
	// and photo, measured; the brightest spot is the middle of calm blue (#999999 needed)
	textMuted: '#9AA0AA',
	textShadow: 'rgba(0, 0, 0, 0.45)', // soft shade under the text on Home
	accent: '#8FD0FF', // the ring around the focused app's icon
	// the buttons at the top right of Home, and the menus: dark glass (without blur, which
	// Chromium 53 lacks and older TVs cannot afford, so a little darker than the mockup)
	glass: 'rgba(10, 14, 32, 0.6)',
	glassMenu: 'rgba(10, 14, 32, 0.92)',
	glassBorder: 'rgba(255, 255, 255, 0.16)',
	highlight: 'rgba(255, 255, 255, 0.16)', // behind the focused app in the list
	highlightLifted: 'rgba(255, 255, 255, 0.24)', // behind the app being moved
	glyphWell: 'rgba(255, 255, 255, 0.12)', // behind a glyph in a menu
	glyphWellFocus: 'rgba(7, 8, 11, 0.1)',
	// what has focus, where it is not an app in the list: a light pill with dark text
	focusFill: '#F4F5F7',
	focusText: '#07080B',
	iconShadow: 'rgba(0, 0, 0, 0.3)',
	liftedShadow: 'rgba(0, 0, 0, 0.4)',
	menuShadow: 'rgba(0, 0, 0, 0.45)',
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
	danger: '#e0564f'
} as const;

export const FONT = {
	family: 'Manrope, "LG Smart UI", "Helvetica Neue", Arial, sans-serif',
	greeting: 96,
	dateLine: 30, // weekday, date and time under the greeting
	moveMode: 22, // "MOVING" above the app's name, in place of the greeting
	appName: 42, // an app in the list, laid out at its focused size (see appNameRestScale)
	appMonogram: 26, // the first letter of an app without artwork
	listEmpty: 28, // why the list has no apps (loading, failed, none chosen)
	barLabel: 20, // "Sources"
	barMonogram: 23, // "LG"
	menuItem: 21,
	weather: 26, // the temperature, bottom right
	weatherNote: 24, // why there is no weather (loading, no place, failed)
	tileLabel: 19,
	settingsTitle: 40,
	settingsTab: 26,
	settingsButton: 22,
	optionLabel: 26,
	optionDescription: 20,
	toast: 24,
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
	// the safe area: 5 % of the screen at either side, a little more at top and foot
	safeX: 96,
	safeY: 64,
	edgePadding: 140, // heavy padding around the screen edges
	headerTop: 84,
	// the app list on the left: rows of icon and name, the focused one on a light pill
	listWidth: 520,
	listRowHeight: 76,
	listRowGap: 10,
	listRowRadius: 24,
	listRowPadding: 8, // left of the icon; the icon itself sits on the safe area
	listIconGap: 24, // between icon and name
	listArrowSize: 44, // the arrows of the app being moved, at the right of its row
	appIcon: 64,
	appIconRadius: 18,
	mainLeft: 700, // the greeting, right of the list
	// the bar at the top right: Sources, LG Home, Settings
	barHeight: 60,
	barGap: 14,
	barGlyph: 26,
	// the menus: Sources, below its button, and an app's menu, beside it in the list
	menuWidth: 400,
	menuPadding: 12,
	menuRadius: 28,
	menuItemHeight: 64,
	menuItemGap: 4,
	menuItemRadius: 18,
	menuGlyphWell: 40,
	menuGlyph: 24,
	menuOffset: 12, // between a button and the menu it opens
	menuGap: 24, // between the app list and an app's menu
	weatherGlyph: 44, // the sky, left of the temperature (Settings)
	weatherGlyphHome: 32,
	weatherGap: 16, // between the glyph, the temperature and the sky
	weatherNoteWidth: 460, // a longer note wraps, clear of the greeting
	fieldHeight: 56, // the place search field
	placeHeight: 64, // a place found by the search
	pillHeight: 80, // a language choice in Settings
	pillHeightLarge: 104, // a language choice in the onboarding
	onboardingTop: 180, // the title of the Apps and Background steps
	onboardingWelcomeTop: 300, // the title of the first step
	onboardingGridHeight: 480, // two rows of tiles
	onboardingFooterBottom: 64, // the step dots and the key hint
	tileSize: 144, // app / source tiles are square
	tileGap: 28,
	tileRadius: 24,
	gridColumns: 9, // settings picker grid
	gridHeight: 720, // the visible part of the settings picker grid, which scrolls
	gridRowGap: 40, // vertical space between rows of the settings picker grid
	liftOffset: -6 // a tile picked up in re-order mode rises by this much
} as const;

export const MOTION = {
	focusMs: 200,
	scrollMs: 260,
	menuInMs: 160, // a menu opening
	focusScale: 1.12,
	liftScale: 1.2, // a tile picked up in re-order mode
	listShift: 20, // the focused app moves right by this much
	appIconFocusScale: 1.3,
	appNameRestScale: 32 / 42, // a name without focus is drawn at 32 px (FONT.appName: 42)
	appRestOpacity: 0.78, // the apps without focus
	dimmedOpacity: 0.35, // the other apps while one is moved or has its menu open
	backdropOpacity: 0.25, // the bar and the weather while an app is moved
	barFocusScale: 1.06,
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
