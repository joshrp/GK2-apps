import { gk2Data } from '#lib/data/gk2';
import {
	isValidLevel,
	type LevelProblem,
	type PerkLevels,
	parseLevels,
	STORAGE_KEY,
	serializeLevels,
	warningMessages,
	zeroLevels
} from './levels';
import { listPerks, type PerkDef } from './perks';

/**
 * The character's perk levels, saved to browser storage on every change.
 * Nothing touches storage until `load()`, as the page is prerendered.
 */
export class PerkLevelStore {
	readonly #ids: string[];
	readonly #names: Record<string, string>;
	readonly #getStorage: () => Storage;

	levels: PerkLevels = $state({});
	problems: LevelProblem[] = $state([]);

	/** Warning messages for the current problems; reactive through `problems`. */
	get warnings(): string[] {
		return warningMessages(this.problems, this.#names);
	}

	constructor(perks: PerkDef[], getStorage: () => Storage = () => localStorage) {
		this.#ids = perks.map((p) => p.id);
		this.#names = Object.fromEntries(perks.map((p) => [p.id, p.name]));
		this.#getStorage = getStorage;
		this.levels = zeroLevels(this.#ids);
	}

	/** Reads the saved levels. Anything unusable is cleaned up, reported and re-saved. */
	load(): void {
		let raw: string | null;
		try {
			raw = this.#getStorage().getItem(STORAGE_KEY);
		} catch {
			this.#blocked();
			return;
		}
		const { levels, problems } = parseLevels(raw, this.#ids);
		this.levels = levels;
		this.problems = problems;
		if (problems.length > 0) this.#save();
	}

	/** Sets one perk's level and saves. Ignores unlisted perks and invalid levels. */
	setLevel(id: string, level: number): void {
		if (!this.#ids.includes(id) || !isValidLevel(level)) return;
		this.levels[id] = level;
		this.#save();
	}

	/** Sets every perk to 0 and saves. */
	reset(): void {
		this.levels = zeroLevels(this.#ids);
		this.#save();
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#save(): void {
		try {
			this.#getStorage().setItem(STORAGE_KEY, serializeLevels(this.levels));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's perk levels, over the perks in the game data. */
export const perkLevels = new PerkLevelStore(listPerks(gk2Data));
