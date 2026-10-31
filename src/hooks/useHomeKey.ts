import {useCallback, useEffect, useState} from 'preact/hooks';
import type {ToastMessage} from '../components/Toast';
import {errorMessage, t} from '../i18n';
import {type HomeKey as Known, platform} from '../platform';

export interface HomeKey {
	/** undefined until the TV has answered, or when it cannot */
	known: Known | undefined;
	/** why the TV cannot answer */
	problem: string | undefined;
	/** being changed */
	busy: boolean;
	/** it went back to LG Home by itself since fluid last ran */
	gaveUp: boolean;
	toggle: () => void;
	toggleInput: () => void;
}

/** What the Home key opens, and changing that. Asked at the start, which also tells the TV that
 *  fluid is up; after a failure again when fluid comes to the front, as the Homebrew Channel's
 *  service may start late after the TV booted. */
export function useHomeKey(showToast: (text: string, kind?: ToastMessage['kind']) => void): HomeKey {
	const [known, setKnown] = useState<Known | undefined>(undefined);
	const [problem, setProblem] = useState<string | undefined>(undefined);
	const [busy, setBusy] = useState(false);
	const [gaveUp, setGaveUp] = useState(false);

	useEffect(() => {
		let answered = false;
		const read = () => {
			if (answered) return;
			platform.getHomeKey().then(
				(next) => {
					answered = true;
					setProblem(undefined);
					if (next.state !== 'gave-up') {
						setKnown(next);
						return;
					}
					setKnown({...next, state: 'off'});
					setGaveUp(true);
					showToast(t('tv.homeKeyGaveUp'), 'error');
					// told once; should this fail, the user is told again at the next start
					platform.acknowledgeHomeKey().catch(() => undefined);
				},
				(error: unknown) => setProblem(errorMessage(error))
			);
		};
		read();
		return platform.onForeground(read);
	}, [showToast]);

	const change = (asked: Promise<Known>) => {
		setBusy(true);
		asked.then(
			(next) => {
				setBusy(false);
				setGaveUp(false);
				setKnown(next.state === 'gave-up' ? {...next, state: 'off'} : next);
			},
			(error: unknown) => {
				setBusy(false);
				showToast(`${t('tv.homeKeyFailed')} ${errorMessage(error)}`, 'error');
			}
		);
	};

	const toggle = useCallback(() => {
		if (busy || !known || known.state === 'unsupported') return;
		change(platform.setHomeKey(known.state !== 'on'));
	}, [busy, known, showToast]);

	const toggleInput = useCallback(() => {
		if (busy || !known || known.state !== 'on') return;
		change(platform.setIsInput(!known.isInput));
	}, [busy, known, showToast]);

	return {known, problem, busy, gaveUp, toggle, toggleInput};
}
