import {useCallback, useState} from 'preact/hooks';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {languageName, languageOf, t} from '../i18n';
import {LANGUAGE_CHOICES, type LanguageChoice} from '../state/settings';
import {CheckMark} from './Glyph';

/** A choice by name: a language by its own name, the TV's with the language it means. */
export function choiceLabel(choice: LanguageChoice, tvLocale: string): string {
	return choice === 'tv' ? t('language.tv', {name: languageName(languageOf(tvLocale))}) : languageName(choice);
}

interface PillsProps {
	/** the choice in use: ticked */
	chosen: LanguageChoice;
	tvLocale: string;
	/** the focused pill, or -1 */
	focus: number;
	/** the onboarding's large pills, or the smaller ones in Settings */
	large?: boolean;
	onPoint: (index: number) => void;
	onPick: (index: number) => void;
}

/** The language choices side by side, as LANGUAGE_CHOICES orders them. */
export function LanguagePills({chosen, tvLocale, focus, large, onPoint, onPick}: PillsProps) {
	return (
		<div class={`pills${large ? ' pills--large' : ''}`}>
			{LANGUAGE_CHOICES.map((choice, i) => (
				<div
					key={choice}
					class={`pill${i === focus ? ' pill--focused' : ''}`}
					onMouseEnter={() => onPoint(i)}
					onClick={() => onPick(i)}
				>
					{choice === chosen && (
						<span class="pill__check">
							<CheckMark />
						</span>
					)}
					{choiceLabel(choice, tvLocale)}
				</div>
			))}
		</div>
	);
}

interface PanelProps {
	chosen: LanguageChoice;
	tvLocale: string;
	/** uses a language at once */
	onChoose: (choice: LanguageChoice) => void;
	/** has the remote's keys */
	active: boolean;
	/** ← from the first choice: back to the tabs */
	onExit: () => void;
	/** Back: home */
	onClose: () => void;
	/** the pointer points into the panel, which then takes the keys */
	onPointer: () => void;
}

/** The Language tab: ← → choose, OK uses the language at once, ← from the first choice
 *  back to the tabs. */
export function LanguagePanel({chosen, tvLocale, onChoose, active, onExit, onClose, onPointer}: PanelProps) {
	const [focus, setFocus] = useState(() => Math.max(0, LANGUAGE_CHOICES.indexOf(chosen)));
	const last = LANGUAGE_CHOICES.length - 1;

	useOkPress(
		{onPress: () => onChoose(LANGUAGE_CHOICES[focus]), onLongPress: () => onChoose(LANGUAGE_CHOICES[focus])},
		active
	);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'left') {
				if (focus === 0) onExit();
				else setFocus(focus - 1);
			} else if (key === 'right') setFocus(clamp(focus + 1, 0, last));
			else if (key === 'back') onClose();
			return true; // OK goes through useOkPress
		},
		[focus, last, onExit, onClose]
	);
	useKeys(handleKey, active);

	return (
		<div class="language-settings">
			<LanguagePills
				chosen={chosen}
				tvLocale={tvLocale}
				focus={active ? focus : -1}
				onPoint={(i) => {
					setFocus(i);
					onPointer();
				}}
				onPick={(i) => {
					setFocus(i);
					onChoose(LANGUAGE_CHOICES[i]);
				}}
			/>
		</div>
	);
}
