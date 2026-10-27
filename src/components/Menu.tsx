import {LAYOUT} from '../theme/tokens';
import {Glyph, type GlyphName} from './Glyph';

export interface MenuEntry {
	key: string;
	label: string;
	glyph: GlyphName;
}

interface Props {
	entries: MenuEntry[];
	/** the focused entry, or -1 */
	focus: number;
	/** said in place of the entries while there are none */
	emptyText?: string;
	/** placed by its own class (the Sources menu) or by its top and left (an app's menu) */
	className: string;
	top?: number;
	left?: number;
	onPoint: (index: number) => void;
	onPick: (index: number) => void;
}

/** Choices on dark glass, one below the other, each with its glyph: the Sources menu and
 *  an app's menu. Who shows it handles the keys; the pointer points and clicks. */
export function Menu({entries, focus, emptyText, className, top, left, onPoint, onPick}: Props) {
	const px = (value?: number) => (value === undefined ? undefined : `${value}px`);
	return (
		<div class={`menu ${className}`} style={{top: px(top), left: px(left)}}>
			{entries.length === 0 ? (
				<p class="menu__empty">{emptyText}</p>
			) : (
				entries.map((entry, i) => (
					<div
						key={entry.key}
						class={`menu__item${i === focus ? ' menu__item--focused' : ''}`}
						onMouseEnter={() => onPoint(i)}
						onClick={() => onPick(i)}
					>
						<span class="menu__well">
							<Glyph name={entry.glyph} className="menu__glyph" />
						</span>
						<span class="menu__label">{entry.label}</span>
					</div>
				))
			)}
		</div>
	);
}

/** How tall a menu of `count` entries is (its border included), for placing it. */
export function menuHeight(count: number): number {
	return 2 * (LAYOUT.menuPadding + 1) + count * LAYOUT.menuItemHeight + (count - 1) * LAYOUT.menuItemGap;
}
