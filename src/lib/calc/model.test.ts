import { describe, expect, it } from 'vitest';
import { gk2Data } from '#lib/data/gk2';
import { action, buildable, craft, data, item, output } from './fixtures';
import { buildModel, isUsableCraft } from './model';
import { KNOWN_RECIPE_INPUTS, STATION_FIXES } from './stationFixes';

describe('isUsableCraft', () => {
	it('excludes dev, conveyor and zombie crafts, and crafts with no guaranteed output', () => {
		expect(isUsableCraft(craft('plank'))).toBe(true);
		expect(isUsableCraft(craft('plank', { likelyDev: true }))).toBe(false);
		expect(isUsableCraft(craft('plank', { flags: ['conveyor'] }))).toBe(false);
		expect(isUsableCraft(craft('clay_zombie_craft'))).toBe(false);
		expect(isUsableCraft(craft('plank', { outputs: [] }))).toBe(false);
		expect(isUsableCraft(craft('plank', { outputs: [output('plank', { chance: 0.5 })] }))).toBe(
			false
		);
	});
});

describe('buildModel (fixtures)', () => {
	it('indexes guaranteed outputs only, using min for a range', () => {
		const m = buildModel(
			data({
				crafts: [
					craft('plank', {
						outputs: [
							output('plank', { count: null, min: 2, max: 4 }),
							output('chips', { chance: 0.5 })
						]
					})
				]
			})
		);
		expect(m.producers.get('plank')).toEqual([{ recipeId: 'plank', yield: 2 }]);
		expect(m.producers.has('chips')).toBe(false);
	});

	it('lists every guaranteed output of a craft as a producer', () => {
		const m = buildModel(
			data({ crafts: [craft('burn', { outputs: [output('ash', { count: 5 }), output('salt')] })] })
		);
		expect(m.producers.get('ash')?.[0].recipeId).toBe('burn');
		expect(m.producers.get('salt')?.[0].recipeId).toBe('burn');
	});

	it('fills an empty station list from the fixes, but never overrides the export', () => {
		const m = buildModel(
			data({
				crafts: [
					craft('prayer_purity'),
					craft('book', { stations: ['writing_desk_1'] }),
					craft('sinful_idol')
				]
			})
		);
		expect(m.recipes.get('prayer_purity')?.stations).toEqual(['writing_desk_1']);
		expect(m.recipes.get('book')?.stations).toEqual(['writing_desk_1']);
		expect(m.recipes.get('sinful_idol')?.stations).toEqual([]);
	});

	it("merges X and X_place, preferring X's name and X_place's Place cost", () => {
		const m = buildModel(
			data({
				buildables: [
					buildable('anvil', 'Anvil', [action('anvil_p', 'Place', [['ingot', 4]])]),
					buildable('anvil_place', 'Anvil (place)', [
						action('anvil_place_p', 'Place', [['ingot', 2]])
					]),
					buildable('desk', null, [action('desk_r', 'Remove')]),
					buildable('desk_place', 'Desk', [action('desk_place_p', 'Place', [['plank', 3]])])
				]
			})
		);
		expect([...m.buildings.keys()]).toEqual(['anvil', 'desk']);
		expect(m.buildings.get('anvil')).toMatchObject({
			name: 'Anvil',
			cost: [{ id: 'ingot', count: 2 }]
		});
		expect(m.buildings.get('desk')).toMatchObject({
			name: 'Desk',
			cost: [{ id: 'plank', count: 3 }]
		});
	});

	it('lists stations used by recipes, with their cost status', () => {
		const m = buildModel(
			data({
				crafts: [
					craft('a', { stations: ['anvil'] }),
					craft('b', { stations: ['kitchen_table', 'locked_door'] })
				],
				buildables: [
					buildable('anvil_place', 'Anvil', [action('anvil_place_p', 'Place', [['x', 1]])])
				],
				names: { kitchen_table: 'Kitchen Table', locked_door: 'Locked door' }
			})
		);
		const byId = Object.fromEntries(m.stations.map((s) => [s.id, s]));
		expect(byId.anvil.cost).toEqual({ kind: 'build', buildingId: 'anvil' });
		expect(byId.anvil.icon).toBe('icon_anvil_place');
		expect(byId.kitchen_table.cost).toEqual({ kind: 'comesWithGame' });
		expect(byId.locked_door.cost).toEqual({ kind: 'unknown' });
		expect(byId.firewood_shed_1.storageOnly).toBe(true);
		expect(m.stations.map((s) => s.name)).toEqual(
			[...m.stations.map((s) => s.name)].sort((a, b) => a.localeCompare(b))
		);
	});

	describe('resolve', () => {
		const m = buildModel(
			data({
				items: [
					item('story:1', 'Story'),
					item('story:2', 'Story'),
					item('skin_a:1', 'Skin'),
					item('skin_b:2', 'Skin'),
					item('roach', 'Roach'),
					item('gudgeon', 'Gudgeon'),
					item('cabbage:1', 'Cabbage'),
					item('ore', 'Ore'),
					item('ingot', 'Ingot')
				],
				itemGroups: [
					{ id: 'gr_stories', members: ['story:1', 'story:2'], usedInRecipes: true },
					{ id: 'gr_skin', members: ['skin_a:1', 'skin_b:2'], usedInRecipes: true },
					{ id: 'gr_fish', members: ['roach', 'gudgeon'], usedInRecipes: true }
				],
				crafts: [
					craft('write_story', {
						outputs: [output('story', { refKind: 'anyQuality', star: true })]
					}),
					craft('ingot')
				]
			})
		);

		it('expands an item with a recipe', () => {
			expect(m.resolve({ id: 'ingot', refKind: 'item' })).toMatchObject({
				kind: 'item',
				name: 'Ingot',
				producers: [{ recipeId: 'ingot' }],
				tierNotGuaranteed: false
			});
		});

		it('makes an item without a recipe a Required item', () => {
			expect(m.resolve({ id: 'ore', refKind: 'item' })).toMatchObject({
				kind: 'item',
				producers: []
			});
		});

		it('expands any tier through the ★ craft', () => {
			const any = { kind: 'item', id: 'story', name: 'Story (any tier)', tierNotGuaranteed: false };
			expect(m.resolve({ id: 'story', refKind: 'anyQuality' })).toMatchObject(any);
			expect(m.resolve({ id: 'gr_stories', refKind: 'itemGroup' })).toMatchObject(any);
		});

		it('expands a specific tier through the ★ craft, marked tier not guaranteed', () => {
			expect(m.resolve({ id: 'story:1', refKind: 'item' })).toMatchObject({
				id: 'story:1',
				name: 'Story ★1',
				producers: [{ recipeId: 'write_story' }],
				tierNotGuaranteed: true
			});
		});

		it('leaves a tier with no ★ craft as a Required item', () => {
			expect(m.resolve({ id: 'cabbage:1', refKind: 'item' })).toMatchObject({
				name: 'Cabbage ★1',
				producers: [],
				tierNotGuaranteed: false
			});
		});

		it('makes other groups one "any of" line', () => {
			expect(m.resolve({ id: 'gr_skin', refKind: 'itemGroup' })).toEqual({
				kind: 'anyOf',
				id: 'gr_skin',
				name: 'Skin (any)'
			});
			expect(m.resolve({ id: 'gr_fish', refKind: 'itemGroup' })).toMatchObject({
				name: 'Roach or Gudgeon'
			});
		});

		it('offers made items and ★ tiers as targets, not raw items', () => {
			expect(m.targets.filter((t) => t.kind === 'item').map((t) => t.id)).toEqual([
				'ingot',
				'story:1',
				'story:2'
			]);
		});
	});

	it('hides dev, unnamed and <sprite> targets', () => {
		const m = buildModel(
			data({
				items: [
					item('a', 'Plank'),
					item('b', 'Test', { likelyDev: true }),
					item('c', null),
					item('d', 'Toxic <sprite name="x"> Potion')
				],
				crafts: ['a', 'b', 'c', 'd'].map((id) => craft(id))
			})
		);
		expect(Object.fromEntries(m.targets.map((t) => [t.id, t.hidden]))).toEqual({
			a: false,
			b: true,
			c: true,
			d: true
		});
	});
});

describe('buildModel (game data)', () => {
	const m = buildModel(gk2Data);
	const stations = Object.fromEntries(m.stations.map((s) => [s.id, s]));

	it('has the Reinforced Beam recipe from the spec check', () => {
		expect(m.recipes.get('reinforced_beam')).toMatchObject({
			inputs: [
				{ id: 'oiled_beam', count: 1 },
				{ id: 'detail_1_iron', count: 1 }
			],
			stations: ['iron_anvil', 'steel_anvil']
		});
	});

	it('has no conveyor, zombie or dev recipes', () => {
		for (const r of m.recipes.values()) expect(r.id).not.toMatch(/zombie/);
		const excluded = gk2Data.crafts.filter(
			(c) => c.likelyDev || c.flags.includes('conveyor') || c.id.includes('zombie')
		);
		for (const c of excluded) expect(m.recipes.has(c.id)).toBe(false);
	});

	it('makes zombie-gathered items Required items', () => {
		for (const id of ['iron_ore', 'clay', 'sand', '1h_stone', '1h_marble']) {
			expect(m.resolve({ id, refKind: 'item' })).toMatchObject({ producers: [] });
		}
	});

	it('applies every station fix to a craft with no station in the export', () => {
		for (const [craftId, stationId] of Object.entries(STATION_FIXES)) {
			expect(gk2Data.crafts.find((c) => c.id === craftId)?.stations).toEqual([]);
			expect(m.recipes.get(craftId)?.stations).toEqual([stationId]);
			expect(stations[stationId]?.cost.kind).toBe('build');
		}
	});

	it('uses the known ingredients for Paint: 2 Water at Laboratory I', () => {
		expect(m.recipes.get('quest_paint')).toEqual({
			id: 'quest_paint',
			name: 'Paint',
			inputs: [{ id: 'water', refKind: 'item', count: 2 }],
			outputs: [{ id: 'quest_paint', count: 1 }],
			stations: ['alchemy_mix']
		});
		for (const [craftId, inputs] of Object.entries(KNOWN_RECIPE_INPUTS)) {
			for (const [itemId] of inputs) {
				expect(
					gk2Data.items.some((i) => i.id === itemId),
					`${craftId}: ${itemId}`
				).toBe(true);
			}
		}
	});

	it('leaves exactly the agreed 11 crafts with station unknown', () => {
		const unknown = [...m.recipes.values()].filter((r) => r.stations.length === 0).map((r) => r.id);
		expect(unknown.sort()).toEqual(
			[
				'sinful_idol',
				'scary_idol',
				'liquid_harden',
				'alkali',
				'lacquer',
				'organ_improver_red',
				'organ_improver_white',
				'quality_items_gold',
				'resurrection_liquid',
				'quality_food_gold',
				'miracle_growing_elixir'
			].sort()
		);
	});

	it('lists the starting stations, with their cost status', () => {
		for (const id of ['sawhorse', 'woodworking_workbench_1', 'wooden_anvil']) {
			expect(stations[id]?.cost.kind).toBe('build');
		}
		for (const id of ['kitchen_table', 'kitchen_oven', 'compost_pile_1']) {
			expect(stations[id]?.cost.kind).toBe('comesWithGame');
		}
		for (const id of ['firewood_shed_1', 'firewood_shed_kitchen_1']) {
			expect(stations[id]?.storageOnly).toBe(true);
		}
		for (const id of ['base_locked_door_tower']) {
			expect(stations[id]?.cost.kind).toBe('unknown');
		}
	});

	it('gives station locations from the build menus, A–Z, without dev copies', () => {
		const at = (id: string) => stations[id]?.locations;
		expect(at('circular_saw')).toEqual(['Yard']);
		expect(at('autopsy_table_1')).toEqual(['Morgue']);
		expect(at('millstone')).toEqual(['Home']);
		expect(at('formulation_bench')).toEqual(['Alchemy Lab', 'Writing Room']);
		expect(at('firewood_shed_kitchen_1')).toEqual(['Alchemy Lab', 'Home', 'Vineyard Basement']);
	});

	it('uses the known locations where no build menu offers a station, else none', () => {
		const at = (id: string) => stations[id]?.locations;
		for (const id of ['kitchen_table', 'kitchen_table_t2', 'kitchen_oven', 'kitchen_oven_t2']) {
			expect(at(id)).toEqual(['Home']);
		}
		expect(at('compost_pile_1')).toEqual(['Garden']);
		expect(at('compost_pile_2')).toEqual(['Garden']);
		expect(at('base_locked_door_tower')).toEqual([]);
		const unknown = m.stations.filter((s) => s.locations.length === 0).map((s) => s.id);
		expect(unknown).toEqual(['base_locked_door_tower']);
	});

	it('has no zombie stations, and every station has a name', () => {
		for (const s of m.stations) {
			expect(s.id).not.toMatch(/zombie|sawmill_wood_crafter|mine_ore_coal_crafter/);
			expect(s.name).not.toBe(s.id);
		}
	});

	const costOf = (id: string) =>
		Object.fromEntries((m.buildings.get(id)?.cost ?? []).map((l) => [l.id, l.count]));

	it('finds icons for items, families, groups and stations', () => {
		expect(m.iconOf('ingot_iron')).toBeTruthy();
		expect(m.iconOf('story')).toBeTruthy();
		expect(m.iconOf('gr_skin')).toBeTruthy();
		expect(m.iconOf('wooden_anvil')).toBe(m.stations.find((s) => s.id === 'wooden_anvil')?.icon);
		expect(m.iconOf('no_such_thing')).toBeNull();
	});

	it('uses X_place costs, confirmed in the game', () => {
		expect(costOf('wooden_anvil')).toEqual({ wood1: 1, '1h_stone': 1 });
		expect(costOf('furnace_2')).toMatchObject({ brick: 12 });
		expect(costOf('newspaper_press')).toMatchObject({ oiled_beam: 3 });
	});

	it('uses the known costs for stations the export has no Place cost for', () => {
		expect(costOf('kitchen_table_t2')).toEqual({
			detail_1_iron: 4,
			wooden_plank: 8,
			wooden_beam: 2
		});
		expect(costOf('kitchen_oven_t2')).toEqual({
			stone_plate_1: 16,
			stone_plate_2: 4,
			detail_1_iron: 4
		});
		expect(costOf('compost_pile_2')).toEqual({ wood1: 12, nails_bronze: 8, details_1_bronze: 2 });
		expect(costOf('crematorium_1')).toEqual({ brick: 6, details_1_bronze: 6 });
		expect(costOf('crematorium_2')).toEqual({ brick: 12, detail_2_iron: 8 });
		expect(costOf('millstone')).toEqual({ flitch: 2, stone_plate_1: 2 });
		for (const id of [
			'kitchen_table_t2',
			'kitchen_oven_t2',
			'compost_pile_2',
			'crematorium_1',
			'millstone'
		]) {
			expect(stations[id]?.cost.kind).toBe('build');
			expect(m.buildings.get(id)?.name).not.toBe(id);
		}
	});

	it("matches the Millstone's cost to its Script action in the export", () => {
		const script = gk2Data.buildables
			.find((b) => b.id === 'millstone')
			?.actions.find((a) => a.mode === 'Script');
		expect(Object.fromEntries((script?.cost ?? []).map((l) => [l.id, l.count]))).toEqual(
			costOf('millstone')
		);
	});

	it('hides zombie and conveyor buildings, but not the home Millstone', () => {
		const hidden = (id: string) =>
			m.targets.find((t) => t.kind === 'building' && t.id === id)?.hidden;
		expect(hidden('sawmill_wood_crafter')).toBe(true);
		expect(hidden('conveyor_kitchen_millstone')).toBe(true);
		expect(hidden('millstone')).toBe(false);
		expect(hidden('furnace_2')).toBe(false);
	});

	it('pins the counts for this data', () => {
		expect(m.recipes.size).toBe(356);
		expect(m.stations.length).toBe(42);
		expect(m.targets.filter((t) => t.kind === 'item').length).toBe(360);
		expect(m.targets.filter((t) => t.kind === 'building').length).toBe(173);
	});
});
