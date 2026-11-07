import type { PlanNode } from '#lib/calc/planner';

/**
 * Inventory state of an item row:
 * - 'unchecked': no count entered yet (blank); the row stays collapsed and shows its need
 * - 'short': a count below the need; the row expands for the shortfall only
 * - 'covered': inventory (with any spare) covers the need
 * null for rows that take no count (fuel, buildings).
 */
export type RowState = 'unchecked' | 'short' | 'covered' | null;

export function rowState(node: PlanNode, counts: Readonly<Record<string, number>>): RowState {
	if (node.kind !== 'item') return null;
	if (!(node.key in counts)) return 'unchecked';
	return node.fromInventory + node.fromSpare >= node.need ? 'covered' : 'short';
}

/**
 * A root's part of a row path: the target (or station being built) rather than its position, so
 * rows opened or closed by hand stay with a target when the targets are reordered.
 */
export function rootId(node: PlanNode): string {
	if (node.kind === 'item') return `item:${node.key}`;
	if (node.kind === 'building') return `${node.forStation ? 'station' : 'building'}:${node.id}`;
	return 'fuel';
}

export interface TreeRow {
	/**
	 * The root's id, then positions below it, e.g. "item:chest.1.2"; stable while that target's
	 * part of the plan keeps its shape.
	 */
	path: string;
	depth: number;
	node: PlanNode;
	state: RowState;
	hasChildren: boolean;
	expanded: boolean;
}

const childrenOf = (node: PlanNode): PlanNode[] => (node.kind === 'fuel' ? [] : node.children);

/**
 * The visible rows of the plan tree, depth first. A row's children show when it's expanded:
 * by its override if there is one, else by default only when it's short (or not an item row).
 */
export function treeRows(
	roots: PlanNode[],
	counts: Readonly<Record<string, number>>,
	overrides: ReadonlyMap<string, boolean> = new Map()
): TreeRow[] {
	const rows: TreeRow[] = [];
	const walk = (node: PlanNode, path: string, depth: number) => {
		const children = childrenOf(node);
		const state = rowState(node, counts);
		const expanded = overrides.get(path) ?? (state === null || state === 'short');
		rows.push({ path, depth, node, state, hasChildren: children.length > 0, expanded });
		if (!expanded) return;
		for (const [i, child] of children.entries()) walk(child, `${path}.${i}`, depth + 1);
	};
	for (const root of roots) walk(root, rootId(root), 0);
	return rows;
}

/** Every path with children, for "Expand all" / "Collapse all". */
export function allParentPaths(roots: PlanNode[]): string[] {
	const paths: string[] = [];
	const walk = (node: PlanNode, path: string) => {
		const children = childrenOf(node);
		if (children.length > 0) paths.push(path);
		for (const [i, child] of children.entries()) walk(child, `${path}.${i}`);
	};
	for (const root of roots) walk(root, rootId(root));
	return paths;
}
