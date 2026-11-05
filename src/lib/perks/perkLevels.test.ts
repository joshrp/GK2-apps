import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from './levels';
import { PerkLevelStore } from './perkLevels.svelte';
import type { PerkDef } from './perks';

const perks: PerkDef[] = [
	{ id: 'perk_cook', name: 'Cook', affects: ['Bread'] },
	{ id: 'perk_blacksmith', name: 'Blacksmith', affects: ['Iron Nails'] }
];

/** In-memory Storage with only the methods the store uses. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		}
	} as Storage;
}

const throwing = (): Storage => {
	throw new DOMException('blocked', 'SecurityError');
};

describe('PerkLevelStore', () => {
	it('loads all zeros with no warnings from an empty store', () => {
		const store = new PerkLevelStore(perks, () => memoryStorage());
		store.load();
		expect(store.levels).toEqual({ perk_cook: 0, perk_blacksmith: 0 });
		expect(store.warnings).toEqual([]);
	});

	it('saves on setLevel, so a new store loads it', () => {
		const storage = memoryStorage();
		const store = new PerkLevelStore(perks, () => storage);
		store.load();
		store.setLevel('perk_cook', 3);

		const next = new PerkLevelStore(perks, () => storage);
		next.load();
		expect(next.levels).toEqual({ perk_cook: 3, perk_blacksmith: 0 });
	});

	it('ignores unlisted perks and invalid levels', () => {
		const storage = memoryStorage();
		const store = new PerkLevelStore(perks, () => storage);
		store.load();
		store.setLevel('perk_other', 2);
		store.setLevel('perk_cook', -1);
		store.setLevel('perk_cook', 1.5);
		expect(store.levels).toEqual({ perk_cook: 0, perk_blacksmith: 0 });
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('resets every perk to 0 and saves', () => {
		const storage = memoryStorage();
		const store = new PerkLevelStore(perks, () => storage);
		store.load();
		store.setLevel('perk_cook', 2);
		store.setLevel('perk_blacksmith', 4);
		store.reset();
		expect(store.levels).toEqual({ perk_cook: 0, perk_blacksmith: 0 });

		const next = new PerkLevelStore(perks, () => storage);
		next.load();
		expect(next.levels).toEqual({ perk_cook: 0, perk_blacksmith: 0 });
	});

	it('warns about unusable saved data, then re-saves it cleaned', () => {
		const saved = JSON.stringify({ version: 1, levels: { perk_cook: -2, perk_old: 3 } });
		const storage = memoryStorage({ [STORAGE_KEY]: saved });
		const store = new PerkLevelStore(perks, () => storage);
		store.load();
		expect(store.levels).toEqual({ perk_cook: 0, perk_blacksmith: 0 });
		expect(store.warnings).toHaveLength(2);
		expect(store.warnings[0]).toContain('Cook (-2)');
		expect(store.warnings[1]).toContain('perk_old (3)');

		const next = new PerkLevelStore(perks, () => storage);
		next.load();
		expect(next.warnings).toEqual([]);
	});

	it('clears warnings on dismiss', () => {
		const storage = memoryStorage({ [STORAGE_KEY]: 'not json' });
		const store = new PerkLevelStore(perks, () => storage);
		store.load();
		expect(store.warnings).toHaveLength(1);
		store.dismissWarnings();
		expect(store.warnings).toEqual([]);
	});

	it('warns once when storage is blocked, and keeps levels in memory', () => {
		const store = new PerkLevelStore(perks, throwing);
		store.load();
		store.setLevel('perk_cook', 2);
		store.reset();
		store.setLevel('perk_blacksmith', 1);
		expect(store.levels).toEqual({ perk_cook: 0, perk_blacksmith: 1 });
		expect(store.warnings).toEqual([
			"Your browser is blocking storage, so perk levels won't be kept after a reload."
		]);
	});
});
