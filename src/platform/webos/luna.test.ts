import {afterEach, describe, expect, it, vi} from 'vitest';
import {PlatformError} from '../errors';
import {isWebOS, lunaCall} from './luna';

/** Stand-in for webOS's PalmServiceBridge. `answer` decides the reply to a call:
 *  a string is delivered asynchronously like on the TV, null never answers, an Error is
 *  thrown by `call`. */
function installBridge(answer: (uri: string, params: string) => string | null | Error) {
	const calls: {uri: string; params: string}[] = [];
	class FakeBridge {
		onservicecallback: ((message: string) => void) | null = null;
		call(uri: string, params: string) {
			calls.push({uri, params});
			const reply = answer(uri, params);
			if (reply instanceof Error) throw reply;
			if (reply !== null) setTimeout(() => this.onservicecallback?.(reply), 0);
		}
		cancel() {}
	}
	vi.stubGlobal('window', {
		PalmServiceBridge: FakeBridge,
		setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
		clearTimeout: (id: number) => clearTimeout(id)
	});
	return calls;
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('isWebOS', () => {
	it('is false without the service bridge (desktop browser, Node)', () => {
		expect(isWebOS()).toBe(false);
	});

	it('is true when webOS provides the bridge', () => {
		installBridge(() => null);
		expect(isWebOS()).toBe(true);
	});
});

describe('lunaCall', () => {
	it('sends the parameters as JSON and resolves with the reply', async () => {
		const calls = installBridge(() => '{"returnValue":true,"exist":true}');
		await expect(lunaCall('luna://test/method', {appId: 'x'})).resolves.toEqual({returnValue: true, exist: true});
		expect(calls).toEqual([{uri: 'luna://test/method', params: '{"appId":"x"}'}]);
	});

	it('rejects with the service error text', async () => {
		installBridge(() => '{"returnValue":false,"errorText":"Denied method call"}');
		const call = lunaCall('luna://test/method');
		await expect(call).rejects.toBeInstanceOf(PlatformError);
		await expect(call).rejects.toMatchObject({code: 'rejected', message: 'Denied method call'});
	});

	it('rejects an unreadable reply', async () => {
		installBridge(() => 'not json');
		await expect(lunaCall('luna://test/method')).rejects.toMatchObject({code: 'invalid-reply'});
	});

	it('gives up after the timeout', async () => {
		vi.useFakeTimers();
		installBridge(() => null);
		const call = lunaCall('luna://test/method', {}, 500);
		vi.advanceTimersByTime(500);
		await expect(call).rejects.toMatchObject({code: 'timeout'});
	});

	it('rejects when the bridge cannot place the call', async () => {
		installBridge(() => new Error('bridge broken'));
		await expect(lunaCall('luna://test/method')).rejects.toMatchObject({code: 'unavailable'});
	});

	it('rejects outside webOS', async () => {
		await expect(lunaCall('luna://test/method')).rejects.toMatchObject({code: 'unavailable'});
	});
});
