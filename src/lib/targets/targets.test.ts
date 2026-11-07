import { describe, expect, it } from 'vitest';
import { gameModel } from '#lib/calc/gameModel';
import type { Target } from '#lib/calc/model';
import { parseTargets, STORAGE_KEY, TargetQueue } from './targetQueue.svelte';

/** In-memory Storage with only the methods the queue uses. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		}
	} as Storage;
}

import { parseQuantity, searchTargets } from './targets';

const t = (id: string, name: string, hidden = false, kind: Target['kind'] = 'item'): Target => ({
	kind,
	id,
	name,
	icon: null,
	hidden
});

const targets = [
	t('beam', 'Wooden beam'),
	t('oiled', 'Oiled Beam'),
	t('bench', 'Beam bench', false, 'building'),
	t('test', 'Beam test', true),
	t('plank', 'Plank')
];

describe('searchTargets', () => {
	it('matches any case, names starting with the query first', () => {
		expect(searchTargets(targets, 'BEAM', false).map((x) => x.id)).toEqual([
			'bench',
			'beam',
			'oiled'
		]);
	});

	it('shows hidden targets only when asked', () => {
		expect(searchTargets(targets, 'beam', true).map((x) => x.id)).toContain('test');
	});

	it('matches nothing for an empty query, and respects the limit', () => {
		expect(searchTargets(targets, '  ', true)).toEqual([]);
		expect(searchTargets(targets, 'e', true, 2)).toHaveLength(2);
	});

	it('finds the spec check target in the game data', () => {
		expect(searchTargets(gameModel.targets, 'reinforced beam', false)[0]).toMatchObject({
			kind: 'item',
			id: 'reinforced_beam'
		});
	});
});

describe('parseQuantity', () => {
	it.each([
		['1', 1],
		[' 12 ', 12],
		['0', null],
		['', null],
		['-1', null],
		['1.5', null],
		['2e3', null]
	])('%j → %j', (text, expected) => {
		expect(parseQuantity(text)).toBe(expected);
	});
});

describe('TargetQueue', () => {
	it('adds with quantity 1, once per target, in order', () => {
		const q = new TargetQueue(targets, () => memoryStorage());
		q.add(targets[0]);
		q.add(targets[2]);
		expect(q.add(targets[0])).toBe('item:beam');
		expect(q.items.map((x) => [x.key, x.quantity])).toEqual([
			['item:beam', 1],
			['building:bench', 1]
		]);
		expect(q.has(targets[2])).toBe(true);
		expect(q.has(targets[1])).toBe(false);
	});

	it('sets valid quantities only', () => {
		const q = new TargetQueue(targets, () => memoryStorage());
		const key = q.add(targets[0]);
		q.setQuantity(key, 4);
		q.setQuantity(key, 0);
		q.setQuantity(key, 2.5);
		expect(q.items[0].quantity).toBe(4);
	});

	it('removes a target', () => {
		const q = new TargetQueue(targets, () => memoryStorage());
		const key = q.add(targets[0]);
		q.add(targets[1]);
		q.remove(key);
		expect(q.items.map((x) => x.id)).toEqual(['oiled']);
	});

	it('moves a target up or down one place, and saves the new order', () => {
		const storage = memoryStorage();
		const q = new TargetQueue(targets, () => storage);
		const beam = q.add(targets[0]);
		const oiled = q.add(targets[1]);
		const plank = q.add(targets[4]);
		q.move(plank, -1);
		expect(q.items.map((x) => x.id)).toEqual(['beam', 'plank', 'oiled']);
		q.move(beam, 1);
		expect(q.items.map((x) => x.id)).toEqual(['plank', 'beam', 'oiled']);
		// Nothing happens at either end.
		q.move(q.items[0].key, -1);
		q.move(oiled, 1);
		expect(q.items.map((x) => x.id)).toEqual(['plank', 'beam', 'oiled']);

		const next = new TargetQueue(targets, () => storage);
		next.load();
		expect(next.items.map((x) => x.id)).toEqual(['plank', 'beam', 'oiled']);
	});

	it('saves every change, so a new queue loads it until removed', () => {
		const storage = memoryStorage();
		const q = new TargetQueue(targets, () => storage);
		q.load();
		const beam = q.add(targets[0]);
		const bench = q.add(targets[2]);
		q.setQuantity(beam, 4);

		const next = new TargetQueue(targets, () => storage);
		next.load();
		expect(next.items.map((x) => [x.key, x.name, x.quantity])).toEqual([
			['item:beam', 'Wooden beam', 4],
			['building:bench', 'Beam bench', 1]
		]);

		next.remove(bench);
		const after = new TargetQueue(targets, () => storage);
		after.load();
		expect(after.items.map((x) => x.key)).toEqual(['item:beam']);
	});

	it('starts empty with nothing saved', () => {
		const q = new TargetQueue(targets, () => memoryStorage());
		q.load();
		expect(q.items).toEqual([]);
		expect(q.warnings).toEqual([]);
	});

	it('drops and reports unusable saved targets, then re-saves them cleaned', () => {
		const saved = JSON.stringify({
			version: 1,
			targets: [
				{ kind: 'item', id: 'beam', quantity: 2 },
				{ kind: 'item', id: 'gone', quantity: 1 },
				{ kind: 'item', id: 'oiled', quantity: 0 }
			]
		});
		const storage = memoryStorage({ [STORAGE_KEY]: saved });
		const q = new TargetQueue(targets, () => storage);
		q.load();
		expect(q.items.map((x) => [x.key, x.quantity])).toEqual([['item:beam', 2]]);
		expect(q.warnings).toEqual([
			'Some saved targets are no longer in the data and were dropped: item:gone.',
			"Some saved targets couldn't be read and were dropped."
		]);

		const next = new TargetQueue(targets, () => storage);
		next.load();
		expect(next.warnings).toEqual([]);
	});

	it.each(['not json', '[]', '{"version":2,"targets":[]}'])('reports %s as unreadable', (raw) => {
		expect(parseTargets(raw, targets)).toEqual({ items: [], problems: [{ kind: 'unreadable' }] });
	});

	it('warns once when storage is blocked, and keeps targets in memory', () => {
		const q = new TargetQueue(targets, () => {
			throw new DOMException('blocked', 'SecurityError');
		});
		q.load();
		q.add(targets[0]);
		q.add(targets[1]);
		expect(q.items).toHaveLength(2);
		expect(q.warnings).toEqual([
			"Your browser is blocking storage, so your targets won't be kept after a reload."
		]);
	});
});
