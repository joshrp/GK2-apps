import { describe, expect, it } from 'vitest';
import { type Craft, type Gk2Data, gk2Data, type ItemOutput, type Quantity } from '#lib/data/gk2';
import { formulaParams, listPerks } from './perks';

function craft(id: string, overrides: Partial<Craft> = {}): Craft {
	return {
		id,
		name: null,
		nameSource: null,
		icon: null,
		likelyDev: false,
		raw: null,
		description: null,
		iconSource: null,
		iconId: null,
		stations: [],
		inputs: [],
		outputs: [],
		duration: null,
		energyPerTick: null,
		techPoints: { red: null, green: null, blue: null },
		perks: [],
		flags: [],
		effectsOnEnd: [],
		unlock: { required: false, sources: [] },
		...overrides
	};
}

function output(overrides: Partial<ItemOutput> = {}): ItemOutput {
	return {
		id: 'thing',
		refKind: 'item',
		count: 1,
		min: null,
		max: null,
		chance: null,
		outputGroup: null,
		star: false,
		...overrides
	};
}

function data(crafts: Craft[], names: Record<string, string> = {}): Gk2Data {
	return {
		schemaVersion: '0.1.0',
		generatedAt: '2026-01-01T00:00:00Z',
		source: {
			game: 'Graveyard Keeper 2',
			steamAppId: 0,
			steamBuildId: 0,
			unityVersion: '',
			locale: 'en'
		},
		items: [],
		itemGroups: [],
		crafts,
		buildables: [],
		zones: [],
		techs: [],
		techTabs: [],
		names
	};
}

const perk = (id: string): Quantity => ({ formula: `2+WorkerPar("${id}")` });

describe('formulaParams', () => {
	it('returns [] for numbers and null', () => {
		expect(formulaParams(5)).toEqual([]);
		expect(formulaParams(null)).toEqual([]);
	});

	it('reads WorkerPar and PPar ids', () => {
		expect(formulaParams({ formula: '12+4*WorkerPar("perk_blacksmith")' })).toEqual([
			'perk_blacksmith'
		]);
		expect(formulaParams({ formula: '1-0.25*PPar("perk_heat_saver")' })).toEqual([
			'perk_heat_saver'
		]);
	});

	it('returns every distinct id once', () => {
		expect(formulaParams({ formula: 'PPar("a")+WorkerPar("b")' })).toEqual(['a', 'b']);
		expect(formulaParams({ formula: 'PPar("a")*WorkerPar("a")' })).toEqual(['a']);
	});

	it('returns [] for a formula with no call', () => {
		expect(formulaParams({ formula: 'perk_alchemist' })).toEqual([]);
	});
});

describe('listPerks', () => {
	const ids = (d: Gk2Data) => listPerks(d).map((p) => p.id);

	it('lists a perk in a guaranteed output count', () => {
		const d = data([craft('c', { name: 'Nails', outputs: [output({ count: perk('p') })] })]);
		expect(listPerks(d)).toEqual([{ id: 'p', name: 'p', affects: ['Nails'] }]);
	});

	it('lists a perk in an output min', () => {
		const d = data([craft('c', { outputs: [output({ count: null, min: perk('p'), max: 5 })] })]);
		expect(ids(d)).toEqual(['p']);
	});

	it('lists a perk in an input count', () => {
		const d = data([craft('c', { inputs: [{ id: 'fire', refKind: 'item', count: perk('p') }] })]);
		expect(ids(d)).toEqual(['p']);
	});

	it('ignores outputs with a chance', () => {
		const d = data([
			craft('a', { outputs: [output({ count: perk('p'), chance: 0.5 })] }),
			craft('b', { outputs: [output({ chance: perk('q') })] })
		]);
		expect(ids(d)).toEqual([]);
	});

	it('ignores likelyDev and conveyor crafts', () => {
		const d = data([
			craft('a', { likelyDev: true, outputs: [output({ count: perk('p') })] }),
			craft('b', { flags: ['conveyor'], outputs: [output({ count: perk('q') })] })
		]);
		expect(ids(d)).toEqual([]);
	});

	it('keeps auto crafts', () => {
		const d = data([craft('a', { flags: ['auto'], outputs: [output({ count: perk('p') })] })]);
		expect(ids(d)).toEqual(['p']);
	});

	it('lists only the non-conveyor crafts of a perk', () => {
		const d = data([
			craft('a', { name: 'Flour', outputs: [output({ count: perk('p') })] }),
			craft('b', { name: 'Supply', flags: ['conveyor'], outputs: [output({ count: perk('p') })] })
		]);
		expect(listPerks(d)[0].affects).toEqual(['Flour']);
	});

	it('de-duplicates recipe names, keeping game order', () => {
		const d = data([
			craft('soup1', { name: 'Soup', outputs: [output({ count: perk('p') })] }),
			craft('bread', { name: 'Bread', outputs: [output({ count: perk('p') })] }),
			craft('soup2', { name: 'Soup', outputs: [output({ count: perk('p') })] })
		]);
		expect(listPerks(d)[0].affects).toEqual(['Soup', 'Bread']);
	});

	it('takes names from names, falling back to the id', () => {
		const d = data(
			[
				craft('named', { outputs: [output({ count: perk('p') })] }),
				craft('bare', { outputs: [output({ count: perk('q') })] })
			],
			{ p: 'Perk P', named: 'Named recipe' }
		);
		expect(listPerks(d)).toEqual([
			{ id: 'p', name: 'Perk P', affects: ['Named recipe'] },
			{ id: 'q', name: 'q', affects: ['bare'] }
		]);
	});

	it('sorts by name', () => {
		const d = data(
			[
				craft('a', { outputs: [output({ count: perk('z') })] }),
				craft('b', { outputs: [output({ count: perk('y') })] })
			],
			{ z: 'Apple', y: 'Banana' }
		);
		expect(listPerks(d).map((p) => p.name)).toEqual(['Apple', 'Banana']);
	});
});

describe('listPerks on the real data', () => {
	const perks = listPerks(gk2Data);
	const byId = (id: string) => {
		const found = perks.find((p) => p.id === id);
		if (!found) throw new Error(`${id} not listed`);
		return found;
	};

	it('lists exactly the 19 expected perks', () => {
		expect(perks.map((p) => p.id).sort()).toEqual(
			[
				'perk_axeman',
				'perk_blacksmith',
				'perk_brewer',
				'perk_carpenter',
				'perk_compost_chemist',
				'perk_cook',
				'perk_cook_2',
				'perk_cremator',
				'perk_cube_distillations',
				'perk_engineer',
				'perk_fireman',
				'perk_fishcutter',
				'perk_gearmaster',
				'perk_glassworker',
				'perk_paper_maker',
				'perk_winemaster',
				'zperk_miller',
				'zperk_tailor',
				'perk_heat_saver'
			].sort()
		);
	});

	it('leaves out perks the calculator does not read', () => {
		const listed = new Set(perks.map((p) => p.id));
		for (const id of [
			'perk_builder',
			'perk_alchemist',
			'perk_mason',
			'perk_golddigger',
			'zperk_magpies_eye',
			'perk_farmer',
			'perk_farmer_2',
			'perk_seedmaster',
			'perk_grapemaster',
			'perk_rich_surgeon'
		]) {
			expect(listed.has(id), id).toBe(false);
		}
	});

	it('matches spot checks', () => {
		expect(byId('perk_blacksmith').affects).toContain('Iron Nails');
		expect(byId('perk_fireman').affects).toContain('Iron Ingot');
		expect(byId('perk_heat_saver').affects).toContain('Bread');
		expect(byId('zperk_miller').affects).toEqual(['Flour']);
		// Two crafts are named "Fabric": the conveyor one is hidden, the Weaving Loom one is not.
		const tailor = byId('zperk_tailor').affects;
		expect(tailor.filter((n) => n.startsWith('Supply:'))).toEqual([]);
		expect(tailor).toEqual(['Flax Thread', 'Fabric']);
	});

	it('gives every perk a non-empty, duplicate-free affects list', () => {
		for (const p of perks) {
			expect(p.affects.length, p.id).toBeGreaterThan(0);
			expect(new Set(p.affects).size, p.id).toBe(p.affects.length);
		}
	});
});
