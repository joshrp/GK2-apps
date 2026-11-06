import type { Target } from '#lib/calc/model';

/** Most matches the picker shows at once. */
export const MAX_RESULTS = 20;

/** localStorage key for the "Show hidden" option. */
export const SHOW_HIDDEN_KEY = 'gk2calc.showHidden';

/**
 * Targets whose name contains the query (any case), names starting with it first, then by name.
 * Hidden targets only when `showHidden`. An empty query matches nothing.
 */
export function searchTargets(
	targets: Target[],
	query: string,
	showHidden: boolean,
	limit = MAX_RESULTS
): Target[] {
	const q = query.trim().toLowerCase();
	if (q === '') return [];
	const starts: Target[] = [];
	const contains: Target[] = [];
	for (const t of targets) {
		if (t.hidden && !showHidden) continue;
		const at = t.name.toLowerCase().indexOf(q);
		if (at === 0) starts.push(t);
		else if (at > 0) contains.push(t);
	}
	return [...starts, ...contains].slice(0, limit);
}

/** A whole number of 1 or more typed into a quantity input, else null. */
export function parseQuantity(text: string): number | null {
	const trimmed = text.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const n = Number(trimmed);
	return n >= 1 ? n : null;
}
