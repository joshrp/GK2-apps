import type { BuildAction, Buildable, Craft, Gk2Data, Item, ItemOutput } from '#lib/data/gk2';

/** Builders for small game-data fixtures in tests. Fields default to empty / not set. */

export function craft(id: string, overrides: Partial<Craft> = {}): Craft {
	return {
		id,
		name: id,
		nameSource: null,
		icon: null,
		likelyDev: false,
		raw: null,
		description: null,
		iconSource: null,
		iconId: null,
		stations: [],
		inputs: [],
		outputs: [output(id)],
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

export function output(id: string, overrides: Partial<ItemOutput> = {}): ItemOutput {
	return {
		id,
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

export function item(id: string, name: string | null = id, overrides: Partial<Item> = {}): Item {
	const at = id.indexOf(':');
	return {
		id,
		name,
		nameSource: null,
		icon: null,
		likelyDev: false,
		raw: null,
		description: null,
		iconId: null,
		quality: at === -1 ? null : id.slice(at + 1),
		groups: [],
		stackCount: 1,
		basePrice: 0,
		type: 0,
		flags: [],
		madeBy: [],
		usedIn: [],
		...overrides
	};
}

export function action(
	id: string,
	mode: BuildAction['mode'],
	cost: [string, number][] = []
): BuildAction {
	return {
		id,
		mode,
		name: null,
		nameSource: null,
		icon: null,
		iconId: null,
		cost: cost.map(([costId, count]) => ({ id: costId, refKind: 'item', count })),
		outputs: [],
		builders: [],
		startCraft: null,
		limit: null,
		unlock: { required: false, sources: [] },
		likelyDev: false,
		raw: {}
	};
}

export function buildable(id: string, name: string | null, actions: BuildAction[]): Buildable {
	return {
		id,
		name,
		nameSource: null,
		icon: `icon_${id}`,
		likelyDev: false,
		raw: null,
		iconSource: null,
		actions,
		zones: [],
		craftsHere: []
	};
}

export function data(overrides: Partial<Gk2Data> = {}): Gk2Data {
	return {
		schemaVersion: '0.1.0',
		generatedAt: '',
		source: {
			game: 'Graveyard Keeper 2',
			steamAppId: 0,
			steamBuildId: 0,
			unityVersion: '',
			locale: 'en'
		},
		items: [],
		itemGroups: [],
		crafts: [],
		buildables: [],
		zones: [],
		techs: [],
		techTabs: [],
		names: {},
		...overrides
	};
}
