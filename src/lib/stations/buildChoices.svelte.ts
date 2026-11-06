import { gameModel } from '#lib/calc/gameModel';

/** localStorage key for the stations chosen with "Build this". */
export const STORAGE_KEY = 'gk2calc.buildChoices';

const FORMAT_VERSION = 1;

/** Something in the saved data, or the storage itself, that couldn't be used. */
export type BuildProblem =
	| { kind: 'unknownStation'; id: string }
	| { kind: 'unreadable' }
	| { kind: 'storageBlocked' };

/** Saved text (or null) to the chosen station ids, keeping only buildable ones, plus problems. */
export function parseBuildChoices(
	raw: string | null,
	buildable: string[]
): { ids: string[]; problems: BuildProblem[] } {
	if (raw === null) return { ids: [], problems: [] };
	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { ids: [], problems: [{ kind: 'unreadable' }] };
	}
	const value = saved as { version?: unknown; ids?: unknown } | null;
	if (
		typeof value !== 'object' ||
		value === null ||
		value.version !== FORMAT_VERSION ||
		!Array.isArray(value.ids) ||
		!value.ids.every((id) => typeof id === 'string')
	) {
		return { ids: [], problems: [{ kind: 'unreadable' }] };
	}
	const known = new Set(buildable);
	const ids = [...new Set(value.ids as string[])];
	return {
		ids: ids.filter((id) => known.has(id)),
		problems: ids.filter((id) => !known.has(id)).map((id) => ({ kind: 'unknownStation', id }))
	};
}

export function serializeBuildChoices(ids: string[]): string {
	return JSON.stringify({ version: FORMAT_VERSION, ids });
}

/** One message per kind of problem, in a fixed order. */
export function buildWarnings(problems: BuildProblem[]): string[] {
	const messages: string[] = [];
	const unknown = problems.filter((p) => p.kind === 'unknownStation').map((p) => p.id);
	if (unknown.length > 0) {
		messages.push(
			`Some stations chosen to build can no longer be built and were dropped: ${unknown.join(', ')}.`
		);
	}
	if (problems.some((p) => p.kind === 'unreadable')) {
		messages.push('Saved "Build this" choices couldn\'t be read, so none are chosen.');
	}
	if (problems.some((p) => p.kind === 'storageBlocked')) {
		messages.push(
			'Your browser is blocking storage, so "Build this" choices won\'t be kept after a reload.'
		);
	}
	return messages;
}

/**
 * Stations the player chose to build ("Build this"), saved to browser storage on every change.
 * Nothing touches storage until `load()`, as the page is prerendered.
 */
export class BuildChoices {
	readonly #buildable: string[];
	readonly #getStorage: () => Storage;

	ids: string[] = $state([]);
	problems: BuildProblem[] = $state([]);

	get warnings(): string[] {
		return buildWarnings(this.problems);
	}

	constructor(buildable: string[], getStorage: () => Storage = () => localStorage) {
		this.#buildable = buildable;
		this.#getStorage = getStorage;
	}

	/** Reads the saved choices. Anything unusable is dropped, reported and re-saved. */
	load(): void {
		let raw: string | null;
		try {
			raw = this.#getStorage().getItem(STORAGE_KEY);
		} catch {
			this.#blocked();
			return;
		}
		const { ids, problems } = parseBuildChoices(raw, this.#buildable);
		this.ids = ids;
		this.problems = problems;
		if (problems.length > 0) this.#save();
	}

	has(id: string): boolean {
		return this.ids.includes(id);
	}

	/** Chooses or unchooses a station and saves. Ignores stations that can't be built. */
	set(id: string, build: boolean): void {
		if (!this.#buildable.includes(id)) return;
		if (build === this.has(id)) return;
		this.ids = build ? [...this.ids, id] : this.ids.filter((x) => x !== id);
		this.#save();
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#save(): void {
		try {
			this.#getStorage().setItem(STORAGE_KEY, serializeBuildChoices(this.ids));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's build choices, over the stations that have a build cost. */
export const buildChoices = new BuildChoices(
	gameModel.stations.filter((s) => s.cost.kind === 'build').map((s) => s.id)
);
