import { gameModel } from '#lib/calc/gameModel';
import type { Target } from '#lib/calc/model';
import type { PlanTarget } from '#lib/calc/planner';

/** localStorage key for the saved targets. */
export const STORAGE_KEY = 'gk2calc.targets';

const FORMAT_VERSION = 1;

export interface QueuedTarget extends PlanTarget {
	/** `kind:id`, unique in the queue. */
	key: string;
	name: string;
	icon: string | null;
}

/** Something in the saved data, or the storage itself, that couldn't be used. */
export type TargetProblem =
	| { kind: 'unknownTarget'; key: string }
	| { kind: 'unreadable' }
	| { kind: 'storageBlocked' };

const keyOf = (t: Pick<Target, 'kind' | 'id'>) => `${t.kind}:${t.id}`;

/** Saved text (or null) to queued targets, dropping anything unusable, plus the problems found. */
export function parseTargets(
	raw: string | null,
	targets: Target[]
): { items: QueuedTarget[]; problems: TargetProblem[] } {
	if (raw === null) return { items: [], problems: [] };
	let saved: unknown;
	try {
		saved = JSON.parse(raw);
	} catch {
		return { items: [], problems: [{ kind: 'unreadable' }] };
	}
	const value = saved as { version?: unknown; targets?: unknown } | null;
	if (
		typeof value !== 'object' ||
		value === null ||
		value.version !== FORMAT_VERSION ||
		!Array.isArray(value.targets)
	) {
		return { items: [], problems: [{ kind: 'unreadable' }] };
	}

	const byKey = new Map(targets.map((t) => [keyOf(t), t]));
	const items: QueuedTarget[] = [];
	const problems: TargetProblem[] = [];
	for (const entry of value.targets as unknown[]) {
		const e = entry as { kind?: unknown; id?: unknown; quantity?: unknown } | null;
		const valid =
			typeof e === 'object' &&
			e !== null &&
			(e.kind === 'item' || e.kind === 'building') &&
			typeof e.id === 'string' &&
			Number.isInteger(e.quantity) &&
			(e.quantity as number) >= 1;
		if (!valid) {
			problems.push({ kind: 'unreadable' });
			continue;
		}
		const key = `${e.kind}:${e.id}`;
		const target = byKey.get(key);
		if (!target) problems.push({ kind: 'unknownTarget', key });
		else if (!items.some((t) => t.key === key)) {
			items.push({ ...toQueued(target), quantity: e.quantity as number });
		}
	}
	return { items, problems };
}

/** Queued targets to the saved text format. */
export function serializeTargets(items: QueuedTarget[]): string {
	return JSON.stringify({
		version: FORMAT_VERSION,
		targets: items.map(({ kind, id, quantity }) => ({ kind, id, quantity }))
	});
}

/** One message per kind of problem, in a fixed order. */
export function targetWarnings(problems: TargetProblem[]): string[] {
	const messages: string[] = [];
	const unknown = problems.filter((p) => p.kind === 'unknownTarget').map((p) => p.key);
	if (unknown.length > 0) {
		messages.push(
			`Some saved targets are no longer in the data and were dropped: ${unknown.join(', ')}.`
		);
	}
	if (problems.some((p) => p.kind === 'unreadable')) {
		messages.push("Some saved targets couldn't be read and were dropped.");
	}
	if (problems.some((p) => p.kind === 'storageBlocked')) {
		messages.push(
			"Your browser is blocking storage, so your targets won't be kept after a reload."
		);
	}
	return messages;
}

function toQueued(target: Target): QueuedTarget {
	return {
		key: keyOf(target),
		kind: target.kind,
		id: target.id,
		name: target.name,
		icon: target.icon,
		quantity: 1
	};
}

/**
 * The targets the plan is for, in the order added, saved to browser storage on every change.
 * They stay until removed. Nothing touches storage until `load()`, as the page is prerendered.
 */
export class TargetQueue {
	readonly #targets: Target[];
	readonly #getStorage: () => Storage;

	items: QueuedTarget[] = $state([]);
	problems: TargetProblem[] = $state([]);

	get warnings(): string[] {
		return targetWarnings(this.problems);
	}

	constructor(targets: Target[], getStorage: () => Storage = () => localStorage) {
		this.#targets = targets;
		this.#getStorage = getStorage;
	}

	/** Reads the saved targets. Anything unusable is dropped, reported and re-saved. */
	load(): void {
		let raw: string | null;
		try {
			raw = this.#getStorage().getItem(STORAGE_KEY);
		} catch {
			this.#blocked();
			return;
		}
		const { items, problems } = parseTargets(raw, this.#targets);
		this.items = items;
		this.problems = problems;
		if (problems.length > 0) this.#save();
	}

	/** Adds a target with quantity 1. Returns its key; a target already queued isn't added twice. */
	add(target: Target): string {
		const key = keyOf(target);
		if (!this.items.some((t) => t.key === key)) {
			this.items.push(toQueued(target));
			this.#save();
		}
		return key;
	}

	/** Sets a quantity; ignores anything but whole numbers of 1 or more. */
	setQuantity(key: string, quantity: number): void {
		if (!Number.isInteger(quantity) || quantity < 1) return;
		const item = this.items.find((t) => t.key === key);
		if (!item) return;
		item.quantity = quantity;
		this.#save();
	}

	/**
	 * Moves a target one place up (-1) or down (1). The order decides which target gets
	 * inventory and spare first. Does nothing at either end.
	 */
	move(key: string, by: -1 | 1): void {
		const from = this.items.findIndex((t) => t.key === key);
		const to = from + by;
		if (from < 0 || to < 0 || to >= this.items.length) return;
		const items = [...this.items];
		[items[from], items[to]] = [items[to], items[from]];
		this.items = items;
		this.#save();
	}

	remove(key: string): void {
		this.items = this.items.filter((t) => t.key !== key);
		this.#save();
	}

	has(target: Pick<Target, 'kind' | 'id'>): boolean {
		const key = keyOf(target);
		return this.items.some((t) => t.key === key);
	}

	dismissWarnings(): void {
		this.problems = [];
	}

	#save(): void {
		try {
			this.#getStorage().setItem(STORAGE_KEY, serializeTargets(this.items));
		} catch {
			this.#blocked();
		}
	}

	#blocked(): void {
		if (this.problems.some((p) => p.kind === 'storageBlocked')) return;
		this.problems = [...this.problems, { kind: 'storageBlocked' }];
	}
}

/** The app's target queue, over the targets in the game data. */
export const targetQueue = new TargetQueue(gameModel.targets);
