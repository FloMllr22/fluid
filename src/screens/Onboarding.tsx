import {useCallback, useState} from 'preact/hooks';
import {Grid} from '../components/Grid';
import {LanguagePills} from '../components/LanguageChoice';
import {type SettingsTab, useGridTab} from '../hooks/useGridTab';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {type MessageKey, t} from '../i18n';
import {LANGUAGE_CHOICES, type LanguageChoice} from '../state/settings';
import {LAYOUT} from '../theme/tokens';

interface Props {
	language: LanguageChoice;
	tvLocale: string;
	/** uses a language at once, as the Language tab does */
	onLanguage: (choice: LanguageChoice) => void;
	/** the Apps and Background tabs of Settings, and what changes them */
	apps: SettingsTab;
	background: SettingsTab;
	onToggle: (tabId: string, key: string, order: string[]) => void;
	onReorder: (tabId: string, keys: string[]) => void;
	/** the last step is done: store the settings and show Home */
	onFinish: () => void;
	active: boolean;
}

const STEPS = ['language', 'apps', 'background'] as const;
type Step = (typeof STEPS)[number];

/** The words of each step. */
const TEXTS: Record<Step, {title: MessageKey; lead: MessageKey}> = {
	language: {title: 'onboarding.language.title', lead: 'onboarding.language.lead'},
	apps: {title: 'onboarding.apps.title', lead: 'onboarding.apps.lead'},
	background: {title: 'onboarding.background.title', lead: 'onboarding.background.lead'}
};

/** Above the grid: the Apps step's re-order button, and Next (or Finish on the last step). */
type ButtonId = 'reorder' | 'next';

/** Focus is on the buttons or in the grid. */
type Zone = 'buttons' | 'grid';

/** The first start: language, apps, background, one step at a time, as the onboarding
 *  mockups draw them. The language step offers the Language tab's choices: ← → choose,
 *  OK uses one and goes on. The Apps and Background steps are those tabs of Settings,
 *  with Next (Finish) above them: focus starts there, so OK goes on with what is chosen
 *  (all apps, the dark background), and ↓ leads into the grid, which works as in
 *  Settings. Back returns to the step before (in re-order mode it first undoes, as in
 *  Settings). Every choice shows at once; App stores them all when the last step is
 *  done. */
export function Onboarding({
	language,
	tvLocale,
	onLanguage,
	apps,
	background,
	onToggle,
	onReorder,
	onFinish,
	active
}: Props) {
	const [step, setStep] = useState(0);
	const [zone, setZone] = useState<Zone>('buttons');
	const [button, setButton] = useState<ButtonId>('next');
	const [pill, setPill] = useState(() => Math.max(0, LANGUAGE_CHOICES.indexOf(language)));
	const name = STEPS[step];
	const last = step === STEPS.length - 1;
	const tab = name === 'apps' ? apps : name === 'background' ? background : undefined;
	const grid = useGridTab(tab, onToggle, onReorder, LAYOUT.onboardingGridColumns);
	// while re-ordering, only its Done button: the step cannot be left halfway
	const buttons: ButtonId[] = grid.canReorder ? (grid.reordering ? ['reorder'] : ['reorder', 'next']) : ['next'];
	const focused: ButtonId = buttons.indexOf(button) === -1 ? buttons[0] : button;

	const goTo = (next: number) => {
		if (next >= STEPS.length) {
			onFinish();
			return;
		}
		setStep(next);
		setZone('buttons');
		setButton('next');
		grid.reset();
	};

	const chooseLanguage = (i: number) => {
		setPill(i);
		onLanguage(LANGUAGE_CHOICES[i]);
		goTo(step + 1);
	};

	/** Enter or leave re-order mode, entering with the tile `lift` picked up (holding OK or
	 *  the pointer's button on it); with nothing to re-order, focus stays on the button. */
	const toggleReorder = (lift?: number) => {
		if (grid.setReordering(!grid.reordering, lift) === 0) setZone('buttons');
	};

	const pressButton = (id: ButtonId) => {
		if (id === 'next') goTo(step + 1);
		else toggleReorder();
	};

	const onPress = () => {
		if (name === 'language') chooseLanguage(pill);
		else if (zone === 'buttons') pressButton(focused);
		else grid.activate(grid.index);
	};

	const onLongPress = () => {
		if (name === 'language') chooseLanguage(pill);
		else if (zone === 'buttons') pressButton(focused);
		else if (grid.canReorder) toggleReorder(grid.index);
	};

	useOkPress({onPress, onLongPress}, active);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'enter') return true; // handled by useOkPress (press vs hold)

			if (key === 'back') {
				if (step > 0 && !grid.back()) goTo(step - 1);
				return true; // the first step has none before it, and fluid stays open
			}

			if (name === 'language') {
				const lastPill = LANGUAGE_CHOICES.length - 1;
				if (key === 'left') setPill((i) => clamp(i - 1, 0, lastPill));
				else if (key === 'right') setPill((i) => clamp(i + 1, 0, lastPill));
				return true;
			}

			if (grid.held !== -1) {
				grid.arrow(key);
				return true;
			}

			if (zone === 'buttons') {
				const at = buttons.indexOf(focused);
				if (key === 'left') setButton(buttons[clamp(at - 1, 0, buttons.length - 1)]);
				else if (key === 'right') setButton(buttons[clamp(at + 1, 0, buttons.length - 1)]);
				else if (key === 'down' && grid.items.length > 0) setZone('grid');
				return true;
			}

			if (!grid.arrow(key)) setZone('buttons');
			return true;
		},
		[step, name, zone, focused, grid]
	);

	useKeys(handleKey, active);

	const hint = t(
		name === 'language'
			? 'onboarding.hint.language'
			: grid.held !== -1
				? 'settings.hint.holding'
				: grid.reordering
					? 'settings.hint.reorder'
					: zone === 'grid'
						? name === 'apps'
							? 'onboarding.hint.appsGrid'
							: 'onboarding.hint.backgroundGrid'
						: focused === 'reorder'
							? 'onboarding.hint.reorderButton'
							: last
								? 'onboarding.hint.finish'
								: grid.items.length === 0
									? 'onboarding.hint.nextOnly'
									: 'onboarding.hint.next'
	);

	const buttonLabel = (id: ButtonId) =>
		id === 'next'
			? t(last ? 'onboarding.finish' : 'onboarding.next')
			: grid.reordering
				? t('settings.done')
				: tab?.reorderLabel || '';

	return (
		<div class="screen onboarding">
			<div class="onboarding__brand">{t('onboarding.brand')}</div>
			<div class="onboarding__step">{t('onboarding.step', {step: step + 1, count: STEPS.length})}</div>
			<div class={`onboarding__main onboarding__main--${name}`}>
				<h1 class="onboarding__title">{t(TEXTS[name].title)}</h1>
				<p class="onboarding__lead">{tab?.note || t(TEXTS[name].lead)}</p>
				{name === 'language' && (
					<div class="onboarding__choices">
						<LanguagePills
							chosen={language}
							tvLocale={tvLocale}
							focus={pill}
							large
							onPoint={setPill}
							onPick={chooseLanguage}
						/>
					</div>
				)}
				{tab && (
					<>
						<div class="onboarding__buttons">
							{buttons.map((id) => (
								<div
									key={id}
									class={[
										'settings__button',
										'onboarding__button',
										id === 'reorder' && grid.reordering && 'settings__button--active',
										id === 'next' && 'onboarding__button--next',
										zone === 'buttons' && id === focused && 'settings__button--focused'
									]
										.filter(Boolean)
										.join(' ')}
									onMouseEnter={() => {
										if (grid.held !== -1) return;
										setZone('buttons');
										setButton(id);
									}}
									onClick={() => pressButton(id)}
								>
									{buttonLabel(id)}
								</div>
							))}
						</div>
						{grid.items.length > 0 ? (
							<Grid
								items={grid.items}
								cols={LAYOUT.onboardingGridColumns}
								mode={grid.mode}
								checkedKeys={tab.shown.map((tile) => tile.key)}
								liftedIndex={grid.held}
								focused={zone === 'grid'}
								selected={grid.index}
								height={LAYOUT.onboardingGridHeight}
								onSelect={(i) => {
									if (grid.point(i)) setZone('grid');
								}}
								onActivate={(i) => {
									setZone('grid');
									grid.activate(i);
								}}
								onHold={
									grid.canReorder
										? (i) => {
												setZone('grid');
												toggleReorder(i);
											}
										: undefined
								}
							/>
						) : (
							// loading, failed (the apps), or nothing there; Next works all the same
							<p class="onboarding__empty">{grid.reordering ? t('settings.reorderEmpty') : tab.emptyText}</p>
						)}
					</>
				)}
			</div>
			<div class="onboarding__footer">
				<div class="onboarding__dots">
					{STEPS.map((id, i) => (
						<span
							key={id}
							class={`onboarding__dot${i === step ? ' onboarding__dot--current' : i < step ? ' onboarding__dot--done' : ''}`}
						/>
					))}
				</div>
				<p class="onboarding__hint">{hint}</p>
			</div>
		</div>
	);
}
