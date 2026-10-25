import {describe, expect, it} from 'vitest';
import {moveItem} from './order';

describe('moveItem', () => {
	const list = ['a', 'b', 'c', 'd'];

	it('moves an item forwards', () => {
		expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
	});

	it('moves an item backwards', () => {
		expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
	});

	it('clamps indices outside the list', () => {
		expect(moveItem(list, -5, 99)).toEqual(['b', 'c', 'd', 'a']);
	});

	it('returns an unchanged copy when nothing moves', () => {
		const result = moveItem(list, 1, 1);
		expect(result).toEqual(list);
		expect(result).not.toBe(list);
	});

	it('never mutates its input', () => {
		moveItem(list, 0, 3);
		expect(list).toEqual(['a', 'b', 'c', 'd']);
	});
});
