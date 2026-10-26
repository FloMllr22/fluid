// fluid's only way onto the network. Its one destination is Open-Meteo, for the weather
// and the place search (weather.ts); nothing else in fluid opens a connection (see
// src/architecture.test.ts).

import {PlatformError} from '../errors';

/** How long a request may take before it counts as failed. */
export const HTTP_TIMEOUT_MS = 8000;

/** GETs a JSON answer. Rejects with `offline` when there is no connection or no answer in
 *  time, and with `service` for an HTTP error or an answer that is not JSON. The messages
 *  name only the host, never the query. XMLHttpRequest rather than fetch: Chromium 53 has
 *  no AbortController, so a fetch could not time out. */
export function getJson(url: string, timeoutMs: number = HTTP_TIMEOUT_MS): Promise<unknown> {
	const host = url.split('/')[2] || url;
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open('GET', url);
		request.timeout = timeoutMs;
		request.onload = () => {
			if (request.status < 200 || request.status > 299) {
				reject(new PlatformError('service', `HTTP ${request.status} from ${host}`));
				return;
			}
			let answer: unknown;
			try {
				answer = JSON.parse(request.responseText);
			} catch {
				reject(new PlatformError('service', `Unreadable answer from ${host}`));
				return;
			}
			resolve(answer);
		};
		request.onerror = () => reject(new PlatformError('offline', `No connection to ${host}`));
		request.ontimeout = () => reject(new PlatformError('offline', `No answer within ${timeoutMs} ms from ${host}`));
		request.send();
	});
}
