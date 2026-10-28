import {describe, expect, it} from 'vitest';
import {BUDGET, frameStats, keyStats, percentile} from './perf';

describe('percentile', () => {
	it('finds the value below which a share of them lie', () => {
		const values = [5, 1, 4, 2, 3];
		expect(percentile(values, 0.5)).toBe(3);
		expect(percentile(values, 1)).toBe(5);
		expect(percentile(values, 0)).toBe(1);
		expect(percentile([10], 0.95)).toBe(10);
	});

	it('has none for no values', () => {
		expect(percentile([], 0.5)).toBeNaN();
	});
});

describe('keyStats', () => {
	it('sums up key presses against the budget', () => {
		const quick = Array.from({length: 100}, (_, i) => 10 + (i % 20));
		expect(keyStats(quick)).toMatchObject({count: 100, maxMs: 29, withinBudget: true});
		const slow = quick.map((ms, i) => (i % 10 === 0 ? BUDGET.keyMs + 40 : ms));
		expect(keyStats(slow).withinBudget).toBe(false);
	});

	it('is not within the budget without measurements', () => {
		expect(keyStats([]).withinBudget).toBe(false);
	});
});

describe('frameStats', () => {
	const frame = 1000 / 60;

	it('counts frames per second and the dropped ones', () => {
		const smooth = Array.from({length: 120}, () => frame);
		expect(frameStats(smooth)).toMatchObject({frames: 120, fps: 60, dropped: 0, withinBudget: true});
		const janky = smooth.slice(0, 100).concat([frame * 3, frame * 2, frame * 4]);
		expect(frameStats(janky)).toMatchObject({dropped: 3, longestMs: 66.7, withinBudget: false});
	});

	it('is empty without frames', () => {
		expect(frameStats([])).toMatchObject({frames: 0, fps: 0, withinBudget: false});
	});
});
