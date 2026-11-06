import type { Craft, Gk2Data, Quantity } from '#lib/data/gk2';

export interface PerkDef {
	/** Game perk id, e.g. 'perk_blacksmith' or 'zperk_tailor'. */
	id: string;
	/** Display name from `data.names`, falling back to the id. */
	name: string;
	/** Display names of the recipes this perk changes: de-duplicated, in game order. */
	affects: string[];
}

const PARAM_CALL = /(?:PPar|WorkerPar)\("([^"]+)"\)/g;

/** Perk ids used by PPar/WorkerPar in a quantity; [] for numbers, null and plain formulas. */
export function formulaParams(q: Quantity | null): string[] {
	if (q === null || typeof q === 'number') return [];
	return [...new Set(Array.from(q.formula.matchAll(PARAM_CALL), (m) => m[1]))];
}

/** Crafts the calculator can use: not dev content, and no conveyors (not in use yet). */
function isUsable(craft: Craft): boolean {
	return !craft.likelyDev && !craft.flags.includes('conveyor');
}

/** Quantities the calculator reads: guaranteed output count/min, and input counts. */
function readQuantities(craft: Craft): (Quantity | null)[] {
	const outputs = craft.outputs.filter((o) => o.chance === null).flatMap((o) => [o.count, o.min]);
	return [...outputs, ...craft.inputs.map((i) => i.count)];
}

/** Names shown before the "+N more" button, and how many it hides. Up to 4 show in full. */
export function previewAffects(affects: string[]): { shown: string[]; hidden: number } {
	if (affects.length <= 4) return { shown: affects, hidden: 0 };
	return { shown: affects.slice(0, 3), hidden: affects.length - 3 };
}

/** Perks that change the calculator's results, sorted by name. */
export function listPerks(data: Gk2Data): PerkDef[] {
	const affects = new Map<string, Set<string>>();
	for (const craft of data.crafts) {
		if (!isUsable(craft)) continue;
		const recipe = craft.name ?? data.names[craft.id] ?? craft.id;
		for (const perk of new Set(readQuantities(craft).flatMap(formulaParams))) {
			let recipes = affects.get(perk);
			if (!recipes) {
				recipes = new Set();
				affects.set(perk, recipes);
			}
			recipes.add(recipe);
		}
	}
	return Array.from(affects, ([id, recipes]) => ({
		id,
		name: data.names[id] ?? id,
		affects: [...recipes]
	})).sort((a, b) => a.name.localeCompare(b.name));
}
