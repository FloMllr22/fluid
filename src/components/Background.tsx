import {useEffect, useRef, useState} from 'preact/hooks';
import {useInFront} from '../hooks/useInFront';
import {useSlideshow} from '../hooks/useSlideshow';
import type {Photo} from '../lib/backgrounds';
import type {Background as BackgroundChoice} from '../state/settings';
import {COLOR_BACKGROUNDS, DUSK_LAYERS, DUSK_SKY} from '../theme/backgrounds';

interface Props {
	/** what to draw: a colour, a photo or a slideshow that is there (see shownBackground) */
	background: BackgroundChoice;
	photos: Photo[];
	/** a photo could not be loaded */
	onError: () => void;
}

/** A photo on screen; `n` tells apart two showings of the same photo. */
interface Layer {
	url: string;
	n: number;
}

/** The layer behind every screen: a colour, or a photo that fades in over the last one,
 *  darkened so that text on it stays readable. A photo is shown once it has loaded, so
 *  it never fades in half drawn. The moving dusk has its lights, stars and gleams on layers
 *  of their own, which move while fluid is in front. */
export function Background({background, photos, onError}: Props) {
	const slide = useSlideshow(
		photos.map((p) => p.id),
		background.kind === 'slideshow'
	);
	const photoId = background.kind === 'photo' ? background.id : background.kind === 'slideshow' ? slide : undefined;
	const photo = photos.find((p) => p.id === photoId);
	const url = photo ? photo.url : undefined;

	const [layers, setLayers] = useState<Layer[]>([]);
	const count = useRef(0);
	const reportError = useRef(onError);
	reportError.current = onError;

	useEffect(() => {
		if (!url) {
			setLayers([]);
			return;
		}
		let current = true;
		const image = new Image();
		// The new photo goes on top; the one below stays until the next comes, so the fade
		// never shows the colour underneath.
		image.onload = () => {
			if (current) setLayers((shown) => shown.slice(-1).concat({url, n: ++count.current}));
		};
		image.onerror = () => {
			if (current) reportError.current();
		};
		image.src = url;
		return () => {
			current = false;
		};
	}, [url]);

	const moving = background.kind === 'color' && background.color === 'duskMoving';
	const inFront = useInFront(moving);
	const color = background.kind === 'color' ? (moving ? DUSK_SKY : COLOR_BACKGROUNDS[background.color]) : undefined;
	return (
		<div
			class={inFront ? 'background' : 'background background--still'}
			style={color ? {background: color} : undefined}
		>
			{moving &&
				DUSK_LAYERS.map((part) => (
					<div key={part.name} class={`background__light background__light--${part.name}`} style={part.style} />
				))}
			{url && layers.map((layer) => <img key={layer.n} class="background__photo" src={layer.url} alt="" />)}
			{url && <div class="background__scrim" />}
		</div>
	);
}
