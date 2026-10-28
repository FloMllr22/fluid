import {useClock} from '../hooks/useClock';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {type MessageKey, t} from '../i18n';
import {THEMES, type Theme} from '../state/settings';
import {themeColors} from '../theme/appearance';
import {COLOR_BACKGROUNDS} from '../theme/backgrounds';
import {COLOR} from '../theme/tokens';
import {CheckMark} from './Glyph';
import {timeText} from './Time';

interface Props {
	/** the theme in use: ticked */
	chosen: Theme;
	/** the focused card */
	focus: number;
	onPoint: (index: number) => void;
	onPick: (index: number) => void;
}

/** Each theme's own plain background, as its card shows it. */
const GROUND: Record<Theme, string> = {
	black: COLOR_BACKGROUNDS.black,
	dark: COLOR_BACKGROUNDS.dark,
	light: COLOR_BACKGROUNDS.light
};

/** The themes side by side, as the onboarding mockup draws them: each card a small Home in
 *  that theme (the time, three apps with the middle one selected), its name below. */
export function ThemeCards({chosen, focus, onPoint, onPick}: Props) {
	const now = useClock();
	const format = useTimeFormat();
	const time = timeText(now, format);
	return (
		<div class="themes">
			{THEMES.map((theme, i) => (
				<div
					key={theme}
					class={`theme-card${i === focus ? ' theme-card--focused' : ''}`}
					onMouseEnter={() => onPoint(i)}
					onClick={() => onPick(i)}
				>
					<div class="theme-card__preview" style={{background: GROUND[theme], color: themeColors(theme).textPrimary}}>
						<span class="theme-card__clock">{time}</span>
						<span class="theme-card__apps">
							<span class="theme-card__app" style={{background: COLOR.previewAppBefore}} />
							<span class="theme-card__app theme-card__app--selected" style={{background: COLOR.previewApp}} />
							<span class="theme-card__app" style={{background: COLOR.previewAppAfter}} />
						</span>
					</div>
					<div class="theme-card__label">
						{theme === chosen && (
							<span class="theme-card__check">
								<CheckMark />
							</span>
						)}
						{t(`theme.${theme}` as MessageKey)}
					</div>
				</div>
			))}
		</div>
	);
}
