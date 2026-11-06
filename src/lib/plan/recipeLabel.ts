import { evaluateQuantity } from '#lib/calc/formula';
import { baseBuildingId, type Model } from '#lib/calc/model';
import { FUEL_ID } from '#lib/calc/planner';
import type { PerkLevels } from '#lib/perks/levels';

/**
 * A dropdown label that tells recipes apart: what one craft takes and where it's done, e.g.
 * "2 Wheat → 1 · Millstone". Many alternatives share a name (seed oil, quality tiers), so
 * the inputs and station say more than the name.
 */
export function recipeLabel(
	model: Model,
	recipeId: string,
	itemKey: string,
	levels: PerkLevels
): string {
	const recipe = model.recipes.get(recipeId);
	if (!recipe) return recipeId;
	const amount = (q: Parameters<typeof evaluateQuantity>[0]) => evaluateQuantity(q, levels);
	const inputs = recipe.inputs
		.map((line) =>
			line.id === FUEL_ID
				? `${amount(line.count)} fuel`
				: `${amount(line.count)} ${model.resolve(line).name}`
		)
		.join(', ');
	const out = recipe.outputs.find((o) => o.id === itemKey) ?? recipe.outputs[0];
	const made = out ? amount(out.count) : 0;
	const stations =
		recipe.stations.map((s) => model.nameOf(baseBuildingId(s))).join(' or ') || 'Station unknown';
	return `${inputs || 'Nothing'} → ${made} · ${stations}`;
}
