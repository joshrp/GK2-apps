import { describe, expect, it } from 'vitest';
import { action, buildable, craft, data, item, output } from './fixtures';
import { gameModel } from './gameModel';
import { buildModel } from './model';
import { type ItemNode, type PlanNode, plan } from './planner';

const line = (id: string, count: number | { formula: string }) => ({
	id,
	refKind: 'item' as const,
	count
});

/**
 * Logs → planks (2 per craft, +1 per Carpenter level) at a saw or a bench; planks → boxes at a
 * bench, with fuel; a shelf needing a plank and "any skin"; a loop: egg ↔ hen.
 */
const model = buildModel(
	data({
		items: [
			item('log', 'Log'),
			item('plank', 'Plank'),
			item('box', 'Box'),
			item('shelf', 'Shelf'),
			item('skin_a', 'Skin'),
			item('skin_b', 'Skin'),
			item('egg', 'Egg'),
			item('hen', 'Hen'),
			item('fire', 'Fire')
		],
		itemGroups: [{ id: 'gr_skin', members: ['skin_a', 'skin_b'], usedInRecipes: true }],
		crafts: [
			craft('plank', {
				stations: ['saw', 'bench'],
				inputs: [line('log', 1)],
				outputs: [output('plank', { count: { formula: '2+WorkerPar("perk_carpenter")' } })]
			}),
			craft('plank_by_hand', {
				name: 'Plank (by hand)',
				stations: ['stump'],
				inputs: [line('log', 2)],
				outputs: [output('plank')]
			}),
			craft('box', {
				stations: ['bench'],
				inputs: [line('plank', 2), line('fire', { formula: '20-10*WorkerPar("perk_heat_saver")' })]
			}),
			craft('shelf', {
				stations: ['bench'],
				inputs: [line('plank', 1), { id: 'gr_skin', refKind: 'itemGroup', count: 1 }]
			}),
			craft('egg', { stations: ['coop'], inputs: [line('hen', 1)] }),
			craft('hen', { stations: ['coop'], inputs: [line('egg', 2)] })
		],
		buildables: [
			buildable('saw', 'Saw', [action('saw_p', 'Place', [['plank', 3]])]),
			buildable('bench', 'Bench', [action('bench_p', 'Place', [['plank', 4]])]),
			buildable('stump', 'Stump', [action('stump_p', 'Place', [['log', 1]])])
		],
		names: { coop: 'Coop' }
	})
);

const items = (nodes: PlanNode[]) => nodes.filter((n): n is ItemNode => n.kind === 'item');
const root = (p: ReturnType<typeof plan>, i = 0) => p.roots[i] as ItemNode;

describe('plan (fixtures)', () => {
	it('crafts ceil(shortfall / yield), multiplies inputs and records spare', () => {
		const p = plan(model, { targets: [{ kind: 'item', id: 'plank', quantity: 3 }], levels: {} });
		expect(root(p).craft).toMatchObject({ recipeId: 'plank', crafts: 2, yield: 2, spare: 1 });
		expect(items(root(p).children)[0]).toMatchObject({
			key: 'log',
			need: 2,
			leafReason: 'noRecipe'
		});
		expect(p.required).toEqual([{ key: 'log', name: 'Log', quantity: 2 }]);
	});

	it('uses perk levels for yields', () => {
		const p = plan(model, {
			targets: [{ kind: 'item', id: 'plank', quantity: 3 }],
			levels: { perk_carpenter: 1 }
		});
		expect(root(p).craft).toMatchObject({ crafts: 1, yield: 3, spare: 0 });
	});

	it('uses spare from earlier crafts before crafting again, anywhere in the plan', () => {
		const p = plan(model, {
			targets: [
				{ kind: 'item', id: 'plank', quantity: 3 },
				{ kind: 'item', id: 'shelf', quantity: 1 }
			],
			levels: {}
		});
		const plankUnderShelf = items(root(p, 1).children)[0];
		expect(plankUnderShelf).toMatchObject({ key: 'plank', need: 1, fromSpare: 1 });
		expect(plankUnderShelf.craft?.crafts).toBe(0);
		expect(plankUnderShelf.children).toEqual([]);
		expect(p.required).toContainEqual({ key: 'log', name: 'Log', quantity: 2 });
	});

	it('uses inventory once across the whole plan', () => {
		const p = plan(model, {
			targets: [
				{ kind: 'item', id: 'box', quantity: 1 },
				{ kind: 'item', id: 'box', quantity: 1 }
			],
			levels: {},
			inventory: { plank: 3 }
		});
		const [first, second] = [root(p, 0), root(p, 1)].map((r) => items(r.children)[0]);
		expect(first).toMatchObject({ need: 2, fromInventory: 2 });
		expect(first.craft?.crafts).toBe(0);
		expect(second).toMatchObject({ need: 2, fromInventory: 1 });
		expect(second.craft?.crafts).toBe(1);
	});

	it('takes inventory off Required items', () => {
		const p = plan(model, {
			targets: [{ kind: 'item', id: 'plank', quantity: 4 }],
			levels: {},
			inventory: { log: 1 }
		});
		expect(p.required).toEqual([{ key: 'log', name: 'Log', quantity: 1 }]);
	});

	it('counts fuel as fuel units, never below 0', () => {
		const at = (level: number) =>
			plan(model, {
				targets: [{ kind: 'item', id: 'box', quantity: 2 }],
				levels: { perk_heat_saver: level }
			});
		expect(at(0).fuel).toBe(40);
		expect(at(1).fuel).toBe(20);
		expect(at(3).fuel).toBe(0);
		expect(at(0).required.map((r) => r.key)).not.toContain('fire');
	});

	it('makes an "any of" group one Required line', () => {
		const p = plan(model, { targets: [{ kind: 'item', id: 'shelf', quantity: 2 }], levels: {} });
		expect(p.required).toContainEqual({ key: 'gr_skin', name: 'Skin (any)', quantity: 2 });
	});

	it('stops at an item that is its own ancestor', () => {
		const p = plan(model, { targets: [{ kind: 'item', id: 'egg', quantity: 1 }], levels: {} });
		const hen = items(root(p).children)[0];
		const egg = items(hen.children)[0];
		expect(egg).toMatchObject({ key: 'egg', need: 2, leafReason: 'cycle', craft: null });
		expect(p.required).toEqual([{ key: 'egg', name: 'Egg', quantity: 2 }]);
	});

	describe('recipes and stations', () => {
		const planks = (input: Partial<Parameters<typeof plan>[1]> = {}) =>
			plan(model, { targets: [{ kind: 'item', id: 'plank', quantity: 2 }], levels: {}, ...input });

		it('defaults to the first recipe, listing every option', () => {
			expect(root(planks()).craft?.recipeId).toBe('plank');
			expect(root(planks()).craft?.options.map((o) => o.id)).toEqual(['plank', 'plank_by_hand']);
		});

		it('defaults to a recipe at a station you have', () => {
			expect(root(planks({ owned: ['stump'] })).craft?.recipeId).toBe('plank_by_hand');
		});

		it('uses a chosen recipe, and ignores a choice that does not make the item', () => {
			const choose = (id: string) => planks({ recipeChoices: { plank: id } }).roots[0] as ItemNode;
			expect(choose('plank_by_hand').craft?.recipeId).toBe('plank_by_hand');
			expect(choose('box').craft?.recipeId).toBe('plank');
		});

		it('flags a step whose stations you have none of, and lists them to build', () => {
			const p = planks();
			expect(root(p).craft).toMatchObject({
				notBuilt: true,
				stations: [
					{ id: 'saw', name: 'Saw', status: 'missing' },
					{ id: 'bench', name: 'Bench', status: 'missing' }
				]
			});
			expect(p.stationGroups).toHaveLength(1);
			expect(p.stationsToBuild).toEqual([
				{ id: 'saw', name: 'Saw', buildable: true, chosen: false },
				{ id: 'bench', name: 'Bench', buildable: true, chosen: false }
			]);
		});

		it('needs no build when you have one of the stations', () => {
			const p = planks({ owned: ['bench'] });
			expect(root(p).craft?.notBuilt).toBe(false);
			expect(p.stationsToBuild).toEqual([]);
		});

		it('marks stations without a build cost as not buildable', () => {
			const p = plan(model, { targets: [{ kind: 'item', id: 'hen', quantity: 1 }], levels: {} });
			expect(p.stationsToBuild).toContainEqual({
				id: 'coop',
				name: 'Coop',
				buildable: false,
				chosen: false
			});
		});

		it('adds the build cost of a station you choose to build, once', () => {
			const p = planks({ build: ['saw', 'saw', 'coop'] });
			expect(root(p).craft?.stations[0].status).toBe('toBuild');
			expect(root(p).craft?.notBuilt).toBe(false);
			expect(p.roots).toHaveLength(2);
			expect(p.roots[1]).toMatchObject({
				kind: 'building',
				id: 'saw',
				quantity: 1,
				forStation: true
			});
			expect(p.stationsToBuild).toEqual([
				{ id: 'saw', name: 'Saw', buildable: true, chosen: true }
			]);
			// 2 planks for the target (1 craft) and 3 for the saw (2 crafts, 1 spare): 3 logs.
			expect(p.required).toEqual([{ key: 'log', name: 'Log', quantity: 3 }]);
		});
	});

	it('expands a building target, its cost times the quantity', () => {
		const p = plan(model, {
			targets: [{ kind: 'building', id: 'bench', quantity: 2 }],
			levels: {}
		});
		expect(p.roots[0]).toMatchObject({ kind: 'building', name: 'Bench', quantity: 2 });
		expect(items((p.roots[0] as { children: PlanNode[] }).children)[0]).toMatchObject({
			key: 'plank',
			need: 8
		});
	});

	it('skips targets with a quantity of 0', () => {
		expect(
			plan(model, { targets: [{ kind: 'item', id: 'box', quantity: 0 }], levels: {} }).roots
		).toEqual([]);
	});
});

describe('plan (game data): the spec check, 4 Reinforced Beam, all perks 0, no inventory', () => {
	const p = plan(gameModel, {
		targets: [{ kind: 'item', id: 'reinforced_beam', quantity: 4 }],
		levels: {}
	});
	const beam = root(p);
	const [oiledBeam, ironDetail] = items(beam.children);
	const [meltedFat, woodenBeam] = items(oiledBeam.children);
	const ironIngot = items(ironDetail.children)[0];

	it('4× Reinforced Beam at Iron or Steel Anvil needs 4 Oiled Beam + 4 Iron Detail', () => {
		expect(beam.craft?.crafts).toBe(4);
		expect(beam.craft?.stations.map((s) => s.name)).toEqual(['Iron Anvil', 'Steel Anvil']);
		expect([oiledBeam.name, oiledBeam.need, ironDetail.name, ironDetail.need]).toEqual([
			'Oiled Beam',
			4,
			'Iron Detail',
			4
		]);
	});

	it('4 Oiled Beam: 2 crafts at Woodworking Workbench II, needing 2 Melted Fat + 4 Wooden beam', () => {
		expect(oiledBeam.craft?.crafts).toBe(2);
		expect(oiledBeam.craft?.stations.map((s) => s.name)).toEqual(['Woodworking Workbench II']);
		expect([meltedFat.name, meltedFat.need, woodenBeam.name, woodenBeam.need]).toEqual([
			'Melted Fat',
			2,
			'Wooden beam',
			4
		]);
	});

	it('4 Iron Detail: 1 craft (2 spare), needing 1 Iron Ingot', () => {
		expect(ironDetail.craft).toMatchObject({ crafts: 1, spare: 2 });
		expect([ironIngot.name, ironIngot.need]).toEqual(['Iron Ingot', 1]);
	});

	it('2 Melted Fat: 1 craft (2 spare), needing 1 Fat + 2 Clay Plate + 20 fuel', () => {
		expect(meltedFat.craft).toMatchObject({ crafts: 1, spare: 2 });
		const lines = meltedFat.children.map((n) =>
			n.kind === 'fuel' ? ['fuel', n.need] : n.kind === 'item' ? [n.name, n.need] : []
		);
		expect(lines).toEqual([
			['Fat', 1],
			['Clay Plate', 2],
			['fuel', 20]
		]);
	});

	it('4 Wooden beam: 2 crafts at Circular Saw, needing 2 Log', () => {
		expect(woodenBeam.craft?.crafts).toBe(2);
		expect(woodenBeam.craft?.stations.map((s) => s.name)).toEqual(['Circular Saw']);
		expect(items(woodenBeam.children).map((n) => [n.name, n.need])).toEqual([['Log', 2]]);
	});

	it('1 Iron Ingot: 1 furnace craft (2 spare), needing 3 Iron Ore + 30 fuel', () => {
		expect(ironIngot.craft).toMatchObject({ crafts: 1, spare: 2 });
		expect(ironIngot.craft?.stations[0].name).toMatch(/Furnace/);
		expect(items(ironIngot.children).map((n) => [n.name, n.need])).toEqual([['Iron Ore', 3]]);
		expect(p.fuel).toBe(50);
	});
});
