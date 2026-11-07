<script lang="ts">
import { gameModel } from '#lib/calc/gameModel';
import type { ItemNode, PlanNode } from '#lib/calc/planner';
import { iconUrl } from '#lib/data/icons';
import type { PerkLevels } from '#lib/perks/levels';
import { inventory, parseCount } from './inventory.svelte';
import { recipeChoices } from './recipeChoices.svelte';
import { recipeLabel } from './recipeLabel';
import { allParentPaths, treeRows } from './rows';

let { roots, levels }: { roots: PlanNode[]; levels: PerkLevels } = $props();

/** Rows opened or closed by hand; the rest follow their inventory state. */
let overrides: Map<string, boolean> = $state(new Map());
const rows = $derived(treeRows(roots, inventory.counts, overrides));

function toggle(path: string, expanded: boolean) {
	overrides = new Map(overrides).set(path, !expanded);
}

function setAll(expanded: boolean) {
	overrides = new Map(allParentPaths(roots).map((p) => [p, expanded]));
}

/** Rows whose Have field holds something that isn't a count (not applied). */
let invalid: Record<string, boolean> = $state({});

function onHaveInput(path: string, key: string, text: string) {
	const count = parseCount(text);
	invalid[path] = count === null;
	if (count === null) return;
	inventory.set(key, count);
	// A new count decides the row's state, so it opens or closes by that again.
	if (overrides.has(path)) {
		const next = new Map(overrides);
		next.delete(path);
		overrides = next;
	}
}

/** Shows the count unless the field already does, so text being typed is never overwritten. */
const showCount = (count: number | undefined) => (input: HTMLInputElement) => {
	const shown = parseCount(input.value);
	if (shown !== null && shown !== (count ?? ''))
		input.value = count === undefined ? '' : String(count);
};

const LEAF_NOTES: Record<NonNullable<ItemNode['leafReason']>, string> = {
	noRecipe: 'Gather / buy',
	anyOf: 'Gather / buy, any of these',
	cycle: 'Needed by its own recipe; get it another way',
	noYield: 'Recipe gives none at these perk levels'
};

const iconFor = (node: PlanNode) =>
	node.kind === 'fuel'
		? undefined
		: iconUrl(gameModel.iconOf(node.kind === 'item' ? node.key : node.id));
</script>

<div class="tree-head">
	<h3>Steps</h3>
	<button class="link" type="button" onclick={() => setAll(true)}>Expand all</button>
	<button class="link" type="button" onclick={() => setAll(false)}>Collapse all</button>
	<span class="hint">Enter what you have to open a step; blank means not checked yet.</span>
</div>

<table class="tree">
	<thead>
		<tr>
			<th scope="col">Item</th>
			<th scope="col" class="num">Need</th>
			<th scope="col">Have</th>
			<th scope="col" class="num">Crafts</th>
			<th scope="col" class="num">Spare</th>
			<th scope="col">Station</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.path)}
			{@const node = row.node}
			{@const url = iconFor(node)}
			<tr class:root={row.depth === 0}>
				<td class="item" style:padding-left="{row.depth * 20}px">
					<span class="item-line">
						{#if row.hasChildren}
							<button
								class="toggle"
								type="button"
								aria-expanded={row.expanded}
								aria-label="{row.expanded ? 'Collapse' : 'Expand'} {node.kind === 'fuel' ? 'Fuel' : node.name}"
								onclick={() => toggle(row.path, row.expanded)}>{row.expanded ? '▾' : '▸'}</button
							>
						{:else}
							<span class="toggle-space"></span>
						{/if}
						{#if node.kind !== 'fuel'}
							{#if url}
								<img class="icon" src={url} alt="" width="20" height="20" />
							{:else}
								<span class="icon placeholder" aria-hidden="true">?</span>
							{/if}
						{/if}
						<span class="name">
							{#if node.kind === 'fuel'}
								Fuel
							{:else if node.kind === 'building'}
								{node.name}
								<span class="tag">{node.forStation ? 'Station to build' : 'Building'}</span>
							{:else}
								{node.name}
							{/if}
						</span>
					</span>
					{#if node.kind === 'item'}
						{#if node.craft === null && node.leafReason}
							<span class="note">{LEAF_NOTES[node.leafReason]}</span>
						{/if}
						{#if node.fromSpare > 0}
							<span class="note">{node.fromSpare} from spare</span>
						{/if}
						{#if node.craft?.tierNotGuaranteed}
							<span class="note warn">Tier not guaranteed</span>
						{/if}
						{#if node.craft && node.craft.options.length > 1}
							{@const key = node.key}
							<select
								class="recipe"
								aria-label="Recipe for {node.name}"
								value={node.craft.recipeId}
								onchange={(e) => recipeChoices.choose(key, e.currentTarget.value)}
							>
								{#each node.craft.options as option (option.id)}
									<option value={option.id}>{recipeLabel(gameModel, option.id, key, levels)}</option>
								{/each}
							</select>
						{/if}
					{/if}
				</td>
				<td class="num">
					{#if node.kind === 'fuel'}{node.need} units{:else if node.kind === 'building'}{node.quantity}{:else}{node.need}{/if}
				</td>
				<td class="have">
					{#if node.kind === 'item'}
						{@const key = node.key}
						<input
							class="count"
							type="text"
							inputmode="numeric"
							aria-label="Have {node.name}"
							aria-invalid={invalid[row.path] ? 'true' : undefined}
							oninput={(e) => onHaveInput(row.path, key, e.currentTarget.value)}
							{@attach showCount(inventory.counts[key])}
						/>
						{#if node.usedEarlier > 0 && !invalid[row.path]}
							<span class="state">{node.usedEarlier} used above</span>
						{/if}
						{#if invalid[row.path]}
							<span class="note-inline error">Whole number, 0 or more</span>
						{:else if row.state === 'covered'}
							<span class="state ok">Covered</span>
						{:else if row.state === 'short'}
							<span class="state">Short {node.need - node.fromInventory - node.fromSpare}</span>
						{/if}
					{/if}
				</td>
				<td class="num">{node.kind === 'item' && node.craft ? node.craft.crafts : ''}</td>
				<td class="num">{node.kind === 'item' && node.craft?.spare ? node.craft.spare : ''}</td>
				<td class="stations">
					{#if node.kind === 'item' && node.craft}
						{#if node.craft.stations.length === 0}
							<span>Station unknown</span>
						{:else}
							<ul class="station-list">
								{#each node.craft.stations as station (station.id)}
									<li>
										{station.name}{#if station.status === 'toBuild'}
											<span class="tag">To build</span>{/if}
									</li>
								{/each}
							</ul>
							{#if node.craft.notBuilt}
								<span class="flag">Not built</span>
							{/if}
						{/if}
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.tree-head {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
	}

	h3 {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	.link {
		padding: 0;
		background: none;
		border: none;
		border-bottom: 1px solid transparent;
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-size-sm);
		text-decoration: underline;
		cursor: pointer;
	}

	.link:focus-visible {
		outline: none;
		border-bottom-color: var(--color-focus);
	}

	.tree {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		padding: var(--space-1) var(--space-2) var(--space-2);
		font-weight: 500;
		text-align: left;
		border-bottom: 1px solid var(--color-line);
	}

	td {
		padding: var(--space-1) var(--space-2);
		vertical-align: top;
		border-bottom: 1px solid var(--color-line);
	}

	.root td {
		border-top: 1px solid var(--color-text);
	}

	.num {
		text-align: right;
		white-space: nowrap;
	}

	.item-line {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.toggle,
	.toggle-space {
		flex: none;
		width: 18px;
		height: 20px;
	}

	.toggle {
		padding: 0;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius);
		color: var(--color-text);
		cursor: pointer;
	}

	.toggle:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}

	.icon {
		flex: none;
		display: block;
		width: 20px;
		height: 20px;
		image-rendering: pixelated;
	}

	.placeholder {
		display: grid;
		place-items: center;
		background: var(--color-field);
		border-radius: var(--radius);
		font-size: var(--font-size-sm);
	}

	.note {
		display: block;
		margin-left: 46px;
		font-size: var(--font-size-sm);
	}

	.warn {
		color: var(--color-warning);
	}

	.hint {
		font-size: var(--font-size-sm);
	}

	.have {
		white-space: nowrap;
	}

	.count {
		width: 56px;
		height: 24px;
		padding: 0 var(--space-1);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
		text-align: right;
	}

	.count:focus {
		outline: none;
		border-color: var(--color-focus);
	}

	.count[aria-invalid='true'],
	.count[aria-invalid='true']:focus {
		border-color: var(--color-error);
	}

	.state,
	.note-inline {
		display: block;
		font-size: var(--font-size-sm);
	}

	.ok {
		color: var(--color-focus);
	}

	.recipe {
		display: block;
		max-width: 100%;
		margin: var(--space-1) 0 0 46px;
		height: 24px;
		padding: 0 var(--space-1);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-size-sm);
	}

	.recipe:focus {
		outline: none;
		border-color: var(--color-focus);
	}

	.tag {
		margin-left: var(--space-1);
		padding: 0 var(--space-1);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		font-size: var(--font-size-sm);
	}

	.station-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.flag {
		display: inline-block;
		margin-top: 2px;
		padding: 0 var(--space-1);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius);
		color: var(--color-warning);
		font-size: var(--font-size-sm);
	}
</style>
