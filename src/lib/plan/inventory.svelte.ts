/** localStorage key for the "Remember my inventory" option. */
export const REMEMBER_KEY = 'gk2calc.rememberInventory';
/** localStorage key for the counts, written only while "Remember my inventory" is on. */
export const COUNTS_KEY = 'gk2calc.inventory';

const FORMAT_VERSION = 1;

export type Counts = Record<string, number>;

export type InventoryProblem = { kind: 'unreadable' } | { kind: 'storageBlocked' };

/** A count typed into a Have field: '' = blank, whole number ≥ 0, or null when invalid. */
export function parseCount(text: string): number | '' | null {
	const trimmed = text.trim();
	if (trimmed === '') return '';
	return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Saved text to counts. Entries that aren't whole numbers ≥ 0 are dropped and reported. */
export function parseCounts(raw: string | null): { counts: Counts; problems: InventoryProblem[] } {
	if (raw === null) return { counts: {}, problems: [] };
	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { counts: {}, problems: [{ kind: 'unreadable' }] };
	}
	const value = saved as { version?: unknown; counts?: unknown } | null;
	if (
		typeof value !== 'object' ||
		value === null ||
		value.version !== FORMAT_VERSION ||
		typeof value.counts !== 'object' ||
		value.counts === null ||
		Array.isArray(value.counts)
	) {
		return { counts: {}, problems: [{ kind: 'unreadable' }] };
	}
	const counts: Counts = {};
	let bad = false;
	for (const [key, n] of Object.entries(value.counts)) {
		if (Number.isInteger(n) && (n as number) >= 0) counts[key] = n as number;
		else bad = true;
	}
	return { counts, problems: bad ? [{ kind: 'unreadable' }] : [] };
}

export function serializeCounts(counts: Counts): string {
	return JSON.stringify({ version: FORMAT_VERSION, counts });
}

/**
 * What the player already has, by item key (item id, quality family or group id). Starts empty on
 * every load; with "Remember my inventory" on, counts are saved on every change and read back.
 * A key that isn't set means "not checked yet" (blank), which is not the same as 0.
 */
export class InventoryStore {
	readonly #getStorage: () => Storage;

	counts: Counts = $state({});
	remember = $state(false);
	problems: InventoryProblem[] = $state([]);

	get warnings(): string[] {
		const messages: string[] = [];
		if (this.problems.some((p) => p.kind === 'unreadable')) {
			messages.push("Some remembered inventory couldn't be read and was dropped.");
		}
		if (this.problems.some((p) => p.kind === 'storageBlocked')) {
			messages.push("Your browser is blocking storage, so your inventory can't be remembered.");
		}
		return messages;
	}

	constructor(getStorage: () => Storage = () => localStorage) {
		this.#getStorage = getStorage;
	}

	/** Reads the option, and the counts when it's on. */
	load(): void {
		try {
			const storage = this.#getStorage();
			this.remember = storage.getItem(REMEMBER_KEY) === 'true';
			if (!this.remember) return;
			const { counts, problems } = parseCounts(storage.getItem(COUNTS_KEY));
			this.counts = counts;
			this.problems = problems;
			if (problems.length > 0) this.#saveCounts();
		} catch {
			this.#blocked();
		}
	}

	/** The count for a key, or undefined when blank. */
	get(key: string): number | undefined {
		return this.counts[key];
	}

	/** Sets a count (whole number ≥ 0), or clears it back to blank with ''. */
	set(key: string, count: number | ''): void {
		if (count === '') {
			if (!(key in this.counts)) return;
			const { [key]: _, ...rest } = this.counts;
			this.counts = rest;
		} else {
			if (!Number.isInteger(count) || count < 0 || this.counts[key] === count) return;
			this.counts = { ...this.counts, [key]: count };
		}
		if (this.remember) this.#saveCounts();
	}

	/** Turns "Remember my inventory" on (saves the counts now) or off (forgets the saved ones). */
	setRemember(remember: boolean): void {
		this.remember = remember;
		try {
			const storage = this.#getStorage();
			storage.setItem(REMEMBER_KEY, String(remember));
			if (remember) storage.setItem(COUNTS_KEY, serializeCounts(this.counts));
			else storage.removeItem(COUNTS_KEY);
		} catch {
			this.#blocked();
		}
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#saveCounts(): void {
		try {
			this.#getStorage().setItem(COUNTS_KEY, serializeCounts(this.counts));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's inventory. */
export const inventory = new InventoryStore();
