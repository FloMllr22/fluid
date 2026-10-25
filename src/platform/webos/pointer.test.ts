import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {onForeground} from './pointer';

/** Minimal document that records listeners, so the tests can fire webOS's events. */
let listeners: Record<string, () => void>;
let page: {hidden: boolean};

beforeEach(() => {
	vi.useFakeTimers();
	listeners = {};
	page = {hidden: false};
	vi.stubGlobal('document', {
		get hidden() {
			return page.hidden;
		},
		addEventListener: (type: string, fn: () => void) => {
			listeners[type] = fn;
		},
		removeEventListener: (type: string) => {
			delete listeners[type];
		}
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('onForeground', () => {
	it('counts the two events of one return from the background once', () => {
		const callback = vi.fn();
		onForeground(callback);
		listeners.visibilitychange();
		listeners.webOSRelaunch();
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('reacts to a later relaunch while fluid is already in front', () => {
		const callback = vi.fn();
		onForeground(callback);
		listeners.visibilitychange();
		vi.advanceTimersByTime(5000);
		listeners.webOSRelaunch();
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('ignores the page being hidden', () => {
		const callback = vi.fn();
		onForeground(callback);
		page.hidden = true;
		listeners.visibilitychange();
		expect(callback).not.toHaveBeenCalled();
	});

	it('stops listening when asked to', () => {
		const stop = onForeground(vi.fn());
		stop();
		expect(listeners).toEqual({});
	});
});
