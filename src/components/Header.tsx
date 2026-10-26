import {t} from '../i18n';
import {greetingKey} from '../lib/clock';

/** The greeting; while an app is being moved (`moving`: its name), says so instead. */
export function Header({now, moving}: {now: Date; moving?: string}) {
	return (
		<header class="header">
			{moving === undefined ? (
				<h1 class="header__greeting">{t(greetingKey(now))}</h1>
			) : (
				<>
					<p class="header__mode">{t('move.title')}</p>
					<h1 class="header__name">{moving}</h1>
				</>
			)}
		</header>
	);
}
