/** localStorage key for the saved perk levels. */
export const STORAGE_KEY = 'gk2calc.perkLevels';

const FORMAT_VERSION = 1;

/** Character perk level by perk id. */
export type PerkLevels = Record<string, number>;

/** Something in the saved data, or the storage itself, that couldn't be used. */
export type LevelProblem =
	| { kind: 'badValue'; id: string; value: unknown }
	| { kind: 'unknownPerk'; id: string; value: unknown }
	| { kind: 'unreadable' }
	| { kind: 'storageBlocked' };

/** A whole number of 0 or more. */
export function isValidLevel(value: unknown): value is number {
	return Number.isInteger(value) && (value as number) >= 0;
}

/** A level typed into an input: digits only (spaces around allowed), else null. */
export function parseLevelInput(text: string): number | null {
	const trimmed = text.trim();
	return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Every perk at level 0. */
export function zeroLevels(perkIds: string[]): PerkLevels {
	return Object.fromEntries(perkIds.map((id) => [id, 0]));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Saved text (or null when nothing is saved) to clean levels plus the problems found. */
export function parseLevels(
	raw: string | null,
	perkIds: string[]
): { levels: PerkLevels; problems: LevelProblem[] } {
	const levels = zeroLevels(perkIds);
	if (raw === null) return { levels, problems: [] };

	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { levels, problems: [{ kind: 'unreadable' }] };
	}
	if (!isPlainObject(saved) || saved.version !== FORMAT_VERSION || !isPlainObject(saved.levels)) {
		return { levels, problems: [{ kind: 'unreadable' }] };
	}

	const problems: LevelProblem[] = [];
	for (const [id, value] of Object.entries(saved.levels)) {
		if (!Object.hasOwn(levels, id)) problems.push({ kind: 'unknownPerk', id, value });
		else if (!isValidLevel(value)) problems.push({ kind: 'badValue', id, value });
		else levels[id] = value;
	}
	return { levels, problems };
}

/** Levels to the saved text format. */
export function serializeLevels(levels: PerkLevels): string {
	return JSON.stringify({ version: FORMAT_VERSION, levels });
}

function showValue(value: unknown): string {
	return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

/** One message per kind of problem, in a fixed order. Perks are named from `names`, else by id. */
export function warningMessages(problems: LevelProblem[], names: Record<string, string>): string[] {
	type PerkProblem = Extract<LevelProblem, { id: string }>;
	const list = (kind: PerkProblem['kind'], byName: boolean) =>
		problems
			.filter((p): p is PerkProblem => p.kind === kind)
			.map((p) => `${(byName && names[p.id]) || p.id} (${showValue(p.value)})`)
			.join(', ');
	const has = (kind: LevelProblem['kind']) => problems.some((p) => p.kind === kind);

	const messages: string[] = [];
	if (has('badValue')) {
		messages.push(
			`Some saved perk levels weren't whole numbers of 0 or more and were set to 0: ${list('badValue', true)}.`
		);
	}
	if (has('unknownPerk')) {
		messages.push(
			`Some saved perk levels are for perks no longer listed and were dropped: ${list('unknownPerk', false)}.`
		);
	}
	if (has('unreadable')) {
		messages.push("Saved perk levels couldn't be read, so all perks start at 0.");
	}
	if (has('storageBlocked')) {
		messages.push("Your browser is blocking storage, so perk levels won't be kept after a reload.");
	}
	return messages;
}
