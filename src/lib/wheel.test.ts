import {describe, expect, it} from 'vitest';
import {
	type WheelBase,
	type WheelShape,
	type WheelSlot,
	wheelChange,
	wheelDrawn,
	wheelLayout,
	wheelOpacity,
	wheelPoint,
	wheelSeen,
	wheelSlot,
	wheelTurn
} from './wheel';

const shape: WheelShape = {radius: 1000, step: 5, gap: 2, reach: 3};

describe('wheelSeen and wheelDrawn', () => {
	it('sees the apps within reach, and draws one more on either side', () => {
		expect([3, -3].map((offset) => wheelSeen(offset, 3))).toEqual([true, true]);
		expect([4, -4].map((offset) => wheelSeen(offset, 3))).toEqual([false, false]);
		expect([4, -4].map((offset) => wheelDrawn(offset, 3))).toEqual([true, true]);
		expect([5, -5].map((offset) => wheelDrawn(offset, 3))).toEqual([false, false]);
	});
});

describe('wheelChange', () => {
	const reach = 3;
	/** The apps a, b, c … when the wheel goes from one turn to another. */
	const change = (count: number, from: number, to: number) => {
		const keys = Array.from({length: count}, (_, i) => String.fromCharCode(97 + i));
		const placed = new Map<string, WheelSlot>(keys.map((key, i) => [key, wheelSlot(i, count, from)]));
		const slots = keys.map((_, i) => wheelSlot(i, count, to));
		return wheelChange(keys, slots, placed, to - from, reach);
	};

	it('needs nothing while rows just slide along a long list, however far apps come round', () => {
		expect(change(30, 0, 1)).toEqual({entering: [], ghosts: []});
		expect(change(30, 14, 15)).toEqual({entering: [], ghosts: []});
	});

	it('has an app that comes round in sight fade in at its new place and its old row fade out', () => {
		// five apps: a turn moves the app at the far end (offset -2) round to the other end (2)
		const {entering, ghosts} = change(5, 0, 1);
		expect(entering).toEqual(['d']);
		expect(ghosts).toEqual([{index: 3, lap: -1, offset: -3}]);
	});

	it('fades an app in, and another out, when a click turns the wheel past the rows waiting', () => {
		const {entering, ghosts} = change(30, 0, 3);
		// the apps that end up seen below, from places without a row
		expect(entering).toEqual(['f', 'g']);
		// the apps seen above that have to go without a row to slide to
		expect(ghosts).toEqual([
			{index: 27, lap: -1, offset: -6},
			{index: 28, lap: -1, offset: -5}
		]);
	});

	it('needs nothing the first time, with no app placed yet', () => {
		const slots = [wheelSlot(0, 3, 0), wheelSlot(1, 3, 0), wheelSlot(2, 3, 0)];
		expect(wheelChange(['a', 'b', 'c'], slots, new Map(), 0, reach)).toEqual({entering: [], ghosts: []});
	});

	it('has no new row fade in for an app that reaches the place where rows wait, unseen', () => {
		const placed = new Map<string, WheelSlot>([['a', {offset: 9, lap: 0}]]);
		expect(wheelChange(['a'], [{offset: 4, lap: 0}], placed, 5, reach)).toEqual({entering: [], ghosts: []});
	});
});

describe('wheelTurn', () => {
	it('turns the shortest way to the selected app', () => {
		expect(wheelTurn(0, 11, 3)).toBe(3);
		expect(wheelTurn(0, 11, 10)).toBe(-1);
		expect(wheelTurn(3, 11, 1)).toBe(1);
	});

	it('goes on past the ends of the list, round and round', () => {
		expect(wheelTurn(10, 11, 0)).toBe(11);
		expect(wheelTurn(11, 11, 1)).toBe(12);
		expect(wheelTurn(-1, 11, 9)).toBe(-2);
	});

	it('turns forward to the app exactly half way round', () => {
		expect(wheelTurn(0, 10, 5)).toBe(5);
		expect(wheelTurn(0, 2, 1)).toBe(1);
		expect(wheelTurn(1, 2, 0)).toBe(2);
	});

	it('stays put when nothing changes, and with one app or none', () => {
		expect(wheelTurn(14, 11, 3)).toBe(14);
		expect(wheelTurn(4, 1, 0)).toBe(4);
		expect(wheelTurn(4, 0, 0)).toBe(4);
	});

	it('stays near the last turn when the number of apps changes', () => {
		expect(wheelTurn(13, 5, 2)).toBe(12);
	});
});

describe('wheelSlot', () => {
	it('places the apps up to half way round either side of the middle', () => {
		expect(wheelSlot(0, 11, 0)).toEqual({offset: 0, lap: 0});
		expect(wheelSlot(5, 11, 0)).toEqual({offset: 5, lap: 0});
		expect(wheelSlot(6, 11, 0)).toEqual({offset: -5, lap: -1});
		expect(wheelSlot(10, 11, 0)).toEqual({offset: -1, lap: -1});
	});

	it('puts the app exactly half way round below', () => {
		expect(wheelSlot(5, 10, 0)).toEqual({offset: 5, lap: 0});
	});

	it('counts a lap each time an app comes round', () => {
		expect(wheelSlot(0, 11, 11)).toEqual({offset: 0, lap: 1});
		// the first app leaves the top as the wheel turns on and comes in again at the foot
		expect(wheelSlot(0, 11, 5).lap).toBe(0);
		expect(wheelSlot(0, 11, 6)).toEqual({offset: 5, lap: 1});
	});
});

describe('wheelPoint', () => {
	it('puts the selected app on the right-most point', () => {
		expect(wheelPoint(0, shape)).toEqual({x: 0, y: 0});
	});

	it('runs the others up and down along the circle, curving away to the left', () => {
		const below = wheelPoint(1, shape);
		const above = wheelPoint(-1, shape);
		expect(below.y).toBeCloseTo(1000 * Math.sin((7 * Math.PI) / 180));
		expect(below.x).toBeCloseTo(1000 * (Math.cos((7 * Math.PI) / 180) - 1));
		expect(above).toEqual({x: below.x, y: -below.y});
		expect(wheelPoint(2, shape).x).toBeLessThan(below.x);
		expect(wheelPoint(2, shape).y).toBeGreaterThan(below.y);
	});

	it('keeps the apps beyond reach one place further out', () => {
		expect(wheelPoint(9, shape)).toEqual(wheelPoint(4, shape));
		expect(wheelPoint(-9, shape)).toEqual(wheelPoint(-4, shape));
	});
});

describe('wheelOpacity', () => {
	it('fades the apps the further out they are, hiding those beyond reach', () => {
		expect(wheelOpacity(0, 5, 0.9, 0.06)).toBe(1);
		expect(wheelOpacity(1, 5, 0.9, 0.06)).toBe(0.84);
		expect(wheelOpacity(-5, 5, 0.9, 0.06)).toBe(0.6);
		expect(wheelOpacity(6, 5, 0.9, 0.06)).toBe(0);
	});
});

describe('wheelLayout', () => {
	// the wheel as the tokens have it
	const base: WheelBase = {
		shape: {radius: 1100, step: 4.66, gap: 2, reach: 5},
		icon: 76,
		iconRadius: 21,
		rowHeight: 96,
		gap: 40,
		gapRest: 26,
		safeX: 96,
		screenHeight: 1080
	};
	/** how far from the middle the outermost icon reaches */
	const outermost = (layout: ReturnType<typeof wheelLayout>) =>
		wheelPoint(layout.shape.reach, layout.shape).y + layout.icon / 2;

	it('is the wheel as it is at the usual size', () => {
		const layout = wheelLayout(1, base);
		expect(layout.shape).toEqual(base.shape);
		expect(layout).toMatchObject({icon: 76, iconRadius: 21, rowHeight: 96, gap: 40, gapRest: 26, centreY: 540});
		// the outermost icons on the safe area
		expect(layout.centreX + layout.icon / -2 + wheelPoint(5, base.shape).x).toBeCloseTo(96, 0);
	});

	it('grows the icons, their neighbours and the room around them, but shows fewer', () => {
		const large = wheelLayout(1.15, base);
		expect(large).toMatchObject({icon: 87, rowHeight: 110, gap: 46, gapRest: 30});
		expect(large.shape.step).toBeCloseTo(4.66 * 1.15);
		expect(large.shape.reach).toBe(4);
	});

	it('shrinks them, and shows more', () => {
		const small = wheelLayout(0.85, base);
		expect(small).toMatchObject({icon: 65, rowHeight: 82, gap: 34, gapRest: 22});
		expect(small.shape.reach).toBe(6);
	});

	it('keeps the outermost icon as far in as at the usual size, on the safe area', () => {
		const limit = outermost(wheelLayout(1, base));
		for (const scale of [0.85, 1, 1.15]) {
			const layout = wheelLayout(scale, base);
			expect(outermost(layout), String(scale)).toBeLessThanOrEqual(limit + 0.5);
			const left = layout.centreX - layout.icon / 2 + wheelPoint(layout.shape.reach, layout.shape).x;
			expect(left, String(scale)).toBeCloseTo(96, 0);
		}
	});
});
