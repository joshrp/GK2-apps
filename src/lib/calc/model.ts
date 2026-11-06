import type { Craft, Gk2Data, ItemStack, Quantity, RefKind } from '#lib/data/gk2';
import { COMES_WITH_GAME, KNOWN_STATION_COSTS, STATION_FIXES, STORAGE_ONLY } from './stationFixes';

/** An ingredient line: an input of a craft, or a line of a build cost. */
export interface Line {
	id: string;
	refKind: RefKind;
	count: Quantity;
}

/** A craft the calculator can follow. */
export interface Recipe {
	id: string;
	name: string;
	inputs: Line[];
	/** Guaranteed outputs (no `chance`): item id, or quality family for ★ outputs. */
	outputs: { id: string; count: Quantity }[];
	/** Station ids, from the export or the station fixes. Empty = station unknown. */
	stations: string[];
}

/** A recipe that makes an item, and how many one craft gives. */
export interface Producer {
	recipeId: string;
	yield: Quantity;
}

/** A placeable building: `X` and `X_place` merged. */
export interface Building {
	id: string;
	name: string;
	icon: string | null;
	hidden: boolean;
	/** The Place action's cost. */
	cost: Line[];
}

export type StationCost =
	| { kind: 'build'; buildingId: string }
	| { kind: 'comesWithGame' }
	| { kind: 'unknown' };

export interface Station {
	id: string;
	name: string;
	icon: string | null;
	cost: StationCost;
	/** Listed for completeness only; no recipe runs there (firewood sheds). */
	storageOnly: boolean;
}

/** Something the picker offers. */
export interface Target {
	kind: 'item' | 'building';
	id: string;
	name: string;
	icon: string | null;
	hidden: boolean;
}

/** How an ingredient line is met. */
export type Need =
	| {
			kind: 'item';
			/** Item id, or a quality family id when any tier will do. */
			id: string;
			name: string;
			/** Empty: a Required item (gather / buy). */
			producers: Producer[];
			/** A specific tier only a ★ craft makes, whose tier is rolled. */
			tierNotGuaranteed: boolean;
	  }
	| {
			/** An "any of" group that isn't one quality family: one gather line. */
			kind: 'anyOf';
			id: string;
			name: string;
	  };

export interface Model {
	recipes: Map<string, Recipe>;
	/** Item id (or quality family id) → recipes making it, in game order. */
	producers: Map<string, Producer[]>;
	buildings: Map<string, Building>;
	/** Stations used by the recipes, plus the storage-only ones; sorted by name. */
	stations: Station[];
	/** Crafted items and buildings, sorted by name. */
	targets: Target[];
	/** How an ingredient line is met. */
	resolve(line: Pick<Line, 'id' | 'refKind'>): Need;
	/** Display name of an item, family, station, building or other id. */
	nameOf(id: string): string;
}

/** Crafts the calculator follows: not dev, conveyor or zombie, with a guaranteed output. */
export function isUsableCraft(craft: Craft): boolean {
	return (
		!craft.likelyDev &&
		!craft.flags.includes('conveyor') &&
		!craft.id.includes('zombie') &&
		craft.outputs.some((o) => o.chance === null)
	);
}

/** `X_place` → `X`; the two are one building. */
export function baseBuildingId(id: string): string {
	return id.endsWith('_place') ? id.slice(0, -'_place'.length) : id;
}

/** The family of a quality item: `cabbage:2` → `cabbage`. */
export function familyOf(id: string): string {
	const at = id.indexOf(':');
	return at === -1 ? id : id.slice(0, at);
}

const TIERS = new Set(['1', '2', '3']);

/** Picker rule: dev content, unnamed records and `<sprite …>` names are hidden by default. */
function isHidden(name: string | null, likelyDev: boolean): boolean {
	return likelyDev || name === null || name.includes('<sprite');
}

const toLine = (s: ItemStack): Line => ({ id: s.id, refKind: s.refKind, count: s.count });

export function buildModel(data: Gk2Data): Model {
	const items = new Map(data.items.map((i) => [i.id, i]));
	const groups = new Map(data.itemGroups.map((g) => [g.id, g]));

	// Recipes and producers.
	const recipes = new Map<string, Recipe>();
	const producers = new Map<string, Producer[]>();
	for (const craft of data.crafts) {
		if (!isUsableCraft(craft)) continue;
		const fix = STATION_FIXES[craft.id];
		const outputs = craft.outputs
			.filter((o) => o.chance === null)
			.flatMap((o) => {
				const count = o.count ?? o.min;
				return count === null ? [] : [{ id: o.id, count }];
			});
		recipes.set(craft.id, {
			id: craft.id,
			name: craft.name ?? data.names[craft.id] ?? craft.id,
			inputs: craft.inputs.map(toLine),
			outputs,
			stations: craft.stations.length > 0 ? craft.stations : fix ? [fix] : []
		});
		for (const o of outputs) {
			const list = producers.get(o.id) ?? [];
			list.push({ recipeId: craft.id, yield: o.count });
			producers.set(o.id, list);
		}
	}

	// Buildings: X and X_place merged. X's name and icon win. The Place cost is X_place's when it
	// has one (that's the action techs unlock where the two differ), else X's.
	const buildables = new Map(data.buildables.map((b) => [b.id, b]));
	const techNames = new Map(data.techs.map((t) => [t.id, t.name ?? '']));
	const buildings = new Map<string, Building>();
	for (const b of data.buildables) {
		const id = baseBuildingId(b.id);
		if (buildings.has(id)) continue;
		const pair = [buildables.get(id), buildables.get(`${id}_place`)].filter((x) => x !== undefined);
		const known = KNOWN_STATION_COSTS[id];
		const place = [...pair]
			.reverse()
			.flatMap((x) => x.actions)
			.find((a) => a.mode === 'Place');
		if (!place && !known) continue;
		const name = pair.find((x) => x.name)?.name ?? null;
		const zombieOrConveyor =
			id.startsWith('conveyor_') ||
			id.includes('zombie') ||
			pair
				.flatMap((x) => x.actions)
				.some((a) =>
					a.unlock.sources.some(
						(s) => s.via === 'tech' && /zombie/i.test(techNames.get(s.techId) ?? '')
					)
				);
		buildings.set(id, {
			id,
			name: name ?? data.names[id] ?? id,
			icon: pair.find((x) => x.icon)?.icon ?? null,
			hidden:
				zombieOrConveyor ||
				isHidden(
					name,
					pair.every((x) => x.likelyDev)
				),
			cost: known
				? known.map(([costId, count]) => ({ id: costId, refKind: 'item' as const, count }))
				: (place?.cost ?? []).map(toLine)
		});
	}
	// Known costs for stations a recipe uses that aren't buildables at all (e.g. Kitchen Table II).
	const usedStations = new Set(
		[...recipes.values()].flatMap((r) => r.stations.map(baseBuildingId))
	);
	for (const [id, cost] of Object.entries(KNOWN_STATION_COSTS)) {
		if (buildings.has(id) || !usedStations.has(id)) continue;
		buildings.set(id, {
			id,
			name: data.names[id] ?? id,
			icon: null,
			hidden: false,
			cost: cost.map(([costId, count]) => ({ id: costId, refKind: 'item', count }))
		});
	}

	const nameOf = (id: string): string => {
		const item = items.get(id);
		if (item?.name) return item.name;
		const building = buildings.get(baseBuildingId(id));
		if (building) return building.name;
		const buildable = buildables.get(id)?.name;
		if (buildable) return buildable;
		if (data.names[id]) return data.names[id];
		const member = data.items.find((i) => familyOf(i.id) === id && i.name);
		return member?.name ?? id;
	};

	// Stations used by the recipes, plus the storage-only ones.
	const stationIds = new Set<string>();
	for (const r of recipes.values()) for (const s of r.stations) stationIds.add(baseBuildingId(s));
	for (const s of STORAGE_ONLY) stationIds.add(s);
	const stations: Station[] = [...stationIds]
		.map((id) => ({
			id,
			name: nameOf(id),
			icon: buildables.get(id)?.icon ?? buildables.get(`${id}_place`)?.icon ?? null,
			cost: buildings.has(id)
				? { kind: 'build' as const, buildingId: id }
				: COMES_WITH_GAME.has(id)
					? { kind: 'comesWithGame' as const }
					: { kind: 'unknown' as const },
			storageOnly: STORAGE_ONLY.has(id)
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	/** A group whose members are all tiers of one quality family, e.g. `gr_stories`. */
	const groupFamily = (groupId: string): string | null => {
		const members = groups.get(groupId)?.members ?? [];
		const families = new Set(members.map(familyOf));
		const tiered = members.every((m) => TIERS.has(items.get(m)?.quality ?? ''));
		return members.length > 0 && tiered && families.size === 1 ? [...families][0] : null;
	};

	const resolve = (line: Pick<Line, 'id' | 'refKind'>): Need => {
		if (line.refKind === 'itemGroup') {
			const family = groupFamily(line.id);
			if (family) return familyNeed(family);
			const names = [...new Set((groups.get(line.id)?.members ?? []).map(nameOf))];
			const name =
				names.length === 0
					? line.id
					: names.length === 1
						? `${names[0]} (any)`
						: names.join(' or ');
			return { kind: 'anyOf', id: line.id, name };
		}
		if (line.refKind === 'anyQuality') return familyNeed(line.id);
		const direct = producers.get(line.id) ?? [];
		const tier = items.get(line.id)?.quality;
		if (direct.length === 0 && tier && TIERS.has(tier)) {
			const star = producers.get(familyOf(line.id)) ?? [];
			if (star.length > 0) {
				return {
					kind: 'item',
					id: line.id,
					name: tierName(line.id),
					producers: star,
					tierNotGuaranteed: true
				};
			}
		}
		return {
			kind: 'item',
			id: line.id,
			name: tierName(line.id),
			producers: direct,
			tierNotGuaranteed: false
		};
	};

	function familyNeed(family: string): Need {
		return {
			kind: 'item',
			id: family,
			name: `${nameOf(family)} (any tier)`,
			producers: producers.get(family) ?? [],
			tierNotGuaranteed: false
		};
	}

	/** "Cabbage ★2" for quality tiers, the plain name otherwise. */
	function tierName(id: string): string {
		const tier = items.get(id)?.quality;
		return tier && TIERS.has(tier) ? `${nameOf(id)} ★${tier}` : nameOf(id);
	}

	// Picker targets: items some recipe makes (a tier counts when its family has a ★ craft),
	// and buildings with a Place cost.
	const targets: Target[] = [];
	for (const item of data.items) {
		const need = resolve({ id: item.id, refKind: 'item' });
		if (need.kind !== 'item' || need.producers.length === 0) continue;
		targets.push({
			kind: 'item',
			id: item.id,
			name: tierName(item.id),
			icon: item.icon,
			hidden: isHidden(item.name, item.likelyDev)
		});
	}
	for (const b of buildings.values()) {
		targets.push({ kind: 'building', id: b.id, name: b.name, icon: b.icon, hidden: b.hidden });
	}
	targets.sort((a, b) => a.name.localeCompare(b.name));

	return { recipes, producers, buildings, stations, targets, resolve, nameOf };
}
