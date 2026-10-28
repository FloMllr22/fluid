// Measures fluid against its performance budgets on the TV, read in the TV's Web Inspector
// (http://<TV-IP>:9998, the console of fluid's page):
//
//   fluidPerf.report()     the first frame, the apps on screen, and how quickly key presses
//                          showed (the last 200)
//   fluidPerf.frames(10)   the frames of the next 10 s while fluid is used: fps, dropped
//                          frames, the longest one
//
// Nothing is sent anywhere: the numbers stay in memory until read. Watching costs one
// frame callback per key press; frames are only counted while frames() runs.

import {BUDGET, type FrameStats, frameStats, type KeyStats, keyStats} from './lib/perf';

declare global {
	interface Window {
		fluidPerf?: {report: () => Report; frames: (seconds?: number) => Promise<FrameStats>};
	}
}

interface Report {
	/** ms from the start of fluid to its first frame */
	firstFrameMs: number | undefined;
	/** ms to the frame with the apps read from the TV */
	appsShownMs: number | undefined;
	firstFrameWithinBudget: boolean;
	keys: KeyStats;
}

/** Key presses kept for the report. */
const KEPT_KEYS = 200;

const marks: Record<string, number> = {};
const keys: number[] = [];

/** Notes when the frame after now is drawn, the first time only. */
export function markFrame(name: 'firstFrame' | 'appsShown'): void {
	if (name in marks) return;
	requestAnimationFrame(() => {
		if (!(name in marks)) marks[name] = Math.round(performance.now());
	});
}

/** Starts watching the key presses, and offers fluidPerf in the console. */
export function startPerf(): void {
	window.addEventListener('keydown', onKey, true);
	window.fluidPerf = {report, frames};
}

/** From the key press to the frame that shows its effect: the frame callback comes before
 *  it is drawn, the timeout after. The press's own time stamp also counts the wait before
 *  fluid got it, where the TV gives one that makes sense. */
function onKey(event: KeyboardEvent): void {
	const now = performance.now();
	const start = event.timeStamp > 0 && event.timeStamp <= now ? event.timeStamp : now;
	requestAnimationFrame(() =>
		window.setTimeout(() => {
			keys.push(performance.now() - start);
			if (keys.length > KEPT_KEYS) keys.shift();
		}, 0)
	);
}

function report(): Report {
	const result: Report = {
		firstFrameMs: marks.firstFrame,
		appsShownMs: marks.appsShown,
		firstFrameWithinBudget: marks.firstFrame !== undefined && marks.firstFrame <= BUDGET.firstFrameMs,
		keys: keyStats(keys)
	};
	console.log('fluid performance', JSON.stringify(result, null, 2));
	return result;
}

function frames(seconds = 10): Promise<FrameStats> {
	return new Promise((resolve) => {
		const deltas: number[] = [];
		let last = 0;
		let end = 0;
		const tick = (time: number) => {
			if (end === 0) end = time + seconds * 1000;
			else deltas.push(time - last);
			last = time;
			if (time < end) requestAnimationFrame(tick);
			else {
				const stats = frameStats(deltas);
				console.log('fluid frames', JSON.stringify(stats, null, 2));
				resolve(stats);
			}
		};
		requestAnimationFrame(tick);
	});
}
