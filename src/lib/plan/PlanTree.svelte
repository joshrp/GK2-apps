<script lang="ts">
import { gameModel } from '#lib/calc/gameModel';
import type { ItemNode, PlanNode } from '#lib/calc/planner';
import { iconUrl } from '#lib/data/icons';
import type { PerkLevels } from '#lib/perks/levels';
import { blockedNotes } from './blockedNotes.svelte';
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

/** Phones only: rows whose details (Have, Blocked, Crafts, Spare, Station) are shown. */
let detailsOpen: Set<string> = $state(new Set());

function toggleDetails(path: string) {
	const next = new Set(detailsOpen);
	if (!next.delete(path)) next.add(path);
	detailsOpen = next;
}

const shortBy = (node: ItemNode) => node.need - node.fromInventory - node.fromSpare;

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

/**
 * Shows the item's Blocked note (it may have been typed on another row of the same item). A field
 * holding only whitespace is left alone, as the store keeps no note for it.
 */
const showNote = (note: string) => (field: HTMLTextAreaElement) => {
	if (field.value !== note && !(note === '' && field.value.trim() === '')) field.value = note;
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
			<th scope="col">Blocked</th>
			<th scope="col" class="num">Crafts</th>
			<th scope="col" class="num">Spare</th>
			<th scope="col">Station</th>
			<th scope="col" class="more-cell"><span class="visually-hidden">Details</span></th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.path)}
			{@const node = row.node}
			{@const url = iconFor(node)}
			{@const open = detailsOpen.has(row.path)}
			<tr class:root={row.depth === 0} class:leaf={!row.hasChildren} class:open style:--depth={row.depth}>
				<td class="item">
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
						{#if node.kind === 'fuel'}
							<!-- No icon, but keeps "Fuel" in line with the names around it. -->
							<span class="icon" aria-hidden="true"></span>
						{:else}
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
						<!-- Phones: the row's status at a glance, as Have and Station sit in the details. -->
						{#if row.state === 'covered' || row.state === 'short' || node.craft?.notBuilt}
							<span class="glance" aria-hidden="true">
								{#if row.state === 'covered'}
									<span class="ok">Covered</span>
								{:else if row.state === 'short'}
									<span>Short {shortBy(node)}</span>
								{/if}
								{#if node.craft?.notBuilt}
									<span class="flag">Not built</span>
								{/if}
							</span>
						{/if}
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
				<td class="num need">
					{#if node.kind === 'fuel'}{node.need} units{:else if node.kind === 'building'}{node.quantity}{:else}{node.need}{/if}
				</td>
				<td class="have" data-label="Have">
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
							<span class="state">Short {shortBy(node)}</span>
						{/if}
					{/if}
				</td>
				<td class="blocked" data-label="Blocked">
					{#if node.kind === 'item'}
						{@const key = node.key}
						<textarea
							class="note-field"
							rows="1"
							aria-label="Blocked {node.name}"
							oninput={(e) => blockedNotes.set(key, e.currentTarget.value)}
							{@attach showNote(blockedNotes.get(key))}
						></textarea>
					{/if}
				</td>
				<td class="num crafts" class:blank={!(node.kind === 'item' && node.craft)} data-label="Crafts">
					{node.kind === 'item' && node.craft ? node.craft.crafts : ''}
				</td>
				<td class="num spare" class:blank={!(node.kind === 'item' && node.craft?.spare)} data-label="Spare">
					{node.kind === 'item' && node.craft?.spare ? node.craft.spare : ''}
				</td>
				<td
					class="stations"
					class:blank={!(node.kind === 'item' && node.craft)}
					data-label="Station"
				>
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
				<td class="more-cell">
					{#if node.kind === 'item'}
						<button
							class="more"
							type="button"
							aria-expanded={open}
							aria-label="Details for {node.name}"
							onclick={() => toggleDetails(row.path)}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
						</button>
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

	.tree {
		/* Indent per tree level, and the offset of text that lines up with an item's name. */
		--indent: 20px;
		--lead: 46px;
	}

	.item {
		padding-left: calc(var(--depth) * var(--indent));
	}

	.more-cell,
	.glance {
		display: none;
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
		margin-left: var(--lead);
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

	.note-field {
		display: block;
		width: 180px;
		min-height: 24px;
		/* Grows with its text where supported (Chrome, Edge); elsewhere it can be resized. */
		field-sizing: content;
		padding: 1px var(--space-1);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
		line-height: 20px;
		resize: vertical;
	}

	.note-field:focus {
		outline: none;
		border-color: var(--color-focus);
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
		margin: var(--space-1) 0 0 var(--lead);
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
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	/*
	 * Phones: each step is a compact row (arrow, icon, name, need, status at a glance) with a
	 * details button; Have, Blocked, Crafts, Spare, Station and the recipe show underneath when
	 * it's open. Tap targets are at least 40px.
	 */
	@media (max-width: 600px) {
		.tree-head {
			flex-wrap: wrap;
			align-items: center;
			gap: 0 var(--space-1);
		}

		.tree-head h3 {
			margin-right: var(--space-2);
		}

		.link {
			min-height: 44px;
			padding: 0 var(--space-2);
		}

		.hint {
			flex-basis: 100%;
		}

		.tree {
			--indent: 16px;
			--lead: 68px;
			--guide: #5a5346;
		}

		.tree,
		.tree tbody {
			display: block;
		}

		.tree thead {
			display: none;
		}

		.tree tr {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto 44px;
			align-items: start;
			border-bottom: 1px solid var(--color-line);
		}

		.tree tr.root {
			border-top: 1px solid var(--color-text);
		}

		/*
		 * Tree guides: a vertical line under each ancestor's arrow (20px is half the 40px arrow
		 * button), and an elbow from the parent's line towards this row's arrow.
		 */
		.tree tbody tr {
			position: relative;
		}

		.tree tbody tr:not(.root)::before,
		.tree tbody tr:not(.root)::after {
			content: '';
			position: absolute;
			pointer-events: none;
		}

		.tree tbody tr:not(.root)::before {
			top: 0;
			bottom: 0;
			left: 20px;
			/* Ends just after the last line, so no partial tile shows past it. */
			width: calc((var(--depth) - 1) * var(--indent) + 1px);
			background: repeating-linear-gradient(
				to right,
				var(--guide) 0 1px,
				transparent 1px var(--indent)
			);
		}

		.tree tbody tr:not(.root)::after {
			top: 20px;
			left: calc((var(--depth) - 1) * var(--indent) + 20px);
			width: calc(var(--indent) - 6px);
			height: 1px;
			background: var(--guide);
		}

		/* With no arrow on the row, the elbow runs on to just before the icon. */
		.tree tbody tr.leaf:not(.root)::after {
			width: calc(var(--indent) + 40px - 4px);
		}

		/*
		 * The name line is 28px with 6px above and below; the 40px arrow button reaches into that
		 * padding, so rows stay compact while the tap area doesn't shrink.
		 */
		.tree td.item {
			padding: 6px 0 6px calc(var(--depth) * var(--indent));
		}

		.tree td,
		.root td {
			padding: 0;
			border: none;
		}

		.item {
			grid-column: 1;
		}

		.item-line {
			min-height: 28px;
		}

		.toggle,
		.toggle-space {
			margin: -6px 0;
		}

		.glance,
		.note {
			margin-top: 2px;
		}

		/* The details cells come later in the row, so pin the visible row to the first line. */
		.item,
		.need,
		.more-cell {
			grid-row: 1;
		}

		/* An open row shows the same status in its details. */
		.open .glance {
			display: none;
		}

		.tree td.need {
			grid-column: 2;
			padding: 6px var(--space-2) 0 0;
			line-height: 28px;
		}

		.toggle,
		.toggle-space {
			width: 40px;
			height: 40px;
		}

		.name {
			min-width: 0;
		}

		.glance {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--space-2);
			margin-left: var(--lead);
			font-size: var(--font-size-sm);
		}

		.glance .flag {
			margin-top: 0;
		}

		.more-cell {
			display: block;
			grid-column: 3;
		}

		.more {
			display: grid;
			place-items: center;
			width: 44px;
			height: 40px;
			padding: 0;
			background: none;
			border: 1px solid transparent;
			border-radius: var(--radius);
			color: var(--color-text);
			cursor: pointer;
		}

		.more:focus-visible {
			outline: none;
			border-color: var(--color-focus);
		}

		.more svg {
			width: 20px;
			height: 20px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
			transition: rotate 0.15s;
		}

		.more[aria-expanded='true'] svg {
			rotate: 180deg;
		}

		@media (prefers-reduced-motion: reduce) {
			.more svg {
				transition: none;
			}
		}

		.have,
		.blocked,
		.crafts,
		.spare,
		.stations,
		tr:not(.open) .recipe {
			display: none;
		}

		.open .have,
		.open .blocked,
		.open .crafts:not(.blank),
		.open .spare:not(.blank),
		.open .stations:not(.blank) {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: var(--space-1) var(--space-2);
			grid-column: 1 / -1;
			padding: 0 var(--space-2) var(--space-2) calc(var(--depth) * var(--indent) + var(--lead));
			text-align: left;
			white-space: normal;
		}

		.open td[data-label]::before {
			content: attr(data-label);
			flex: none;
			width: 56px;
			font-size: var(--font-size-sm);
		}

		.open .have .state,
		.open .have .note-inline {
			display: inline;
		}

		.open .blocked .note-field {
			flex: 1;
		}

		.count {
			width: 88px;
			height: 40px;
			font-size: 16px;
		}

		.note-field {
			width: auto;
			min-width: 0;
			min-height: 40px;
			padding: var(--space-1) var(--space-2);
			font-size: 16px;
			line-height: 24px;
		}

		.recipe {
			width: calc(100% - var(--lead));
			height: 40px;
			margin-bottom: var(--space-1);
			font-size: 16px;
		}

		/* Stations stay one per line, beside the label, with Not built under them. */
		.station-list {
			flex-basis: calc(100% - 64px);
		}

		.stations .flag {
			margin-left: 64px;
		}
	}
</style>
