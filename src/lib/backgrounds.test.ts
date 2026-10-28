import {describe, expect, it} from 'vitest';
import type {Background} from '../state/settings';
import {
	backgroundForTheme,
	backgroundFromKey,
	backgroundKey,
	LIGHT_BACKGROUND,
	lightLayer,
	photosFrom,
	shownBackground,
	slideOrder
} from './backgrounds';

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

describe('lightLayer', () => {
	it('is just large enough for the light up to where it has faded out', () => {
		// radii 50 % and 20 %, faded out at 35 % and 14 %
		expect(lightLayer({x: 60, y: 70, rx: 50, ry: 20})).toEqual({left: 25, top: 56, width: 70, height: 28});
	});

	it('may reach beyond the screen', () => {
		expect(lightLayer({x: 84, y: 64, rx: 47, ry: 35})).toEqual({left: 51.1, top: 39.5, width: 65.8, height: 49});
	});
});

describe('background keys', () => {
	it('turn every kind of background into a key and back', () => {
		const backgrounds: Background[] = [
			dark,
			{kind: 'color', color: 'black'},
			{kind: 'color', color: 'blue'},
			{kind: 'color', color: 'dusk'},
			{kind: 'color', color: 'duskMoving'},
			LIGHT_BACKGROUND,
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
		expect(shownBackground({kind: 'color', color: 'blue'}, [], 'dark')).toEqual({kind: 'color', color: 'blue'});
		expect(shownBackground({kind: 'photo', id: 'lake'}, ['dunes', 'lake'], 'black')).toEqual({
			kind: 'photo',
			id: 'lake'
		});
	});

	it('falls back to the default for a photo that is gone', () => {
		expect(shownBackground({kind: 'photo', id: 'gone'}, ['lake'], 'dark')).toEqual(dark);
	});

	it('shows a slideshow only with two photos or more', () => {
		expect(shownBackground({kind: 'slideshow'}, ['dunes', 'lake'], 'dark')).toEqual({kind: 'slideshow'});
		expect(shownBackground({kind: 'slideshow'}, ['lake'], 'dark')).toEqual({kind: 'photo', id: 'lake'});
		expect(shownBackground({kind: 'slideshow'}, [], 'dark')).toEqual(dark);
	});

	it('is always the light one with the light theme', () => {
		for (const background of [dark, {kind: 'photo', id: 'lake'} as Background, {kind: 'slideshow'} as Background])
			expect(shownBackground(background, ['dunes', 'lake'], 'light')).toEqual(LIGHT_BACKGROUND);
	});

	it('is never the light one with a dark theme', () => {
		expect(shownBackground(LIGHT_BACKGROUND, [], 'dark')).toEqual(dark);
		expect(shownBackground(LIGHT_BACKGROUND, [], 'black')).toEqual(dark);
	});
});

describe('backgroundForTheme', () => {
	const black: Background = {kind: 'color', color: 'black'};

	it('lets the plain colour of a dark theme follow it', () => {
		expect(backgroundForTheme(dark, 'black')).toEqual(black);
		expect(backgroundForTheme(black, 'dark')).toEqual(dark);
		expect(backgroundForTheme(dark, 'dark')).toEqual(dark);
	});

	it('leaves any other background as it is', () => {
		for (const background of [
			{kind: 'color', color: 'blue'},
			{kind: 'color', color: 'duskMoving'},
			{kind: 'photo', id: 'lake'},
			{kind: 'slideshow'}
		] as Background[])
			for (const theme of ['dark', 'black', 'light'] as const)
				expect(backgroundForTheme(background, theme)).toEqual(background);
	});

	it('keeps the stored one for later with the light theme', () => {
		expect(backgroundForTheme(black, 'light')).toEqual(black);
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
