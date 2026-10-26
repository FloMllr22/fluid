import {useCallback, useEffect, useRef, useState} from 'preact/hooks';
import {TIMING} from '../config/constants';
import {currentLanguage} from '../i18n';
import {PLACE_QUERY_MIN_LENGTH, type Place, platform} from '../platform';

/** Where a place search stands: nothing typed, too little typed, on its way, or its
 *  answer for `query`. */
export type PlaceSearch =
	| {status: 'idle'}
	| {status: 'short'}
	| {status: 'searching'}
	| {status: 'found'; query: string; places: Place[]}
	| {status: 'none'; query: string}
	| {status: 'failed'; query: string; error: unknown};

/** Searches places for `query` once typing has paused for TIMING.placeSearchDelayMs, or at
 *  once after searchNow() (OK on the keyboard), in the user's language. A query is sent
 *  once; a failed one again on searchNow(). An answer to an older query is dropped. An
 *  empty query sends nothing. */
export function usePlaceSearch(query: string): {search: PlaceSearch; searchNow: () => void} {
	const [search, setSearch] = useState<PlaceSearch>({status: 'idle'});
	const [asked, setAsked] = useState(0);
	const urgent = useRef(false);
	/** the query last sent, and the number of its answer: only that answer counts */
	const sent = useRef({text: '', n: 0});
	const text = query.trim();

	useEffect(() => {
		const delay = urgent.current ? 0 : TIMING.placeSearchDelayMs;
		urgent.current = false;
		if (text.length < PLACE_QUERY_MIN_LENGTH) {
			sent.current = {text: '', n: sent.current.n + 1};
			setSearch({status: text === '' ? 'idle' : 'short'});
			return;
		}
		if (text === sent.current.text) return;
		const timer = window.setTimeout(() => {
			const n = sent.current.n + 1;
			sent.current = {text, n};
			setSearch({status: 'searching'});
			platform.searchPlaces(text, currentLanguage()).then(
				(places) => {
					if (sent.current.n !== n) return;
					setSearch(places.length > 0 ? {status: 'found', query: text, places} : {status: 'none', query: text});
				},
				(error: unknown) => {
					if (sent.current.n !== n) return;
					sent.current = {text: '', n};
					setSearch({status: 'failed', query: text, error});
				}
			);
		}, delay);
		return () => window.clearTimeout(timer);
	}, [text, asked]);

	const searchNow = useCallback(() => {
		urgent.current = true;
		setAsked((n) => n + 1);
	}, []);

	return {search, searchNow};
}
