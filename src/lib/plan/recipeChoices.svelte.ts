import { gameModel } from '#lib/calc/gameModel';

/** localStorage key for the recipe chosen per item. */
export const STORAGE_KEY = 'gk2calc.recipeChoices';

const FORMAT_VERSION = 1;

export type RecipeChoiceMap = Record<string, string>;

/** Something in the saved data, or the storage itself, that couldn't be used. */
export type ChoiceProblem =
	| { kind: 'unknownRecipe'; item: string; recipe: string }
	| { kind: 'unreadable' }
	| { kind: 'storageBlocked' };

/** Saved text (or null) to choices whose recipe still exists, plus the problems found. */
export function parseChoices(
	raw: string | null,
	recipeIds: ReadonlySet<string>
): { choices: RecipeChoiceMap; problems: ChoiceProblem[] } {
	if (raw === null) return { choices: {}, problems: [] };
	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { choices: {}, problems: [{ kind: 'unreadable' }] };
	}
	const value = saved as { version?: unknown; choices?: unknown } | null;
	if (
		typeof value !== 'object' ||
		value === null ||
		value.version !== FORMAT_VERSION ||
		typeof value.choices !== 'object' ||
		value.choices === null ||
		Array.isArray(value.choices)
	) {
		return { choices: {}, problems: [{ kind: 'unreadable' }] };
	}
	const choices: RecipeChoiceMap = {};
	const problems: ChoiceProblem[] = [];
	for (const [item, recipe] of Object.entries(value.choices)) {
		if (typeof recipe !== 'string') problems.push({ kind: 'unreadable' });
		else if (!recipeIds.has(recipe)) problems.push({ kind: 'unknownRecipe', item, recipe });
		else choices[item] = recipe;
	}
	return { choices, problems };
}

export function serializeChoices(choices: RecipeChoiceMap): string {
	return JSON.stringify({ version: FORMAT_VERSION, choices });
}

/** One message per kind of problem, in a fixed order. */
export function choiceWarnings(problems: ChoiceProblem[]): string[] {
	const messages: string[] = [];
	const unknown = problems.filter((p) => p.kind === 'unknownRecipe').map((p) => p.item);
	if (unknown.length > 0) {
		messages.push(
			`Some chosen recipes are no longer in the data, so the default is used for: ${unknown.join(', ')}.`
		);
	}
	if (problems.some((p) => p.kind === 'unreadable')) {
		messages.push("Some saved recipe choices couldn't be read, so the default is used.");
	}
	if (problems.some((p) => p.kind === 'storageBlocked')) {
		messages.push(
			"Your browser is blocking storage, so recipe choices won't be kept after a reload."
		);
	}
	return messages;
}

/**
 * The recipe chosen for each item, saved to browser storage on every change. Applies wherever
 * the item appears in the plan. Nothing touches storage until `load()` (prerendered page).
 */
export class RecipeChoices {
	readonly #recipeIds: ReadonlySet<string>;
	readonly #getStorage: () => Storage;

	choices: RecipeChoiceMap = $state({});
	problems: ChoiceProblem[] = $state([]);

	get warnings(): string[] {
		return choiceWarnings(this.problems);
	}

	constructor(recipeIds: Iterable<string>, getStorage: () => Storage = () => localStorage) {
		this.#recipeIds = new Set(recipeIds);
		this.#getStorage = getStorage;
	}

	load(): void {
		let raw: string | null;
		try {
			raw = this.#getStorage().getItem(STORAGE_KEY);
		} catch {
			this.#blocked();
			return;
		}
		const { choices, problems } = parseChoices(raw, this.#recipeIds);
		this.choices = choices;
		this.problems = problems;
		if (problems.length > 0) this.#save();
	}

	/** Chooses a recipe for an item and saves. Ignores recipes not in the data. */
	choose(item: string, recipe: string): void {
		if (!this.#recipeIds.has(recipe) || this.choices[item] === recipe) return;
		this.choices = { ...this.choices, [item]: recipe };
		this.#save();
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#save(): void {
		try {
			this.#getStorage().setItem(STORAGE_KEY, serializeChoices(this.choices));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's recipe choices, over the recipes in the game data. */
export const recipeChoices = new RecipeChoices(gameModel.recipes.keys());
