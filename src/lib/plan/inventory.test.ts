import { describe, expect, it } from 'vitest';
import {
	COUNTS_KEY,
	InventoryStore,
	parseCount,
	parseCounts,
	REMEMBER_KEY,
	serializeCounts
} from './inventory.svelte';

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

describe('parseCount', () => {
	it.each([
		['', ''],
		['  ', ''],
		['0', 0],
		[' 12 ', 12],
		['-1', null],
		['1.5', null],
		['x', null]
	])('%j → %j', (text, expected) => {
		expect(parseCount(text)).toBe(expected);
	});
});

describe('parseCounts', () => {
	it('keeps whole numbers of 0 or more, and reports the rest', () => {
		const raw = JSON.stringify({ version: 1, counts: { log: 3, fat: 0, bad: -1, worse: 'x' } });
		expect(parseCounts(raw)).toEqual({
			counts: { log: 3, fat: 0 },
			problems: [{ kind: 'unreadable' }]
		});
	});

	it.each(['not json', '[]', '{"version":2,"counts":{}}'])('reports %s as unreadable', (raw) => {
		expect(parseCounts(raw)).toEqual({ counts: {}, problems: [{ kind: 'unreadable' }] });
	});
});

describe('InventoryStore', () => {
	it('starts fresh on every load while Remember is off', () => {
		const storage = memoryStorage();
		const store = new InventoryStore(() => storage);
		store.load();
		store.set('log', 3);
		expect(store.get('log')).toBe(3);
		expect(storage.data.has(COUNTS_KEY)).toBe(false);

		const next = new InventoryStore(() => storage);
		next.load();
		expect(next.counts).toEqual({});
	});

	it('remembers counts while Remember is on', () => {
		const storage = memoryStorage();
		const store = new InventoryStore(() => storage);
		store.load();
		store.set('log', 3);
		store.setRemember(true);
		store.set('fat', 0);

		const next = new InventoryStore(() => storage);
		next.load();
		expect(next.remember).toBe(true);
		expect(next.counts).toEqual({ log: 3, fat: 0 });
	});

	it('forgets the saved counts when Remember is turned off', () => {
		const storage = memoryStorage({
			[REMEMBER_KEY]: 'true',
			[COUNTS_KEY]: serializeCounts({ log: 3 })
		});
		const store = new InventoryStore(() => storage);
		store.load();
		store.setRemember(false);
		expect(store.counts).toEqual({ log: 3 });
		expect(storage.data.has(COUNTS_KEY)).toBe(false);

		const next = new InventoryStore(() => storage);
		next.load();
		expect(next.counts).toEqual({});
	});

	it('tells blank from 0, and clears back to blank', () => {
		const store = new InventoryStore(() => memoryStorage());
		store.set('log', 0);
		expect(store.get('log')).toBe(0);
		store.set('log', '');
		expect(store.get('log')).toBeUndefined();
		store.set('log', -2);
		store.set('log', 1.5);
		expect(store.counts).toEqual({});
	});

	it('warns once when storage is blocked, and keeps counts in memory', () => {
		const store = new InventoryStore(() => {
			throw new DOMException('blocked', 'SecurityError');
		});
		store.load();
		store.setRemember(true);
		store.set('log', 2);
		expect(store.counts).toEqual({ log: 2 });
		expect(store.warnings).toEqual([
			"Your browser is blocking storage, so your inventory can't be remembered."
		]);
	});
});
