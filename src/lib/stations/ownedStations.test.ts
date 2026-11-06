import { describe, expect, it } from 'vitest';
import { gameModel } from '#lib/calc/gameModel';
import { parseOwned, STARTING_STATIONS, STORAGE_KEY, serializeOwned } from './owned';
import { OwnedStationStore } from './ownedStations.svelte';

const ids = ['anvil', 'kitchen_table', 'sawhorse', 'saw'];

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

describe('parseOwned', () => {
	it('starts with the starting stations when nothing is saved', () => {
		expect(parseOwned(null, ids)).toEqual({ owned: ['kitchen_table', 'sawhorse'], problems: [] });
	});

	it('reads a saved list in station order', () => {
		expect(parseOwned(serializeOwned(['saw', 'anvil']), ids).owned).toEqual(['anvil', 'saw']);
	});

	it('keeps an empty saved list empty (after Reset)', () => {
		expect(parseOwned(serializeOwned([]), ids)).toEqual({ owned: [], problems: [] });
	});

	it('drops and reports stations no longer listed', () => {
		expect(parseOwned(serializeOwned(['anvil', 'old_forge']), ids)).toEqual({
			owned: ['anvil'],
			problems: [{ kind: 'unknownStation', id: 'old_forge' }]
		});
	});

	it.each([
		'not json',
		'null',
		'[]',
		'{"version":2,"owned":[]}',
		'{"version":1}',
		'{"version":1,"owned":[1]}'
	])('reports %s as unreadable, with nothing ticked', (raw) => {
		expect(parseOwned(raw, ids)).toEqual({ owned: [], problems: [{ kind: 'unreadable' }] });
	});
});

describe('OwnedStationStore', () => {
	it('saves on change, so a new store loads it', () => {
		const storage = memoryStorage();
		const store = new OwnedStationStore(ids, () => storage);
		store.load();
		store.setOwned('saw', true);
		store.setOwned('sawhorse', false);
		expect(store.owned).toEqual(['kitchen_table', 'saw']);

		const next = new OwnedStationStore(ids, () => storage);
		next.load();
		expect(next.owned).toEqual(['kitchen_table', 'saw']);
		expect(next.has('saw')).toBe(true);
		expect(next.has('anvil')).toBe(false);
	});

	it('ignores unlisted stations', () => {
		const storage = memoryStorage();
		const store = new OwnedStationStore(ids, () => storage);
		store.load();
		store.setOwned('old_forge', true);
		expect(store.owned).toEqual(['kitchen_table', 'sawhorse']);
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('unticks everything on reset, starting stations included, and saves', () => {
		const storage = memoryStorage();
		const store = new OwnedStationStore(ids, () => storage);
		store.load();
		store.reset();
		expect(store.owned).toEqual([]);

		const next = new OwnedStationStore(ids, () => storage);
		next.load();
		expect(next.owned).toEqual([]);
	});

	it('warns about unusable saved data, then re-saves it cleaned', () => {
		const storage = memoryStorage({ [STORAGE_KEY]: serializeOwned(['anvil', 'old_forge']) });
		const store = new OwnedStationStore(ids, () => storage);
		store.load();
		expect(store.warnings).toEqual([
			'Some saved stations are no longer listed and were dropped: old_forge.'
		]);

		const next = new OwnedStationStore(ids, () => storage);
		next.load();
		expect(next.warnings).toEqual([]);
		expect(next.owned).toEqual(['anvil']);
	});

	it('warns once when storage is blocked, and keeps the list in memory', () => {
		const store = new OwnedStationStore(ids, throwing);
		store.load();
		store.setOwned('anvil', true);
		store.setOwned('saw', true);
		expect(store.owned).toEqual(['anvil', 'kitchen_table', 'sawhorse', 'saw']);
		expect(store.warnings).toEqual([
			"Your browser is blocking storage, so your stations won't be kept after a reload."
		]);
	});
});

describe('starting stations', () => {
	it('are all on the Stations tab', () => {
		const listed = new Set(gameModel.stations.map((s) => s.id));
		for (const id of STARTING_STATIONS) expect(listed.has(id)).toBe(true);
	});
});
