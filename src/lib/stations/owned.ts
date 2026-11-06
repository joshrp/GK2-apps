/** localStorage key for the stations the player has. */
export const STORAGE_KEY = 'gk2calc.ownedStations';

const FORMAT_VERSION = 1;

/** Ticked when nothing is saved yet: what the game starts with. Reset unticks these too. */
export const STARTING_STATIONS: readonly string[] = [
	'sawhorse',
	'woodworking_workbench_1',
	'wooden_anvil',
	'firewood_shed_1',
	'firewood_shed_kitchen_1',
	'kitchen_oven',
	'kitchen_table',
	'compost_pile_1'
];

/** Something in the saved data, or the storage itself, that couldn't be used. */
export type OwnedProblem =
	| { kind: 'unknownStation'; id: string }
	| { kind: 'unreadable' }
	| { kind: 'storageBlocked' };

/**
 * Saved text (or null when nothing is saved) to the owned station ids, in `stationIds` order,
 * plus the problems found. Nothing saved means the starting stations.
 */
export function parseOwned(
	raw: string | null,
	stationIds: string[]
): { owned: string[]; problems: OwnedProblem[] } {
	const known = new Set(stationIds);
	if (raw === null)
		return { owned: stationIds.filter((id) => STARTING_STATIONS.includes(id)), problems: [] };

	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { owned: [], problems: [{ kind: 'unreadable' }] };
	}
	const value = saved as { version?: unknown; owned?: unknown } | null;
	if (
		typeof value !== 'object' ||
		value === null ||
		value.version !== FORMAT_VERSION ||
		!Array.isArray(value.owned) ||
		!value.owned.every((id) => typeof id === 'string')
	) {
		return { owned: [], problems: [{ kind: 'unreadable' }] };
	}

	const savedIds = new Set(value.owned as string[]);
	const problems: OwnedProblem[] = [...savedIds]
		.filter((id) => !known.has(id))
		.map((id) => ({ kind: 'unknownStation', id }));
	return { owned: stationIds.filter((id) => savedIds.has(id)), problems };
}

/** Owned station ids to the saved text format. */
export function serializeOwned(owned: string[]): string {
	return JSON.stringify({ version: FORMAT_VERSION, owned });
}

/** One message per kind of problem, in a fixed order. */
export function ownedWarnings(problems: OwnedProblem[]): string[] {
	const messages: string[] = [];
	const unknown = problems.filter((p) => p.kind === 'unknownStation').map((p) => p.id);
	if (unknown.length > 0) {
		messages.push(
			`Some saved stations are no longer listed and were dropped: ${unknown.join(', ')}.`
		);
	}
	if (problems.some((p) => p.kind === 'unreadable')) {
		messages.push("Saved stations couldn't be read, so none are ticked.");
	}
	if (problems.some((p) => p.kind === 'storageBlocked')) {
		messages.push(
			"Your browser is blocking storage, so your stations won't be kept after a reload."
		);
	}
	return messages;
}
