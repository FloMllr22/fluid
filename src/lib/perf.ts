// The performance budgets (PLAN.md, section 6) and how measurements are summed up against
// them. The measuring itself is in src/perf.ts.

export const BUDGET = {
	/** from the start of fluid to its first frame (drawn from what is stored) */
	firstFrameMs: 1000,
	/** from a key press to the frame that shows its effect */
	keyMs: 50,
	/** while something moves */
	fps: 60
} as const;

/** A frame took too long when it lasted this much longer than one at 60 fps. */
const DROPPED = 1.5 * (1000 / 60);

/** The value below which `share` (0–1) of the values lie; NaN for none. */
export function percentile(values: number[], share: number): number {
	if (values.length === 0) return Number.NaN;
	const sorted = values.slice().sort((a, b) => a - b);
	const at = Math.min(sorted.length - 1, Math.max(0, Math.ceil(share * sorted.length) - 1));
	return sorted[at];
}

const round = (n: number) => Math.round(n * 10) / 10;

export interface KeyStats {
	count: number;
	medianMs: number;
	p95Ms: number;
	maxMs: number;
	/** 95 % of the key presses showed within the budget */
	withinBudget: boolean;
}

/** Key presses, each the time until the frame after it. */
export function keyStats(samples: number[]): KeyStats {
	const p95 = percentile(samples, 0.95);
	return {
		count: samples.length,
		medianMs: round(percentile(samples, 0.5)),
		p95Ms: round(p95),
		maxMs: round(samples.length ? Math.max(...samples) : Number.NaN),
		withinBudget: samples.length > 0 && p95 <= BUDGET.keyMs
	};
}

export interface FrameStats {
	frames: number;
	fps: number;
	/** frames that took 1.5 times as long as one at 60 fps, or longer */
	dropped: number;
	longestMs: number;
	p95Ms: number;
	/** at most one frame in a hundred dropped */
	withinBudget: boolean;
}

/** Frames, each by the time since the one before. */
export function frameStats(deltas: number[]): FrameStats {
	const total = deltas.reduce((sum, d) => sum + d, 0);
	const dropped = deltas.filter((d) => d >= DROPPED).length;
	return {
		frames: deltas.length,
		fps: total > 0 ? round((deltas.length * 1000) / total) : 0,
		dropped,
		longestMs: round(deltas.length ? Math.max(...deltas) : 0),
		p95Ms: round(percentile(deltas, 0.95)),
		withinBudget: deltas.length > 0 && dropped <= deltas.length / 100
	};
}
