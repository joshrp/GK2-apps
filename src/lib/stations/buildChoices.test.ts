import { describe, expect, it } from 'vitest';
import {
	BuildChoices,
	buildChoices,
	parseBuildChoices,
	STORAGE_KEY,
	serializeBuildChoices
} from './buildChoices.svelte';

const buildable = ['saw', 'anvil', 'furnace'];

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

describe('BuildChoices', () => {
	it('starts empty, and saves every change so a new store loads it', () => {
		const storage = memoryStorage();
		const store = new BuildChoices(buildable, () => storage);
		store.load();
		expect(store.ids).toEqual([]);
		store.set('saw', true);
		store.set('anvil', true);
		store.set('saw', false);

		const next = new BuildChoices(buildable, () => storage);
		next.load();
		expect(next.ids).toEqual(['anvil']);
		expect(next.has('anvil')).toBe(true);
	});

	it('ignores stations that cannot be built, and repeats', () => {
		const storage = memoryStorage();
		const store = new BuildChoices(buildable, () => storage);
		store.set('kitchen_table', true);
		store.set('saw', true);
		store.set('saw', true);
		expect(store.ids).toEqual(['saw']);
	});

	it('drops and reports saved stations that can no longer be built, then re-saves', () => {
		const storage = memoryStorage({ [STORAGE_KEY]: serializeBuildChoices(['saw', 'old_forge']) });
		const store = new BuildChoices(buildable, () => storage);
		store.load();
		expect(store.ids).toEqual(['saw']);
		expect(store.warnings).toEqual([
			'Some stations chosen to build can no longer be built and were dropped: old_forge.'
		]);

		const next = new BuildChoices(buildable, () => storage);
		next.load();
		expect(next.warnings).toEqual([]);
	});

	it.each(['not json', '[]', '{"version":2,"ids":[]}', '{"version":1,"ids":[1]}'])(
		'reports %s as unreadable',
		(raw) => {
			expect(parseBuildChoices(raw, buildable)).toEqual({
				ids: [],
				problems: [{ kind: 'unreadable' }]
			});
		}
	);

	it('warns once when storage is blocked, and keeps choices in memory', () => {
		const store = new BuildChoices(buildable, () => {
			throw new DOMException('blocked', 'SecurityError');
		});
		store.load();
		store.set('saw', true);
		store.set('anvil', true);
		expect(store.ids).toEqual(['saw', 'anvil']);
		expect(store.warnings).toHaveLength(1);
	});

	it('offers only stations with a build cost in the game data', () => {
		buildChoices.set('kitchen_table', true);
		buildChoices.set('base_locked_door_tower', true);
		expect(buildChoices.ids).toEqual([]);
	});
});
