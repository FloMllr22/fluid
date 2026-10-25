import {describe, expect, it} from 'vitest';
import {favoritesFirst, moveItem, setFavorite, toggleId} from './order';

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

describe('toggleId', () => {
	it('appends a missing ID', () => {
		expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
	});

	it('removes a present ID', () => {
		expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
	});

	it('never mutates its input', () => {
		const ids = ['a'];
		toggleId(ids, 'b');
		expect(ids).toEqual(['a']);
	});
});

describe('favoritesFirst', () => {
	it('puts the favourites first, each group in its own order', () => {
		expect(favoritesFirst(['a', 'b', 'c', 'd'], ['d', 'b'])).toEqual(['b', 'd', 'a', 'c']);
	});

	it('ignores favourites that are not in the row', () => {
		expect(favoritesFirst(['a', 'b'], ['gone'])).toEqual(['a', 'b']);
	});
});

describe('setFavorite', () => {
	it('places a new favourite after the existing ones', () => {
		expect(setFavorite(['f', 'a', 'b', 'c'], ['f'], 'c', true)).toEqual({
			order: ['f', 'c', 'a', 'b'],
			favoriteIds: ['f', 'c']
		});
	});

	it('places a former favourite first among the others', () => {
		expect(setFavorite(['f', 'g', 'a', 'b'], ['f', 'g'], 'f', false)).toEqual({
			order: ['g', 'f', 'a', 'b'],
			favoriteIds: ['g']
		});
	});

	it('does not add a favourite twice', () => {
		expect(setFavorite(['f', 'a'], ['f'], 'f', true).favoriteIds).toEqual(['f']);
	});

	it('leaves favourites that are not in the row alone', () => {
		expect(setFavorite(['a', 'b'], ['hidden'], 'b', true)).toEqual({order: ['b', 'a'], favoriteIds: ['hidden', 'b']});
	});
});
