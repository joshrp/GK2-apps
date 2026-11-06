<script lang="ts">
import { gameModel } from '#lib/calc/gameModel';
import { FUEL_ID, type Plan } from '#lib/calc/planner';
import { iconUrl } from '#lib/data/icons';
import { buildChoices } from '#lib/stations/buildChoices.svelte';

let { plan }: { plan: Plan } = $props();

const costNote = (id: string) =>
	gameModel.stations.find((s) => s.id === id)?.cost.kind === 'comesWithGame'
		? 'Comes with the game'
		: 'Build cost unknown';
</script>

<section aria-labelledby="required-heading">
	<h3 id="required-heading">Required items</h3>
	{#if plan.required.length === 0 && plan.fuel === 0}
		<p>Nothing to gather.</p>
	{:else}
		<ul class="list">
			{#each plan.required as item (item.key)}
				{@const url = iconUrl(gameModel.iconOf(item.key))}
				<li class="line">
					{#if url}
						<img class="icon" src={url} alt="" width="20" height="20" />
					{:else}
						<span class="icon placeholder" aria-hidden="true">?</span>
					{/if}
					<span class="name">{item.name}</span>
					<span class="qty">{item.quantity}</span>
				</li>
			{/each}
			{#if plan.fuel > 0}
				{@const fuelUrl = iconUrl(gameModel.iconOf(FUEL_ID))}
				<li class="line">
					{#if fuelUrl}
						<img class="icon" src={fuelUrl} alt="" width="20" height="20" />
					{:else}
						<span class="icon placeholder" aria-hidden="true">?</span>
					{/if}
					<span class="name">Furnace fuel</span>
					<span class="qty">{plan.fuel} units</span>
				</li>
			{/if}
		</ul>
	{/if}
</section>

<section aria-labelledby="stations-heading">
	<h3 id="stations-heading">Required buildings / tools</h3>
	{#if plan.stationGroups.length === 0}
		<p>None.</p>
	{:else}
		<ul class="list">
			{#each plan.stationGroups as group (group.map((s) => s.id).join('|'))}
				{@const ready = group.some((s) => s.status !== 'missing')}
				<li class="line">
					<span class="name">{group.map((s) => s.name).join(' or ')}</span>
					<span class="status" class:missing={!ready}
						>{group.some((s) => s.status === 'owned')
							? 'Have'
							: ready
								? 'To build'
								: 'Not built'}</span
					>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if plan.stationsToBuild.length > 0}
	<section aria-labelledby="build-heading">
		<h3 id="build-heading">Stations to build</h3>
		<p class="hint">Choose "Build this" to add a station's build cost to the plan.</p>
		<ul class="list">
			{#each plan.stationsToBuild as station (station.id)}
				<li class="line">
					<span class="name">{station.name}</span>
					{#if station.chosen}
						<button class="button" type="button" onclick={() => buildChoices.set(station.id, false)}
							>Don't build</button
						>
					{:else if station.buildable}
						<button class="button" type="button" onclick={() => buildChoices.set(station.id, true)}
							>Build this</button
						>
					{:else}
						<span class="status">{costNote(station.id)}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	section + section {
		margin-top: var(--space-4);
	}

	h3 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-size-lg);
	}

	p {
		margin: 0;
	}

	.hint {
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.line {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 30px;
		padding: var(--space-1) 0;
		border-bottom: 1px solid var(--color-line);
	}

	.name {
		flex: 1;
	}

	.qty {
		white-space: nowrap;
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

	.status {
		font-size: var(--font-size-sm);
	}

	.missing {
		padding: 0 var(--space-1);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius);
		color: var(--color-warning);
	}

	.button {
		padding: 2px var(--space-3);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
	}

	.button:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}
</style>
