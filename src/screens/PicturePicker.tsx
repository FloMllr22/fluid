import {useCallback, useEffect, useState} from 'preact/hooks';
import {Glyph, type GlyphName} from '../components/Glyph';
import {clamp, type NavKey, useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {useSettled} from '../hooks/useSettled';
import {errorMessage, t, tn} from '../i18n';
import {joinPath, PICTURE_MAX_MB} from '../lib/pictures';
import {platform} from '../platform';
import {LAYOUT} from '../theme/tokens';

/** One picture to show, or a folder of pictures to show one after the other. */
export type PickerMode = 'picture' | 'folder';

interface Props {
	mode: PickerMode;
	active: boolean;
	onPick: (path: string) => void;
	onClose: () => void;
}

/** A line of the list: goes into a place or folder, or chooses. */
interface Row {
	key: string;
	label: string;
	glyph: GlyphName;
	/** what OK does */
	action: 'enter' | 'choose';
	path: string;
	/** a picture: shown beside the list while it has focus */
	preview?: string;
}

/** What is open: a list of rows, what to say about it, and where focus was in the level above. */
interface Listing {
	rows: Row[];
	/** why there is less than the user might expect */
	note?: string;
}

/** How long the focus rests on a picture before it is drawn: a picture can be large. */
const PREVIEW_SETTLE_MS = 250;

/** How many rows show at a time, and the room above and below the one with focus. */
const ROWS_SHOWN = Math.floor(
	(LAYOUT.pickerListHeight + LAYOUT.pickerRowGap) / (LAYOUT.pickerRowHeight + LAYOUT.pickerRowGap)
);

/** Choosing a picture or a folder from a USB drive or the TV's own storage, with the remote or the
 *  pointer: ↑ ↓ move, OK or → go in or choose, ← or Back go up, and from the top back to where it
 *  was opened. A picture shows beside the list once focus rests on it. */
export function PicturePicker({mode, active, onPick, onClose}: Props) {
	/** the folders gone into: what each is called, and the row it was reached from */
	const [trail, setTrail] = useState<{path: string; label: string; focus: number}[]>([]);
	const [listing, setListing] = useState<Listing | undefined>(undefined);
	const [problem, setProblem] = useState<string | undefined>(undefined);
	const [focus, setFocus] = useState(0);
	const here = trail.length > 0 ? trail[trail.length - 1].path : undefined;

	useEffect(() => {
		let current = true;
		setListing(undefined);
		setProblem(undefined);
		const shown = (next: Listing) => {
			if (current) setListing(next);
		};
		const failed = (error: unknown) => {
			if (current) setProblem(errorMessage(error));
		};
		if (here === undefined) {
			platform.listPicturePlaces().then(
				(places) =>
					shown({
						rows: places.map((place, i) => ({
							key: place.path,
							label: place.kind === 'internal' ? t('pictures.internal') : t('pictures.usb', {number: i}),
							glyph: place.kind === 'internal' ? 'tv' : 'input',
							action: 'enter',
							path: place.path
						})),
						note: places.length === 1 ? t('pictures.noUsb') : undefined
					}),
				failed
			);
		} else {
			platform.listPictures(here).then((folder) => {
				const count = folder.pictures.length;
				const rows: Row[] =
					mode === 'folder' && count > 0
						? [
								{
									key: 'use',
									label: tn('pictures.useFolder', count),
									glyph: 'slideshow',
									action: 'choose',
									path: here
								}
							]
						: [];
				for (const name of folder.folders) {
					rows.push({key: `d:${name}`, label: name, glyph: 'folder', action: 'enter', path: joinPath(here, name)});
				}
				if (mode === 'picture') {
					for (const name of folder.pictures) {
						const path = joinPath(here, name);
						rows.push({
							key: `f:${name}`,
							label: name,
							glyph: 'picture',
							action: 'choose',
							path,
							preview: platform.pictureUrl(path)
						});
					}
				}
				const notes = [];
				if (rows.length === 0) notes.push(t('pictures.empty', {path: here}));
				if (folder.tooLarge > 0) notes.push(tn('pictures.tooLarge', folder.tooLarge, {size: PICTURE_MAX_MB}));
				shown({rows, note: notes.join(' ') || undefined});
			}, failed);
		}
		return () => {
			current = false;
		};
	}, [here, mode]);

	const rows = listing ? listing.rows : [];
	const at = clamp(focus, 0, Math.max(0, rows.length - 1));
	const row: Row | undefined = rows[at];
	const preview = useSettled(row ? row.preview : undefined, PREVIEW_SETTLE_MS);

	const activate = (target: Row | undefined) => {
		if (!target) return;
		if (target.action === 'choose') onPick(target.path);
		else {
			setTrail(trail.concat({path: target.path, label: target.label, focus: at}));
			setFocus(0);
		}
	};

	const back = () => {
		if (trail.length === 0) {
			onClose();
			return;
		}
		setFocus(trail[trail.length - 1].focus);
		setTrail(trail.slice(0, -1));
	};

	useOkPress({onPress: () => activate(row), onLongPress: () => activate(row)}, active);

	const handleKey = useCallback(
		(key: NavKey): boolean => {
			if (key === 'up') setFocus(clamp(at - 1, 0, Math.max(0, rows.length - 1)));
			else if (key === 'down') setFocus(clamp(at + 1, 0, Math.max(0, rows.length - 1)));
			else if (key === 'left' || key === 'back') back();
			else if (key === 'right' && row && row.action === 'enter') activate(row);
			return true; // OK goes through useOkPress
		},
		[at, rows, row, trail]
	);
	useKeys(handleKey, active);

	// a long list scrolls by whole rows, and only what can be seen is drawn
	const first = clamp(at - Math.floor(ROWS_SHOWN / 2), 0, Math.max(0, rows.length - ROWS_SHOWN));
	const seen = rows.slice(first, first + ROWS_SHOWN);

	return (
		<div class="screen picker">
			<h1 class="settings__title">{t(mode === 'picture' ? 'pictures.titlePicture' : 'pictures.titleFolder')}</h1>
			<p class="picker__where">{trail.length > 0 ? trail[trail.length - 1].label : t('pictures.lead')}</p>
			<div class="picker__list">
				{problem && (
					<p class="settings__empty">
						{t('pictures.failed')} {problem}
					</p>
				)}
				{!problem && !listing && <p class="settings__empty">{t('pictures.loading')}</p>}
				{seen.map((item, i) => (
					<div
						key={item.key}
						class={`picker__row${first + i === at ? ' picker__row--focused' : ''}`}
						onMouseEnter={() => setFocus(first + i)}
						onClick={() => activate(item)}
					>
						<Glyph name={item.glyph} className="picker__glyph" />
						<span class="picker__label">{item.label}</span>
					</div>
				))}
				{listing?.note && <p class="picker__note">{listing.note}</p>}
			</div>
			{preview && <img class="picker__preview" key={preview} src={preview} alt="" />}
			<p class="settings__hint">{t('pictures.hint')}</p>
		</div>
	);
}
