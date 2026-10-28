// The app list as fluid shows it.

import type {AppEntry} from '../platform';
import type {Settings} from '../state/settings';

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

/** The settings after a reading of the app list (`ids`). An app that was not there at the
 *  last reading is new: it joins the end of an Apps row of the user's own (a row of every
 *  app, null, has it anyway). An app still in the row from before it was uninstalled comes
 *  back at its place. The first reading only learns which apps there are: settings of
 *  fluid before version 6 do not know, and every app the user hid would come back.
 *  Uninstalled apps are forgotten, so one installed again counts as new. The same object
 *  when nothing changes. */
export function withNewApps(settings: Settings, ids: string[]): Settings {
	const known = settings.knownAppIds;
	if (known && known.length === ids.length && ids.every((id) => known.indexOf(id) !== -1)) return settings;
	const {appIds} = settings;
	const added = appIds && known ? ids.filter((id) => known.indexOf(id) === -1 && appIds.indexOf(id) === -1) : [];
	return {
		...settings,
		appIds: appIds && added.length ? appIds.concat(added) : appIds,
		knownAppIds: ids.slice()
	};
}
