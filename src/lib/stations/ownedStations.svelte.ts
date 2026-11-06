import { gameModel } from '#lib/calc/gameModel';
import { type OwnedProblem, ownedWarnings, parseOwned, STORAGE_KEY, serializeOwned } from './owned';

/**
 * The stations the player has, saved to browser storage on every change.
 * Nothing touches storage until `load()`, as the page is prerendered.
 */
export class OwnedStationStore {
	readonly #ids: string[];
	readonly #getStorage: () => Storage;

	/** Owned station ids, in station-list order. */
	owned: string[] = $state([]);
	problems: OwnedProblem[] = $state([]);

	/** Warning messages for the current problems; reactive through `problems`. */
	get warnings(): string[] {
		return ownedWarnings(this.problems);
	}

	constructor(stationIds: string[], getStorage: () => Storage = () => localStorage) {
		this.#ids = stationIds;
		this.#getStorage = getStorage;
		this.owned = parseOwned(null, stationIds).owned;
	}

	has(id: string): boolean {
		return this.owned.includes(id);
	}

	/** Reads the saved list. Anything unusable is cleaned up, reported and re-saved. */
	load(): void {
		let raw: string | null;
		try {
			raw = this.#getStorage().getItem(STORAGE_KEY);
		} catch {
			this.#blocked();
			return;
		}
		const { owned, problems } = parseOwned(raw, this.#ids);
		this.owned = owned;
		this.problems = problems;
		if (problems.length > 0) this.#save();
	}

	/** Ticks or unticks one station and saves. Ignores unlisted stations. */
	setOwned(id: string, owned: boolean): void {
		if (!this.#ids.includes(id)) return;
		const set = new Set(this.owned);
		if (owned) set.add(id);
		else set.delete(id);
		this.owned = this.#ids.filter((x) => set.has(x));
		this.#save();
	}

	/** Unticks every station, starting ones included, and saves. */
	reset(): void {
		this.owned = [];
		this.#save();
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#save(): void {
		try {
			this.#getStorage().setItem(STORAGE_KEY, serializeOwned(this.owned));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's owned stations, over the stations in the game data. */
export const ownedStations = new OwnedStationStore(gameModel.stations.map((s) => s.id));
