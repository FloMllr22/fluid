import {describe, expect, it} from 'vitest';
import {valueKey} from './values';

describe('valueKey', () => {
	it('steps with ← and →, up to the last value', () => {
		expect(valueKey(1, 3, 'left')).toBe(0);
		expect(valueKey(1, 3, 'right')).toBe(2);
		expect(valueKey(2, 3, 'right')).toBeNull();
	});

	it('leaves for the tabs with ← on the first value', () => {
		expect(valueKey(0, 3, 'left')).toBe('exit');
	});

	it('goes on with OK, round to the first after the last', () => {
		expect(valueKey(0, 3, 'enter')).toBe(1);
		expect(valueKey(2, 3, 'enter')).toBe(0);
	});

	it('turns a switch on and off', () => {
		expect(valueKey(0, 2, 'enter')).toBe(1);
		expect(valueKey(1, 2, 'enter')).toBe(0);
		expect(valueKey(1, 2, 'left')).toBe(0);
		expect(valueKey(0, 2, 'left')).toBe('exit');
		expect(valueKey(0, 2, 'right')).toBe(1);
	});

	it('has nothing to change with a single value', () => {
		expect(valueKey(0, 1, 'enter')).toBeNull();
		expect(valueKey(0, 1, 'right')).toBeNull();
	});
});
