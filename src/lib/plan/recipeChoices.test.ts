import { describe, expect, it } from 'vitest';
import { gameModel } from '#lib/calc/gameModel';
import { parseChoices, RecipeChoices, STORAGE_KEY, serializeChoices } from './recipeChoices.svelte';
import { recipeLabel } from './recipeLabel';

const recipes = ['plank', 'plank_by_hand', 'box'];

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

describe('RecipeChoices', () => {
	it('starts empty, and saves every choice so a new store loads it', () => {
		const storage = memoryStorage();
		const store = new RecipeChoices(recipes, () => storage);
		store.load();
		expect(store.choices).toEqual({});
		store.choose('plank', 'plank_by_hand');
		store.choose('box', 'box');

		const next = new RecipeChoices(recipes, () => storage);
		next.load();
		expect(next.choices).toEqual({ plank: 'plank_by_hand', box: 'box' });
	});

	it('ignores recipes not in the data', () => {
		const store = new RecipeChoices(recipes, () => memoryStorage());
		store.choose('plank', 'old_recipe');
		expect(store.choices).toEqual({});
	});

	it('drops and reports saved recipes no longer in the data, then re-saves', () => {
		const saved = serializeChoices({ plank: 'plank', box: 'old_box' });
		const storage = memoryStorage({ [STORAGE_KEY]: saved });
		const store = new RecipeChoices(recipes, () => storage);
		store.load();
		expect(store.choices).toEqual({ plank: 'plank' });
		expect(store.warnings).toEqual([
			'Some chosen recipes are no longer in the data, so the default is used for: box.'
		]);

		const next = new RecipeChoices(recipes, () => storage);
		next.load();
		expect(next.warnings).toEqual([]);
	});

	it.each(['not json', '[]', '{"version":2,"choices":{}}', '{"version":1,"choices":[]}'])(
		'reports %s as unreadable',
		(raw) => {
			expect(parseChoices(raw, new Set(recipes))).toEqual({
				choices: {},
				problems: [{ kind: 'unreadable' }]
			});
		}
	);

	it('warns once when storage is blocked, and keeps choices in memory', () => {
		const store = new RecipeChoices(recipes, () => {
			throw new DOMException('blocked', 'SecurityError');
		});
		store.load();
		store.choose('plank', 'plank_by_hand');
		store.choose('box', 'box');
		expect(store.choices).toEqual({ plank: 'plank_by_hand', box: 'box' });
		expect(store.warnings).toHaveLength(1);
	});
});

describe('recipeLabel (game data)', () => {
	it('shows inputs, amount made and station', () => {
		expect(recipeLabel(gameModel, 'ingot_iron', 'ingot_iron', {})).toBe(
			'3 Iron Ore, 30 fuel → 3 · Furnace II'
		);
	});

	it('tells same-named recipes apart by their inputs', () => {
		const labels = (gameModel.producers.get('seed_oil') ?? []).map((p) =>
			recipeLabel(gameModel, p.recipeId, 'seed_oil', {})
		);
		expect(labels.length).toBeGreaterThan(1);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('uses perk levels for amounts', () => {
		const at = (level: number) =>
			recipeLabel(gameModel, 'detail_1_iron', 'detail_1_iron', { perk_engineer: level });
		expect(at(0)).not.toBe(at(2));
	});
});
