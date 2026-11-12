/** localStorage key for the Blocked note per item. */
export const STORAGE_KEY = 'gk2calc.blocked';

const FORMAT_VERSION = 1;

export type Notes = Record<string, string>;

export type NotesProblem = { kind: 'unreadable' } | { kind: 'storageBlocked' };

/** True when a note has something besides whitespace in it. */
const hasText = (note: string) => note.trim() !== '';

/** Saved text to notes. Entries that aren't text, or are only whitespace, are dropped. */
export function parseNotes(raw: string | null): { notes: Notes; problems: NotesProblem[] } {
	if (raw === null) return { notes: {}, problems: [] };
	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { notes: {}, problems: [{ kind: 'unreadable' }] };
	}
	const value = saved as { version?: unknown; notes?: unknown } | null;
	if (
		typeof value !== 'object' ||
		value === null ||
		value.version !== FORMAT_VERSION ||
		typeof value.notes !== 'object' ||
		value.notes === null ||
		Array.isArray(value.notes)
	) {
		return { notes: {}, problems: [{ kind: 'unreadable' }] };
	}
	const notes: Notes = {};
	let bad = false;
	for (const [key, note] of Object.entries(value.notes)) {
		if (typeof note !== 'string') bad = true;
		else if (hasText(note)) notes[key] = note;
	}
	return { notes, problems: bad ? [{ kind: 'unreadable' }] : [] };
}

export function serializeNotes(notes: Notes): string {
	return JSON.stringify({ version: FORMAT_VERSION, notes });
}

/**
 * The Blocked note per item key (item id, quality family or group id), shared by every Steps row
 * of that item. Saved to browser storage on every change and kept until cleared. Nothing touches
 * storage until `load()` (prerendered page).
 */
export class BlockedNotes {
	readonly #getStorage: () => Storage;

	notes: Notes = $state({});
	problems: NotesProblem[] = $state([]);

	get warnings(): string[] {
		const messages: string[] = [];
		if (this.problems.some((p) => p.kind === 'unreadable')) {
			messages.push("Some saved Blocked notes couldn't be read and were dropped.");
		}
		if (this.problems.some((p) => p.kind === 'storageBlocked')) {
			messages.push(
				"Your browser is blocking storage, so Blocked notes won't be kept after a reload."
			);
		}
		return messages;
	}

	constructor(getStorage: () => Storage = () => localStorage) {
		this.#getStorage = getStorage;
	}

	load(): void {
		let raw: string | null;
		try {
			raw = this.#getStorage().getItem(STORAGE_KEY);
		} catch {
			this.#blocked();
			return;
		}
		const { notes, problems } = parseNotes(raw);
		this.notes = notes;
		this.problems = problems;
		if (problems.length > 0) this.#save();
	}

	/** The note for a key, or '' when there is none. */
	get(key: string): string {
		return this.notes[key] ?? '';
	}

	/** Sets a note as typed, line breaks included. Empty or whitespace-only text deletes it. */
	set(key: string, note: string): void {
		if (hasText(note)) {
			if (this.notes[key] === note) return;
			this.notes = { ...this.notes, [key]: note };
		} else {
			if (!(key in this.notes)) return;
			const { [key]: _, ...rest } = this.notes;
			this.notes = rest;
		}
		this.#save();
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#save(): void {
		try {
			this.#getStorage().setItem(STORAGE_KEY, serializeNotes(this.notes));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's Blocked notes. */
export const blockedNotes = new BlockedNotes();
