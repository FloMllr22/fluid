// The app list as fluid shows it.

import type {AppEntry} from '../platform';

/** Whether two readings of the app list show the same: the same apps in the same order,
 *  each with the same name and icon. A reading that changes nothing is not drawn again. */
export function sameApps(a: AppEntry[], b: AppEntry[]): boolean {
	return (
		a.length === b.length &&
		a.every(
			(app, i) =>
				app.id === b[i].id && app.title === b[i].title && app.iconUrl === b[i].iconUrl && app.color === b[i].color
		)
	);
}
