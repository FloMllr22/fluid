import {describe, expect, it} from 'vitest';
import {type WheelShape, wheelOpacity, wheelPoint, wheelSlot, wheelTurn} from './wheel';

const shape: WheelShape = {radius: 1000, step: 5, gap: 2, reach: 3};

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
