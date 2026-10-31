import {describe, expect, it} from 'vitest';
import {frameLimit, lostPercent, summarizeLayers, summarizeTrace} from './trace.mjs';

const MAIN = {pid: 1, tid: 1};
const COMPOSITOR = {pid: 1, tid: 2};
const key = (ms) => ({
	...MAIN,
	name: 'EventDispatch',
	ph: 'X',
	ts: ms * 1000,
	dur: 2000,
	args: {data: {type: 'keydown'}}
});
const frame = (ms) => ({...COMPOSITOR, name: 'DrawFrame', ph: 'I', ts: ms * 1000});

describe('summarizeTrace', () => {
	it('counts the frames while something moves, not the wait for the next key press', () => {
		const frames = [0, 20, 40, 60].map(frame).concat(frame(5000), frame(5020));
		const trace = summarizeTrace([key(0), key(5000), ...frames], 2, 100);
		expect(trace.fps).toBe(50);
	});

	it('finds a frame lost while something moves', () => {
		const trace = summarizeTrace([key(0), frame(0), frame(20), frame(80)], 1, 100);
		expect(trace.fps).toBeCloseTo(25, 1);
	});

	it('keeps counting while key presses follow each other', () => {
		const trace = summarizeTrace([key(0), key(90), frame(0), frame(90), frame(180)], 2, 100);
		expect(trace.fps).toBeCloseTo(11.1, 1);
	});

	it('reports no frames where nothing moves', () => {
		const trace = summarizeTrace([key(0), frame(0), frame(170)], 1, 0);
		expect(trace.fps).toBeNull();
	});

	it('sums up work that comes complete and as a begin and an end, per key press', () => {
		const trace = summarizeTrace(
			[
				{...MAIN, name: 'UpdateLayoutTree', ph: 'B', ts: 0},
				{...MAIN, name: 'UpdateLayoutTree', ph: 'E', ts: 4000, args: {elementCount: 10}},
				{...MAIN, name: 'UpdateLayoutTree', ph: 'B', ts: 5000},
				{...MAIN, name: 'UpdateLayoutTree', ph: 'E', ts: 11000, args: {elementCount: 30}},
				{...MAIN, name: 'Paint', ph: 'X', ts: 12000, dur: 3000}
			],
			2,
			500
		);
		expect(trace.styleRecalcs).toBe(1);
		expect(trace.styleElements).toBe(20);
		expect(trace.styleMs).toBe(5);
		expect(trace.paintMs).toBe(1.5);
	});

	it('pairs a begin with its end on the same thread', () => {
		const trace = summarizeTrace(
			[
				{...MAIN, name: 'Layout', ph: 'B', ts: 0},
				{...COMPOSITOR, name: 'Other', ph: 'B', ts: 1000},
				{...COMPOSITOR, name: 'Other', ph: 'E', ts: 1500},
				{...MAIN, name: 'Layout', ph: 'E', ts: 2000}
			],
			1,
			500
		);
		expect(trace.layoutMs).toBe(2);
	});

	it('divides the graphics chip’s work by the frames drawn', () => {
		const trace = summarizeTrace(
			[frame(0), frame(16), {pid: 9, tid: 9, name: 'GPUTask', ph: 'X', ts: 0, dur: 30000}],
			1,
			500
		);
		expect(trace.gpuMsPerFrame).toBe(15);
	});
});

describe('frameLimit', () => {
	it('is the rate of all the frames drawn', () => {
		expect(frameLimit([0, 17, 33, 50, 67, 100].map(frame))).toBe(50);
	});

	it('is unknown without frames', () => {
		expect(frameLimit([frame(0)])).toBeNull();
	});
});

describe('lostPercent', () => {
	it('compares with what the TV can draw, not with 60 fps', () => {
		expect(lostPercent(50, 50)).toBe(0);
		expect(lostPercent(48, 50)).toBe(4);
	});

	it('is never below nothing, and unknown without numbers', () => {
		expect(lostPercent(50.3, 50)).toBe(0);
		expect(lostPercent(null, 50)).toBeNull();
	});
});

describe('summarizeLayers', () => {
	const screen = {width: 100, height: 100};
	const layer = (width, height, more = {}) => ({width, height, drawsContent: true, ...more});

	it('counts only what draws, the largest first', () => {
		const {count, layers} = summarizeLayers(
			[layer(10, 10), layer(50, 50), layer(90, 90, {drawsContent: false})],
			screen
		);
		expect(count).toBe(2);
		expect(layers[0].width).toBe(50);
	});

	it('adds up what covers the screen, clipped to it', () => {
		const inside = layer(100, 100);
		const half = layer(100, 100, {offsetX: 50});
		const away = layer(100, 100, {offsetY: 200});
		expect(summarizeLayers([inside, half, away], screen).screens).toBe(1.5);
	});
});
