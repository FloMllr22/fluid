import type {ComponentChildren} from 'preact';
import {t} from '../i18n';
import {BAR_ITEMS} from '../lib/home';
import {ChevronMark, Glyph} from './Glyph';
import {Menu} from './Menu';
import type {TileModel} from './Tile';

interface Props {
	/** the focused button (its index in BAR_ITEMS), or -1 */
	focus: number;
	sources: TileModel[];
	/** says why there are no sources */
	sourcesEmptyText: string;
	/** the Sources menu is open, with focus on `sourceFocus` */
	sourcesOpen: boolean;
	sourceFocus: number;
	onPoint: (index: number) => void;
	onActivate: (index: number) => void;
	onPointSource: (index: number) => void;
	onPickSource: (index: number) => void;
}

/** The buttons at the top right of Home: Sources, which opens a menu of the TV's inputs
 *  below it, LG Home and Settings. */
export function Bar({
	focus,
	sources,
	sourcesEmptyText,
	sourcesOpen,
	sourceFocus,
	onPoint,
	onActivate,
	onPointSource,
	onPickSource
}: Props) {
	const button = (index: number, kind: string, children: ComponentChildren, open = false) => (
		<div
			class={`bar__button bar__button--${kind}${focus === index ? ' bar__button--focused' : ''}${open ? ' bar__button--open' : ''}`}
			onMouseEnter={() => onPoint(index)}
			onClick={() => onActivate(index)}
		>
			{children}
		</div>
	);
	return (
		<div class="bar">
			<div class="bar__sources">
				{button(
					BAR_ITEMS.indexOf('sources'),
					'pill',
					<>
						<Glyph name="input" className="bar__glyph" />
						<span class="bar__label">{t('rows.sources')}</span>
						<ChevronMark side="down" className={`bar__chevron${sourcesOpen ? ' bar__chevron--open' : ''}`} />
					</>,
					sourcesOpen
				)}
				{sourcesOpen && (
					<Menu
						className="menu--sources"
						entries={sources.map((source) => ({key: source.key, label: source.label, glyph: source.glyph || 'input'}))}
						focus={sourceFocus}
						emptyText={sourcesEmptyText}
						onPoint={onPointSource}
						onPick={onPickSource}
					/>
				)}
			</div>
			{button(BAR_ITEMS.indexOf('lg-home'), 'round', <span class="bar__monogram">{t('home.lgHomeShort')}</span>)}
			{button(BAR_ITEMS.indexOf('settings'), 'round', <Glyph name="sliders" className="bar__glyph" />)}
		</div>
	);
}
