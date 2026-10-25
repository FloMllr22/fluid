import {t} from '../i18n';
import {greetingKey} from '../lib/clock';

export function Header({now}: {now: Date}) {
	return (
		<header class="header">
			<h1 class="header__greeting">{t(greetingKey(now))}</h1>
		</header>
	);
}
