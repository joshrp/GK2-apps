import { describe, expect, it } from 'vitest';
import { BlockedNotes, parseNotes, STORAGE_KEY, serializeNotes } from './blockedNotes.svelte';

/** In-memory Storage with only the methods the store uses. */
function memoryStorage(
	initial: Record<string, string> = {}
): Storage & { data: Map<string, string> } {
	const data = new Map(Object.entries(initial));
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		}
	} as unknown as Storage & { data: Map<string, string> };
}

describe('parseNotes', () => {
	it('is empty with nothing saved', () => {
		expect(parseNotes(null)).toEqual({ notes: {}, problems: [] });
	});

	it('keeps text as saved, drops blank notes quietly and reports non-text', () => {
		const raw = JSON.stringify({
			version: 1,
			notes: { log: 'Need axe\nfrom shop ', fat: '  ', bad: 3 }
		});
		expect(parseNotes(raw)).toEqual({
			notes: { log: 'Need axe\nfrom shop ' },
			problems: [{ kind: 'unreadable' }]
		});
	});

	it.each(['not json', '[]', 'null', '{"version":2,"notes":{}}', '{"version":1,"notes":[]}'])(
		'reports %s as unreadable',
		(raw) => {
			expect(parseNotes(raw)).toEqual({ notes: {}, problems: [{ kind: 'unreadable' }] });
		}
	);
});

describe('BlockedNotes', () => {
	it('saves on every change and reads the notes back', () => {
		const storage = memoryStorage();
		const store = new BlockedNotes(() => storage);
		store.load();
		store.set('log', 'Waiting on\nIron Anvil');
		store.set('fat', 'No pigs');

		const next = new BlockedNotes(() => storage);
		next.load();
		expect(next.notes).toEqual({ log: 'Waiting on\nIron Anvil', fat: 'No pigs' });
		expect(next.get('log')).toBe('Waiting on\nIron Anvil');
		expect(next.get('clay')).toBe('');
	});

	it.each(['', '   ', '\n'])('deletes a note set to %j', (blank) => {
		const storage = memoryStorage({ [STORAGE_KEY]: serializeNotes({ log: 'x', fat: 'y' }) });
		const store = new BlockedNotes(() => storage);
		store.load();
		store.set('log', blank);
		expect(store.notes).toEqual({ fat: 'y' });
		expect(storage.data.get(STORAGE_KEY)).toBe(serializeNotes({ fat: 'y' }));
	});

	it('cleans up unusable saved data and warns until dismissed', () => {
		const storage = memoryStorage({ [STORAGE_KEY]: 'not json' });
		const store = new BlockedNotes(() => storage);
		store.load();
		expect(store.notes).toEqual({});
		expect(store.warnings).toEqual(["Some saved Blocked notes couldn't be read and were dropped."]);
		expect(storage.data.get(STORAGE_KEY)).toBe(serializeNotes({}));
		store.dismissWarnings();
		expect(store.warnings).toEqual([]);
	});

	it('warns once when storage is blocked, and keeps notes in memory', () => {
		const store = new BlockedNotes(() => {
			throw new DOMException('blocked', 'SecurityError');
		});
		store.load();
		store.set('log', 'a');
		store.set('fat', 'b');
		expect(store.notes).toEqual({ log: 'a', fat: 'b' });
		expect(store.warnings).toEqual([
			"Your browser is blocking storage, so Blocked notes won't be kept after a reload."
		]);
	});
});
