<script lang="ts">
import { onMount } from 'svelte';
import { gameModel } from '#lib/calc/gameModel';
import { plan } from '#lib/calc/planner';
import { perkLevels } from '#lib/perks/perkLevels.svelte';
import { buildChoices } from '#lib/stations/buildChoices.svelte';
import { ownedStations } from '#lib/stations/ownedStations.svelte';
import { targetQueue } from '#lib/targets/targetQueue.svelte';
import { blockedNotes } from './blockedNotes.svelte';
import { inventory } from './inventory.svelte';
import PlanSummary from './PlanSummary.svelte';
import PlanTree from './PlanTree.svelte';
import { recipeChoices } from './recipeChoices.svelte';

onMount(() => {
	buildChoices.load();
	recipeChoices.load();
	inventory.load();
	blockedNotes.load();
});

/** Recomputed whenever targets, perk levels, stations, build or recipe choices change. */
const result = $derived(
	plan(gameModel, {
		targets: targetQueue.items,
		levels: perkLevels.levels,
		owned: ownedStations.owned,
		// A station you now have no longer needs building.
		build: buildChoices.ids.filter((id) => !ownedStations.has(id)),
		recipeChoices: recipeChoices.choices,
		inventory: inventory.counts
	})
);

const warnings = $derived([
	...buildChoices.warnings,
	...recipeChoices.warnings,
	...inventory.warnings,
	...blockedNotes.warnings
]);

function dismissWarnings() {
	buildChoices.dismissWarnings();
	recipeChoices.dismissWarnings();
	inventory.dismissWarnings();
	blockedNotes.dismissWarnings();
}
</script>

{#if warnings.length > 0}
	<div class="warning" role="status">
		<svg class="warning-icon" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3 2 21h20L12 3Z" />
			<path d="M12 10v5M12 18v.01" />
		</svg>
		<div class="warning-text">
			{#each warnings as message}
				<p>{message}</p>
			{/each}
		</div>
		<button class="dismiss" type="button" aria-label="Dismiss" onclick={dismissWarnings}>×</button>
	</div>
{/if}

{#if targetQueue.items.length > 0}
	<div class="tree section">
		<PlanTree roots={result.roots} levels={perkLevels.levels} />
	</div>
	<div class="section" role="region" aria-label="Totals">
		<div class="summary">
			<PlanSummary plan={result} />
		</div>
	</div>
{/if}

<style>
	/* Targets, Steps and the totals are separated by a 2px white line. */
	.section {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 2px solid var(--color-text);
	}

	.tree {
		overflow-x: auto;
	}

	.summary {
		max-width: 560px;
	}

	.warning {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		max-width: 480px;
		margin-top: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--color-field);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius);
	}

	.warning-icon {
		flex: none;
		width: 16px;
		height: 16px;
		margin-top: 1px;
		fill: none;
		stroke: var(--color-warning);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.warning-text {
		flex: 1;
	}

	.warning-text p {
		margin: 0;
	}

	.warning-text p + p {
		margin-top: var(--space-1);
	}

	.dismiss {
		flex: none;
		padding: 0 var(--space-1);
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: var(--font-size-lg);
		line-height: 1;
		cursor: pointer;
	}

	.dismiss:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}
</style>
