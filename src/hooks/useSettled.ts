import {useEffect, useState} from 'preact/hooks';

/** `value` once it has stayed the same for `ms`: what follows the wheel's app (its colour)
 *  waits until the wheel stands still, so that turning it quickly draws nothing anew. */
export function useSettled<T>(value: T, ms: number): T {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const timer = window.setTimeout(() => setSettled(value), ms);
		return () => window.clearTimeout(timer);
	}, [value, ms]);
	return settled;
}
