// Minimal Luna (LS2) bridge. webOS injects `PalmServiceBridge` into every web app;
// each call gets its own bridge object and answers on `onservicecallback`.

import {PlatformError} from '../errors';
import {LUNA_TIMEOUT_MS} from './constants';

interface PalmServiceBridgeInstance {
	onservicecallback: ((message: string) => void) | null;
	call(uri: string, params: string): void;
	cancel?(): void;
}

declare global {
	interface Window {
		PalmServiceBridge?: new () => PalmServiceBridgeInstance;
	}
}

export interface LunaResponse {
	returnValue?: boolean;
	errorCode?: number | string;
	errorText?: string;
	[key: string]: unknown;
}

/** False in a desktop browser, and in Node, where the unit tests run. */
export function isWebOS(): boolean {
	return typeof window !== 'undefined' && typeof window.PalmServiceBridge === 'function';
}

/** One-shot call. Resolves with the parsed payload; rejects with a PlatformError on a
 *  missing bridge, returnValue:false, malformed JSON or timeout. */
export function lunaCall<T extends LunaResponse = LunaResponse>(
	uri: string,
	params: object = {},
	timeoutMs: number = LUNA_TIMEOUT_MS
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const Bridge = typeof window === 'undefined' ? undefined : window.PalmServiceBridge;
		if (!Bridge) {
			reject(new PlatformError('unavailable', `Not running on webOS: ${uri}`));
			return;
		}

		const bridge = new Bridge();
		let settled = false;
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			try {
				bridge.cancel?.();
			} catch {
				/* the call is over either way; a failing cancel changes nothing */
			}
			fn();
		};
		const timer = window.setTimeout(
			() => finish(() => reject(new PlatformError('timeout', `No answer within ${timeoutMs} ms: ${uri}`))),
			timeoutMs
		);

		bridge.onservicecallback = (message) => {
			let data: T;
			try {
				data = JSON.parse(message) as T;
			} catch {
				finish(() => reject(new PlatformError('invalid-reply', `Unreadable answer from ${uri}`)));
				return;
			}
			if (data.returnValue === false) {
				finish(() => reject(new PlatformError('rejected', data.errorText || `${uri} failed`)));
			} else {
				finish(() => resolve(data));
			}
		};

		try {
			bridge.call(uri, JSON.stringify(params));
		} catch (error) {
			finish(() => reject(new PlatformError('unavailable', `${uri}: ${(error as Error).message}`)));
		}
	});
}
