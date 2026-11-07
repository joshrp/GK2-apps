import { describe, expect, it } from 'vitest';
import type { ItemNode, PlanNode } from '#lib/calc/planner';
import { allParentPaths, rootId, rowState, treeRows } from './rows';

const node = (key: string, children: PlanNode[] = [], over: Partial<ItemNode> = {}): ItemNode => ({
	kind: 'item',
	key,
	name: key,
	need: 2,
	fromInventory: 0,
	usedEarlier: 0,
	fromSpare: 0,
	craft: null,
	leafReason: null,
	children,
	...over
});

const roots: PlanNode[] = [
	node('a', [node('b', [node('c')]), { kind: 'fuel', need: 10 }]),
	node('d')
];

describe('rowState', () => {
	it('is unchecked with no count, short below the need, covered at or above it', () => {
		expect(rowState(node('a'), {})).toBe('unchecked');
		expect(rowState(node('a', [], { fromInventory: 1 }), { a: 1 })).toBe('short');
		expect(rowState(node('a', [], { fromInventory: 0 }), { a: 0 })).toBe('short');
		expect(rowState(node('a', [], { fromInventory: 2 }), { a: 5 })).toBe('covered');
		expect(rowState(node('a', [], { fromInventory: 1, fromSpare: 1 }), { a: 1 })).toBe('covered');
	});

	it('is null for rows that take no count', () => {
		expect(rowState({ kind: 'fuel', need: 3 }, {})).toBeNull();
	});
});

describe('treeRows', () => {
	it('keeps unchecked rows collapsed, showing only their need', () => {
		expect(treeRows(roots, {}).map((r) => [r.path, r.state, r.hasChildren, r.expanded])).toEqual([
			['item:a', 'unchecked', true, false],
			['item:d', 'unchecked', false, false]
		]);
	});

	it('expands short rows', () => {
		expect(treeRows(roots, { a: 0, b: 1 }).map((r) => r.path)).toEqual([
			'item:a',
			'item:a.0',
			'item:a.0.0',
			'item:a.1',
			'item:d'
		]);
	});

	it('follows overrides over the default', () => {
		const rows = treeRows(
			roots,
			{ a: 0 },
			new Map([
				['item:a', false],
				['item:d', true]
			])
		);
		expect(rows.map((r) => r.path)).toEqual(['item:a', 'item:d']);
		const opened = treeRows(roots, {}, new Map([['item:a', true]]));
		expect(opened.map((r) => r.path)).toEqual(['item:a', 'item:a.0', 'item:a.1', 'item:d']);
	});

	it('keeps overrides with their target when the targets are reordered', () => {
		const opened = treeRows([...roots].reverse(), {}, new Map([['item:a', true]]));
		expect(opened.map((r) => r.path)).toEqual(['item:d', 'item:a', 'item:a.0', 'item:a.1']);
	});

	it('names roots by target, and stations being built apart from building targets', () => {
		const building = (forStation: boolean): PlanNode => ({
			kind: 'building',
			id: 'saw',
			name: 'Saw',
			quantity: 1,
			forStation,
			children: []
		});
		expect([rootId(building(false)), rootId(building(true))]).toEqual([
			'building:saw',
			'station:saw'
		]);
	});

	it('lists the rows that have children', () => {
		expect(allParentPaths(roots)).toEqual(['item:a', 'item:a.0']);
	});
});
