import {useEffect, useState} from 'preact/hooks';
import {clear} from '../theme/appearance';

interface Props {
	/** the glow's colour, as hex */
	color: string;
	/** how strongly it shows, 0–1 */
	strength: number;
	/** its middle, on the screen */
	x: number;
	y: number;
}

/** Two layers, each of one colour: the one shown and the one before it. */
interface Layers {
	colors: [string, string];
	shown: 0 | 1;
}

/** A soft light in the colour of the app in the middle of the wheel, behind it. A new
 *  colour goes onto the layer not shown, which then fades in over the other: only opacity
 *  changes, and each layer is drawn once per colour. */
export function Glow({color, strength, x, y}: Props) {
	const [layers, setLayers] = useState<Layers>({colors: [color, color], shown: 0});

	useEffect(() => {
		setLayers((now) => {
			if (now.colors[now.shown] === color) return now;
			const next = now.shown === 0 ? 1 : 0;
			const colors: [string, string] = [now.colors[0], now.colors[1]];
			colors[next] = color;
			return {colors, shown: next};
		});
	}, [color]);

	return (
		<div class="glow" style={{transform: `translate(${x}px, ${y}px)`}} aria-hidden="true">
			{layers.colors.map((layerColor, i) => (
				<div
					key={i}
					class="glow__layer"
					style={{
						background: `radial-gradient(closest-side, ${layerColor}, ${clear(layerColor)})`,
						opacity: i === layers.shown ? strength : 0
					}}
				/>
			))}
		</div>
	);
}
