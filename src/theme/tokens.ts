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
	// A soft shade behind the app wheel on Home, from the left edge to clear of the names, so
	// that they read without a shadow of their own. With it the names that are not selected
	// keep WCAG AA for their large text on every colour (on dusk at least 3.8:1, where a name
	// of the greatest length ends just above the horizon).
	wheelShade: 'rgba(4, 8, 24, 0.5)',
	wheelShadeEdge: 'rgba(4, 8, 24, 0)',
	// Over a photo: darker behind the app wheel (left) and the greeting (foot), light
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
	highlight: 'rgba(255, 255, 255, 0.14)', // behind the focused app on the wheel
	highlightHover: 'rgba(255, 255, 255, 0.1)', // behind an app beneath the pointer
	highlightLifted: 'rgba(255, 255, 255, 0.24)', // behind the app being moved
	glyphWell: 'rgba(255, 255, 255, 0.12)', // behind a glyph in a menu
	glyphWellFocus: 'rgba(7, 8, 11, 0.1)',
	// what has focus, where it is not an app on the wheel: a light pill with dark text
	focusFill: '#F4F5F7',
	focusText: '#07080B',
	iconShadow: 'rgba(0, 0, 0, 0.3)',
	iconShadowFocused: 'rgba(0, 0, 0, 0.45)',
	liftedShadow: 'rgba(0, 0, 0, 0.4)',
	menuShadow: 'rgba(0, 0, 0, 0.45)',
	focusTextSoft: 'rgba(7, 8, 11, 0.7)', // a description on a focused row
	focusShadow: 'rgba(0, 0, 0, 0.5)', // under a focused row or tile
	// Settings and the onboarding: the background, dimmed, so that their text keeps its
	// contrast on any colour or photo; tiles, rows and choices without focus on it
	screenDim: 'rgba(6, 9, 22, 0.72)',
	surface: 'rgba(255, 255, 255, 0.07)',
	surfaceEdge: 'rgba(255, 255, 255, 0.1)',
	tileDim: 'rgba(6, 9, 22, 0.6)', // over a tile that is not chosen
	tabOpen: 'rgba(255, 255, 255, 0.1)', // the tab whose content is shown
	liftShadow: 'rgba(0, 0, 0, 0.7)',
	// on/off switches; on a focused (light) row they turn dark
	switchTrack: 'rgba(255, 255, 255, 0.18)',
	switchKnob: '#C9CDD3',
	switchTrackFocused: 'rgba(7, 8, 11, 0.15)',
	switchKnobFocused: '#6B7078',
	fieldBg: 'rgba(0, 0, 0, 0.3)', // a text field, inside its row
	fieldBgFocused: 'rgba(7, 8, 11, 0.08)',
	dot: 'rgba(255, 255, 255, 0.25)', // an onboarding step still to come
	dotDone: 'rgba(255, 255, 255, 0.5)', // an onboarding step done
	danger: '#e0564f'
} as const;

export const FONT = {
	family: 'Manrope, "LG Smart UI", "Helvetica Neue", Arial, sans-serif',
	appNameFamily: 'Outfit, Manrope, "LG Smart UI", "Helvetica Neue", Arial, sans-serif', // the apps' names on Home
	greeting: 96,
	dateLine: 30, // weekday, date and time under the greeting
	moveMode: 22, // "MOVING" above the app's name, in place of the greeting
	appName: 46, // an app on the wheel, laid out at its selected size (see wheelNameRestScale)
	appMonogram: 28, // the first letter of an app without artwork
	emptyNote: 28, // why a list has nothing in it (loading, failed, none chosen)
	barLabel: 20, // "Sources"
	barMonogram: 23, // "LG"
	menuItem: 21,
	weather: 26, // the temperature, bottom right
	weatherNote: 24, // why there is no weather (loading, no place, failed)
	tileLabel: 19,
	settingsTitle: 64,
	settingsClock: 36,
	settingsTab: 30,
	settingsButton: 22,
	hint: 24, // the keys, at the foot of Settings and the onboarding
	optionLabel: 30,
	optionDescription: 22,
	toast: 24,
	pill: 28, // a language choice in Settings
	pillLarge: 34, // a language choice in the onboarding
	onboardingBrand: 36,
	onboardingStep: 26, // "Step 1 of 3"
	onboardingWelcome: 96, // the first step's title
	onboardingTitle: 80,
	onboardingLead: 32
} as const;

export const LAYOUT = {
	screenWidth: 1920,
	screenHeight: 1080,
	// the safe area: 5 % of the screen at either side, a little more at top and foot
	safeX: 96,
	safeY: 64,
	// the app wheel on the left (its shape: WHEEL): rows of icon and name, each laid out as
	// when selected, with the room around them then; the focused one on a light pill
	wheelRowHeight: 96,
	wheelPad: 6, // left of the icon
	wheelGap: 40, // between icon and name; the icon has grown into part of it
	wheelGapRest: 26, // the same, not selected
	wheelPadEnd: 40, // right of the name
	wheelPadEndRest: 14, // the same, not selected (the pill beneath the pointer)
	wheelNameMax: 560, // a longer name is cut short
	wheelArrowSize: 44, // the arrows of the app being moved, beside its name
	wheelShadeWidth: 820,
	wheelNoteWidth: 520, // why there are no apps, in place of the wheel
	appIcon: 76,
	appIconRadius: 21,
	mainLeft: 700, // the greeting, right of the wheel
	// the bar at the top right: Sources, LG Home, Settings
	barHeight: 60,
	barGap: 14,
	barGlyph: 26,
	// the menus: Sources, below its button, and an app's menu, beside it on the wheel
	menuWidth: 400,
	menuPadding: 12,
	menuRadius: 28,
	menuItemHeight: 64,
	menuItemGap: 4,
	menuItemRadius: 18,
	menuGlyphWell: 40,
	menuGlyph: 24,
	menuOffset: 12, // between a button and the menu it opens
	menuGap: 24, // between the app's pill and an app's menu
	weatherGlyph: 44, // the sky, left of the temperature (Settings)
	weatherGlyphHome: 32,
	weatherGap: 16, // between the glyph, the temperature and the sky
	weatherNoteWidth: 460, // a longer note wraps, clear of the greeting
	// Settings: the title and the time at the top, the tabs on the left, the open tab's
	// content on the right, the keys at the foot
	settingsTop: 210, // the tabs and the content
	settingsTabsWidth: 480,
	settingsTabHeight: 72,
	settingsContentLeft: 680,
	settingsButtonHeight: 64, // the re-order button above a grid
	settingsToolbar: 80, // the button and the space below it
	settingsGridColumns: 6,
	settingsGridHeight: 738, // below the button: three rows of tiles, and the room around them
	optionHeight: 100, // a row of the options, the weather and the places (at least)
	optionRadius: 28,
	fieldHeight: 60, // the place search field
	placeHeight: 76, // a place found by the search
	pillHeight: 80, // a language choice in Settings
	pillHeightLarge: 104, // a language choice in the onboarding
	onboardingTop: 180, // the title of the Apps and Background steps
	onboardingWelcomeTop: 300, // the title of the first step
	onboardingGridHeight: 500, // two rows of tiles, and the room around them
	tileSize: 144, // app / source tiles are square
	tileGap: 28,
	tileRadius: 24,
	tileLabelGap: 14, // between a tile and its name
	onboardingGridColumns: 9,
	gridRowGap: 32, // vertical space between rows of a grid of tiles
	gridBleed: 28, // room around a grid for its focused or lifted tile
	liftOffset: -6 // a tile picked up in re-order mode rises by this much
} as const;

export const MOTION = {
	focusMs: 200,
	scrollMs: 260,
	menuInMs: 160, // a menu opening
	focusScale: 1.12,
	liftScale: 1.2, // a tile picked up in re-order mode
	wheelTurnMs: 500, // the wheel turning another app to the middle
	wheelGrowMs: 400, // the selected app's icon growing; an app fading in or out
	wheelNameMs: 300, // its name growing, the pills fading
	wheelIconScale: 1.37,
	wheelNameRestScale: 30 / 46, // a name not selected is drawn at 30 px (FONT.appName: 46)
	// the apps not selected: 0.84 beside it, fainter by the step with each place further out
	wheelRestOpacity: 0.9,
	wheelOpacityStep: 0.06,
	dimmedOpacity: 0.35, // the other apps while one is moved or has its menu open
	backdropOpacity: 0.25, // the bar and the weather while an app is moved
	barFocusScale: 1.06,
	photoFadeMs: 1500, // a new background photo fading in over the last one
	// the moving dusk: its glow and its bloom drift there and back in these times, which
	// do not divide each other, so that they rarely meet in the same place again
	duskGlowMs: 23000,
	duskBloomMs: 29000
} as const;

/** The app wheel's shape: a circle whose right-most point, in the middle of the screen,
 *  holds the selected app (see AppWheel; not written to CSS). */
export const WHEEL = {
	radius: 1100,
	step: 4.66, // degrees between neighbours
	gap: 2, // degrees of extra room either side of the selected app
	reach: 5 // apps shown either side of it: the outermost run out to the screen's top and foot
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
