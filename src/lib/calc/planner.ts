import type { PerkLevels } from '#lib/perks/levels';
import { evaluateQuantity } from './formula';
import type { Line, Model, Need } from './model';

/** Fuel lines are counted as furnace fuel units, not as an item. */
export const FUEL_ID = 'fire';

export interface PlanTarget {
	kind: 'item' | 'building';
	id: string;
	quantity: number;
}

export interface PlanInput {
	targets: PlanTarget[];
	levels: PerkLevels;
	/** Item key → chosen recipe id. Ignored when it isn't a recipe for that item. */
	recipeChoices?: Record<string, string>;
	/** Station ids the player has. */
	owned?: Iterable<string>;
	/** Station ids the player chose to build: their build cost is added to the plan. */
	build?: Iterable<string>;
	/** Count the player has, by item key. Missing = 0. Used up once across the plan. */
	inventory?: Record<string, number>;
}

export type StationStatus = 'owned' | 'toBuild' | 'missing';

export interface StationOption {
	id: string;
	name: string;
	status: StationStatus;
}

export interface CraftStep {
	recipeId: string;
	recipeName: string;
	/** Every recipe that makes this item, for the dropdown. */
	options: { id: string; name: string }[];
	crafts: number;
	/** Guaranteed amount per craft at the current perk levels. */
	yield: number;
	/** Made beyond the need; goes into the spare pool. */
	spare: number;
	/** Where it can be done; stacked when more than one. Empty = station unknown. */
	stations: StationOption[];
	/** No listed station is owned or being built. */
	notBuilt: boolean;
	/** A specific tier made by a ★ craft, whose tier is rolled. */
	tierNotGuaranteed: boolean;
}

export type LeafReason = 'noRecipe' | 'anyOf' | 'cycle' | 'noYield';

export interface ItemNode {
	kind: 'item';
	/** Inventory and spare-pool key: item id, quality family or group id. */
	key: string;
	name: string;
	/** Amount this line asks for. */
	need: number;
	fromInventory: number;
	/** Of the count entered for this key, how much earlier lines in the plan already used. */
	usedEarlier: number;
	fromSpare: number;
	/** How it's made, or null for a Required item. */
	craft: CraftStep | null;
	/** Why it's a Required item (when `craft` is null). */
	leafReason: LeafReason | null;
	children: PlanNode[];
}

export interface FuelNode {
	kind: 'fuel';
	need: number;
}

export interface BuildingNode {
	kind: 'building';
	id: string;
	name: string;
	quantity: number;
	/** Added because the player chose to build this station. */
	forStation: boolean;
	children: PlanNode[];
}

export type PlanNode = ItemNode | FuelNode | BuildingNode;

export interface Plan {
	/** Targets in order, then stations chosen to build. */
	roots: PlanNode[];
	/** Items to gather or buy, after inventory, in first-seen order. */
	required: { key: string; name: string; quantity: number }[];
	fuel: number;
	/** Distinct station choices the plan uses ("Iron Anvil or Steel Anvil" is one group). */
	stationGroups: StationOption[][];
	/** Stations in groups where none is owned or being built, plus those chosen to build. */
	stationsToBuild: { id: string; name: string; buildable: boolean; chosen: boolean }[];
}

/**
 * Works out a combined plan for the targets. Pure: the same input gives the same plan.
 *
 * Lines are worked through depth first in target order. For each item line, inventory is used
 * first, then spare from earlier crafts, then crafts = ceil(shortfall / yield); the extra goes
 * into the spare pool. An item already among its own ancestors becomes a Required item.
 */
export function plan(model: Model, input: PlanInput): Plan {
	const owned = new Set(input.owned ?? []);
	const toBuild = [...new Set(input.build ?? [])].filter((id) => {
		const station = model.stations.find((s) => s.id === id);
		return station?.cost.kind === 'build';
	});
	const building = new Set(toBuild);
	const inventory = new Map(Object.entries(input.inventory ?? {}));
	const spare = new Map<string, number>();
	const required = new Map<string, { key: string; name: string; quantity: number }>();
	const groups = new Map<string, StationOption[]>();
	let fuel = 0;

	const amount = (q: Line['count']) => evaluateQuantity(q, input.levels);
	const stationName = (id: string) =>
		model.stations.find((s) => s.id === id)?.name ?? model.nameOf(id);
	const statusOf = (id: string): StationStatus =>
		owned.has(id) ? 'owned' : building.has(id) ? 'toBuild' : 'missing';

	const take = (pool: Map<string, number>, key: string, wanted: number) => {
		const got = Math.min(pool.get(key) ?? 0, wanted);
		if (got > 0) pool.set(key, (pool.get(key) ?? 0) - got);
		return got;
	};

	const addRequired = (key: string, name: string, quantity: number) => {
		if (quantity <= 0) return;
		const entry = required.get(key);
		if (entry) entry.quantity += quantity;
		else required.set(key, { key, name, quantity });
	};

	/** Default recipe: the first at a station owned or being built, else the first. */
	const chooseProducer = (key: string, producers: Extract<Need, { kind: 'item' }>['producers']) => {
		const chosen = input.recipeChoices?.[key];
		const byChoice = producers.find((p) => p.recipeId === chosen);
		if (byChoice) return byChoice;
		const atOwned = producers.find((p) =>
			(model.recipes.get(p.recipeId)?.stations ?? []).some((s) => owned.has(s) || building.has(s))
		);
		return atOwned ?? producers[0];
	};

	function expandLine(
		line: Pick<Line, 'id' | 'refKind'>,
		need: number,
		ancestors: Set<string>
	): PlanNode {
		if (line.id === FUEL_ID) {
			fuel += need;
			return { kind: 'fuel', need };
		}
		return expandNeed(model.resolve(line), need, ancestors);
	}

	function expandNeed(resolved: Need, need: number, ancestors: Set<string>): ItemNode {
		const key = resolved.id;
		const usedEarlier = (input.inventory?.[key] ?? 0) - (inventory.get(key) ?? 0);
		const fromInventory = take(inventory, key, need);
		const fromSpare = take(spare, key, need - fromInventory);
		const shortfall = need - fromInventory - fromSpare;
		const node: ItemNode = {
			kind: 'item',
			key,
			name: resolved.name,
			need,
			fromInventory,
			usedEarlier,
			fromSpare,
			craft: null,
			leafReason: null,
			children: []
		};

		const leaf = (reason: LeafReason) => {
			node.leafReason = reason;
			addRequired(key, resolved.name, shortfall);
			return node;
		};
		if (resolved.kind === 'anyOf') return leaf('anyOf');
		if (resolved.producers.length === 0) return leaf('noRecipe');
		if (ancestors.has(key)) return leaf('cycle');

		const producer = chooseProducer(key, resolved.producers);
		const recipe = model.recipes.get(producer.recipeId);
		const perCraft = amount(producer.yield);
		if (!recipe || perCraft <= 0) return leaf('noYield');

		const crafts = Math.ceil(shortfall / perCraft);
		const extra = crafts * perCraft - shortfall;
		if (extra > 0) spare.set(key, (spare.get(key) ?? 0) + extra);

		const stations = recipe.stations.map((id) => ({
			id,
			name: stationName(id),
			status: statusOf(id)
		}));
		if (stations.length > 0) {
			const groupKey = [...recipe.stations].sort().join('|');
			if (crafts > 0 && !groups.has(groupKey)) groups.set(groupKey, stations);
		}
		node.craft = {
			recipeId: recipe.id,
			recipeName: recipe.name,
			options: resolved.producers.map((p) => ({
				id: p.recipeId,
				name: model.recipes.get(p.recipeId)?.name ?? p.recipeId
			})),
			crafts,
			yield: perCraft,
			spare: extra,
			stations,
			notBuilt: stations.length > 0 && stations.every((s) => s.status === 'missing'),
			tierNotGuaranteed: resolved.tierNotGuaranteed
		};
		if (crafts > 0) {
			const inner = new Set(ancestors).add(key);
			node.children = recipe.inputs.map((i) => expandLine(i, amount(i.count) * crafts, inner));
		}
		return node;
	}

	function expandBuilding(id: string, quantity: number, forStation: boolean): BuildingNode {
		const b = model.buildings.get(id);
		return {
			kind: 'building',
			id,
			name: b?.name ?? model.nameOf(id),
			quantity,
			forStation,
			children: (b?.cost ?? []).map((l) => expandLine(l, amount(l.count) * quantity, new Set()))
		};
	}

	const roots: PlanNode[] = [];
	for (const t of input.targets) {
		if (t.quantity <= 0) continue;
		roots.push(
			t.kind === 'building'
				? expandBuilding(t.id, t.quantity, false)
				: expandNeed(model.resolve({ id: t.id, refKind: 'item' }), t.quantity, new Set())
		);
	}
	for (const id of toBuild) roots.push(expandBuilding(id, 1, true));

	const stationGroups = [...groups.values()];
	const toBuildList = new Map<string, Plan['stationsToBuild'][number]>();
	for (const group of stationGroups) {
		if (group.some((s) => s.status !== 'missing')) continue;
		for (const s of group) {
			const station = model.stations.find((x) => x.id === s.id);
			toBuildList.set(s.id, {
				id: s.id,
				name: s.name,
				buildable: station?.cost.kind === 'build',
				chosen: false
			});
		}
	}
	for (const id of toBuild) {
		toBuildList.set(id, { id, name: stationName(id), buildable: true, chosen: true });
	}

	return {
		roots,
		required: [...required.values()],
		fuel,
		stationGroups,
		stationsToBuild: [...toBuildList.values()]
	};
}
