import {describe, expect, it} from 'vitest';
import {dateText, dayName, greeting, timeParts} from './clock';

/** Local time on a fixed day (2026-10-25 is a Sunday). */
const at = (hours: number, minutes = 0) => new Date(2026, 9, 25, hours, minutes);

describe('timeParts', () => {
	it('pads hours and minutes in 24-hour format', () => {
		expect(timeParts(at(7, 5), '24h')).toEqual({time: '07:05', period: ''});
		expect(timeParts(at(23, 59), '24h')).toEqual({time: '23:59', period: ''});
	});

	it('shows midnight and noon as 12 in 12-hour format', () => {
		expect(timeParts(at(0, 5), '12h')).toEqual({time: '12:05', period: 'AM'});
		expect(timeParts(at(12, 0), '12h')).toEqual({time: '12:00', period: 'PM'});
	});

	it('does not pad the hour in 12-hour format', () => {
		expect(timeParts(at(13, 7), '12h')).toEqual({time: '1:07', period: 'PM'});
	});
});

describe('greeting', () => {
	it('switches at noon and at 18:00', () => {
		expect(greeting(at(11, 59))).toBe('Good morning');
		expect(greeting(at(12))).toBe('Good afternoon');
		expect(greeting(at(17, 59))).toBe('Good afternoon');
		expect(greeting(at(18))).toBe('Good evening');
	});
});

describe('date text', () => {
	it('names the day and month', () => {
		expect(dayName(at(10))).toBe('Sunday');
		expect(dateText(at(10))).toBe('25 October');
	});
});
