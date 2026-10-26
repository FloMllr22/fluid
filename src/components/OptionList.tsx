export interface OptionItem {
	id: string;
	label: string;
	description: string;
	value: boolean;
}

interface Props {
	options: OptionItem[];
	focused: boolean;
	selected: number;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
}

/** Vertical list of on/off options. */
export function OptionList({options, focused, selected, onSelect, onActivate}: Props) {
	return (
		<div class="options">
			{options.map((o, i) => (
				<OptionRow
					key={o.id}
					option={o}
					focused={focused && i === selected}
					onHover={() => onSelect(i)}
					onActivate={() => onActivate(i)}
				/>
			))}
		</div>
	);
}

/** One on/off option: its label and description, and a switch. */
export function OptionRow({
	option,
	focused,
	onHover,
	onActivate
}: {
	option: OptionItem;
	focused: boolean;
	onHover: () => void;
	onActivate: () => void;
}) {
	return (
		<div class={`option${focused ? ' option--focused' : ''}`} onMouseEnter={onHover} onClick={onActivate}>
			<div class="option__text">
				<div class="option__label">{option.label}</div>
				<div class="option__description">{option.description}</div>
			</div>
			<div class={`switch${option.value ? ' switch--on' : ''}`} role="switch" aria-checked={option.value}>
				<div class="switch__knob" />
			</div>
		</div>
	);
}
