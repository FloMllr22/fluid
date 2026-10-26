import {describe, expect, it} from 'vitest';
import type {Background} from '../state/settings';
import {backgroundFromKey, backgroundKey, photosFrom, shownBackground, slideOrder} from './backgrounds';

const dark: Background = {kind: 'color', color: 'dark'};

describe('photosFrom', () => {
	it('pairs each photo with its thumbnail, sorted by ID', () => {
		const full = {
			'../assets/backgrounds/lake.jpg': '/lake.123.jpg',
			'../assets/backgrounds/dunes.jpg': '/dunes.456.jpg'
		};
		const thumbs = {'../assets/backgrounds/lake.thumb.jpg': '/lake.thumb.789.jpg'};
		expect(photosFrom(full, thumbs)).toEqual([
			{id: 'dunes', url: '/dunes.456.jpg', thumbUrl: '/dunes.456.jpg'},
			{id: 'lake', url: '/lake.123.jpg', thumbUrl: '/lake.thumb.789.jpg'}
		]);
	});

	it('finds nothing when no photos are bundled', () => {
		expect(photosFrom({}, {})).toEqual([]);
	});
});

describe('background keys', () => {
	it('turn every kind of background into a key and back', () => {
		const backgrounds: Background[] = [
			dark,
			{kind: 'color', color: 'black'},
			{kind: 'color', color: 'blue'},
			{kind: 'color', color: 'dusk'},
			{kind: 'photo', id: 'lake'},
			{kind: 'slideshow'}
		];
		for (const background of backgrounds) expect(backgroundFromKey(backgroundKey(background))).toEqual(background);
	});

	it('know no other keys', () => {
		for (const key of ['', 'color:pink', 'photo:', 'colour:dark', 'com.example.movies'])
			expect(backgroundFromKey(key), key).toBeNull();
	});
});

describe('shownBackground', () => {
	it('shows a colour, and a photo that is there, as they are', () => {
		expect(shownBackground({kind: 'color', color: 'blue'}, [])).toEqual({kind: 'color', color: 'blue'});
		expect(shownBackground({kind: 'photo', id: 'lake'}, ['dunes', 'lake'])).toEqual({kind: 'photo', id: 'lake'});
	});

	it('falls back to the default for a photo that is gone', () => {
		expect(shownBackground({kind: 'photo', id: 'gone'}, ['lake'])).toEqual(dark);
	});

	it('shows a slideshow only with two photos or more', () => {
		expect(shownBackground({kind: 'slideshow'}, ['dunes', 'lake'])).toEqual({kind: 'slideshow'});
		expect(shownBackground({kind: 'slideshow'}, ['lake'])).toEqual({kind: 'photo', id: 'lake'});
		expect(shownBackground({kind: 'slideshow'}, [])).toEqual(dark);
	});
});

describe('slideOrder', () => {
	const ids = ['a', 'b', 'c', 'd'];
	/** a fixed sequence instead of Math.random */
	const sequence =
		(...values: number[]) =>
		() =>
			values.shift() ?? 0;

	it('has every photo exactly once', () => {
		for (let round = 0; round < 20; round++) expect(slideOrder(ids, undefined).slice().sort()).toEqual(ids);
	});

	it('shuffles', () => {
		expect(slideOrder(ids, undefined, sequence(0, 0, 0))).toEqual(['b', 'c', 'd', 'a']);
		expect(slideOrder(ids, undefined, sequence(0.99, 0.99, 0.99))).toEqual(ids);
	});

	it('never starts with the photo on screen', () => {
		expect(slideOrder(ids, 'a', sequence(0.99, 0.99, 0.99))).toEqual(['b', 'c', 'd', 'a']);
		for (let round = 0; round < 50; round++) expect(slideOrder(ids, 'c')[0]).not.toBe('c');
	});

	it('copes with a single photo', () => {
		expect(slideOrder(['a'], 'a')).toEqual(['a']);
	});

	it('never mutates its input', () => {
		slideOrder(ids, undefined);
		expect(ids).toEqual(['a', 'b', 'c', 'd']);
	});
});
