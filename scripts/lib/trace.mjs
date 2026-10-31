// Sums up what the TV's Web Inspector reports: a trace (Chrome's trace event format) and the
// list of composited layers. Pure functions, so they can be tested without a TV.

const round = (n) => Math.round(n * 10) / 10;

/** Each event's name with its total time in ms and how often it ran. An event comes either
 *  complete (with a duration) or as a begin and an end on its thread. */
function totals(events) {
	const open = {};
	const found = {};
	const add = (name, ms) => {
		found[name] = found[name] || {count: 0, ms: 0};
		found[name].count++;
		found[name].ms += ms;
	};
	const inOrder = events.slice().sort((a, b) => a.ts - b.ts);
	for (const event of inOrder) {
		const thread = `${event.pid}:${event.tid}`;
		open[thread] = open[thread] || [];
		if (event.ph === 'X') add(event.name, (event.dur || 0) / 1000);
		else if (event.ph === 'B') open[thread].push(event);
		else if (event.ph === 'E') {
			const begun = open[thread].pop();
			if (begun) add(begun.name, (event.ts - begun.ts) / 1000);
		}
	}
	return found;
}

/** The periods in which the wheel is moving: from each key press until `moveMs` later. */
function movingPeriods(events, moveMs) {
	const presses = events
		.filter((event) => event.name === 'EventDispatch' && event.args?.data?.type === 'keydown')
		.map((event) => event.ts / 1000)
		.sort((a, b) => a - b);
	const periods = [];
	for (const start of presses) {
		const last = periods[periods.length - 1];
		if (last && start <= last.end) last.end = start + moveMs;
		else periods.push({start, end: start + moveMs});
	}
	return periods;
}

/** The time between frames the compositor drew while something moved. Between two moves it
 *  rightly draws nothing, which is no frame lost. */
function framesWhileMoving(events, moveMs) {
	const periods = movingPeriods(events, moveMs);
	const times = events
		.filter((event) => event.name === 'DrawFrame')
		.map((event) => event.ts / 1000)
		.sort((a, b) => a - b);
	const deltas = [];
	for (const period of periods) {
		const within = times.filter((time) => time >= period.start && time <= period.end);
		for (let i = 1; i < within.length; i++) deltas.push(within[i] - within[i - 1]);
	}
	return deltas;
}

const framesPerSecond = (deltas) => {
	const total = deltas.reduce((sum, delta) => sum + delta, 0);
	return total > 0 ? round((deltas.length * 1000) / total) : null;
};

/** How fast this TV draws at all: frames per second of a trace in which something moves all the
 *  time and takes no work, so that nothing but the screen holds the frames back. A TV showing
 *  50 Hz draws 50 of the 60 frames Chromium asks for, whatever fluid does. */
export function frameLimit(events) {
	const times = events
		.filter((event) => event.name === 'DrawFrame')
		.map((event) => event.ts / 1000)
		.sort((a, b) => a - b);
	return framesPerSecond(times.slice(1).map((time, i) => time - times[i]));
}

/** The share of the frames this TV could have drawn that were not drawn, in percent. */
export function lostPercent(fps, limit) {
	if (fps === null || limit === null) return null;
	return round(Math.max(0, 100 - (fps * 100) / limit));
}

/** Frames as the compositor drew them, which is what reaches the screen, and the work per key
 *  press. `steps` is how many keys were pressed during the trace; `moveMs` how long the wheel
 *  moves after one, 0 when nothing moves (reduced motion), and then no frames are reported. */
export function summarizeTrace(events, steps, moveMs) {
	const deltas = moveMs > 0 ? framesWhileMoving(events, moveMs) : [];
	const found = totals(events);
	const ms = (name) => (found[name] ? found[name].ms : 0);
	const count = (name) => (found[name] ? found[name].count : 0);
	const perStep = (value) => (steps > 0 ? round(value / steps) : 0);
	const elements = events
		.filter((event) => event.name === 'UpdateLayoutTree' && event.ph === 'E')
		.reduce((sum, event) => sum + (event.args?.elementCount || 0), 0);
	const drawn = events.filter((event) => event.name === 'DrawFrame').length;
	return {
		fps: framesPerSecond(deltas),
		styleRecalcs: perStep(count('UpdateLayoutTree')),
		styleElements: perStep(elements),
		styleMs: perStep(ms('UpdateLayoutTree')),
		layerTreeMs: perStep(ms('UpdateLayerTree')),
		layoutMs: perStep(ms('Layout')),
		paintMs: perStep(ms('Paint')),
		keyEventMs: perStep(ms('EventDispatch')),
		rasterMs: perStep(ms('RasterTask')),
		gpuMsPerFrame: drawn > 0 ? round(ms('GPUTask') / drawn) : 0
	};
}

/** The layers that draw something, the largest first, with the share of the screen each covers
 *  once clipped to it (0 when off the screen). `screen` is the screen's size in the unit the
 *  layers report. */
export function summarizeLayers(layers, screen) {
	const drawn = layers
		.filter((layer) => layer.drawsContent)
		.map((layer) => {
			const x = layer.offsetX || 0;
			const y = layer.offsetY || 0;
			const width = Math.max(0, Math.min(x + layer.width, screen.width) - Math.max(x, 0));
			const height = Math.max(0, Math.min(y + layer.height, screen.height) - Math.max(y, 0));
			return {...layer, screens: (width * height) / (screen.width * screen.height)};
		})
		.sort((a, b) => b.width * b.height - a.width * a.height);
	const covered = drawn.reduce((sum, layer) => sum + layer.screens, 0);
	return {count: drawn.length, screens: Math.round(covered * 100) / 100, layers: drawn};
}
