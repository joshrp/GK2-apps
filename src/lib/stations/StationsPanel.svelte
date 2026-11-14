<script lang="ts">
import { onMount } from 'svelte';
import { evaluateQuantity } from '#lib/calc/formula';
import { gameModel } from '#lib/calc/gameModel';
import type { Station } from '#lib/calc/model';
import { iconUrl } from '#lib/data/icons';
import { perkLevels } from '#lib/perks/perkLevels.svelte';
import { ownedStations } from './ownedStations.svelte';

onMount(() => ownedStations.load());

/** Build cost lines ("2 Board"), or null when there's no build cost. */
function costLines(station: Station): string[] | null {
	if (station.cost.kind !== 'build') return null;
	const building = gameModel.buildings.get(station.cost.buildingId);
	return (building?.cost ?? []).map(
		(line) => `${evaluateQuantity(line.count, perkLevels.levels)} ${gameModel.resolve(line).name}`
	);
}

/** Reset is asked inline (not `confirm()`, which some browsers block or let users switch off). */
let confirmingReset = $state(false);
/** Set when the inline question closes, so the Reset button gets focus back. */
let refocusReset = false;

function closeResetConfirm(doReset: boolean) {
	if (doReset) ownedStations.reset();
	refocusReset = true;
	confirmingReset = false;
}

const cancelOnEscape = (e: KeyboardEvent) => {
	if (e.key === 'Escape') closeResetConfirm(false);
};

const focusOnMount = (el: HTMLElement) => el.focus();

const focusIfReturning = (el: HTMLElement) => {
	if (refocusReset) el.focus();
	refocusReset = false;
};
</script>

<h2>Stations</h2>

{#if ownedStations.warnings.length > 0}
	<div class="warning" role="status">
		<svg class="warning-icon" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3 2 21h20L12 3Z" />
			<path d="M12 10v5M12 18v.01" />
		</svg>
		<div class="warning-text">
			{#each ownedStations.warnings as message}
				<p>{message}</p>
			{/each}
		</div>
		<button
			class="dismiss"
			type="button"
			aria-label="Dismiss"
			onclick={() => ownedStations.dismissWarnings()}>×</button
		>
	</div>
{/if}

<table class="stations">
	<thead>
		<tr>
			<th scope="col"><span class="visually-hidden">Icon</span></th>
			<th scope="col">Station</th>
			<th scope="col">Location</th>
			<th scope="col">I have this</th>
			<th scope="col" class="cost-cell">Build cost</th>
		</tr>
	</thead>
	<tbody>
		{#each gameModel.stations as station (station.id)}
			{@const url = iconUrl(station.icon)}
			<tr>
				<td class="icon-cell">
					{#if url}
						<img class="icon" src={url} alt="" width="32" height="32" />
					{:else}
						<span class="icon placeholder" aria-hidden="true">?</span>
					{/if}
				</td>
				<td>
					<label for="owned-{station.id}">{station.name}</label>
					{#if station.storageOnly}
						<span class="note">Stores firewood only; not used by any recipe.</span>
					{/if}
				</td>
				<td>
					{#if station.locations.length === 0}
						Unknown
					{:else}
						<ul class="cost">
							{#each station.locations as location}
								<li>{location}</li>
							{/each}
						</ul>
					{/if}
				</td>
				<td class="have">
					<input
						id="owned-{station.id}"
						type="checkbox"
						checked={ownedStations.has(station.id)}
						onchange={(e) => ownedStations.setOwned(station.id, e.currentTarget.checked)}
					/>
				</td>
				<td class="cost-cell">
					{#if station.cost.kind === 'comesWithGame'}
						Comes with the game
					{:else if station.cost.kind === 'unknown'}
						Build cost unknown
					{:else}
						<ul class="cost">
							{#each costLines(station) ?? [] as line}
								<li>{line}</li>
							{/each}
						</ul>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if confirmingReset}
	<div class="confirm" role="group" aria-labelledby="stations-reset-question">
		<span id="stations-reset-question">Untick all stations, including the starting ones?</span>
		<button
			class="button"
			type="button"
			onclick={() => closeResetConfirm(true)}
			onkeydown={cancelOnEscape}>Reset</button
		>
		<button
			class="button"
			type="button"
			onclick={() => closeResetConfirm(false)}
			onkeydown={cancelOnEscape}
			{@attach focusOnMount}>Cancel</button
		>
	</div>
{:else}
	<button
		class="button reset"
		type="button"
		onclick={() => (confirmingReset = true)}
		{@attach focusIfReturning}>Reset</button
	>
{/if}

<style>
	h2 {
		font-size: var(--font-size-lg);
		margin: 0 0 var(--space-2);
	}

	.warning {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		max-width: 720px;
		margin-bottom: var(--space-3);
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

	.stations {
		border-collapse: collapse;
	}

	th {
		padding: var(--space-1) var(--space-3) var(--space-2) 0;
		font-weight: 500;
		text-align: left;
		border-bottom: 1px solid var(--color-line);
	}

	td {
		padding: var(--space-1) var(--space-3) var(--space-1) 0;
		border-bottom: 1px solid var(--color-line);
		vertical-align: middle;
	}

	.icon-cell {
		width: 40px;
	}

	.icon {
		display: block;
		width: 32px;
		height: 32px;
		image-rendering: pixelated;
	}

	.placeholder {
		display: grid;
		place-items: center;
		background: var(--color-field);
		border-radius: var(--radius);
	}

	.have {
		text-align: center;
	}

	.have input {
		width: 16px;
		height: 16px;
		accent-color: var(--color-focus);
		cursor: pointer;
	}

	.cost {
		margin: 0;
		padding: 0;
		list-style: none;
		line-height: 1.5;
	}

	.note {
		display: block;
		font-size: var(--font-size-sm);
	}

	.reset,
	.confirm {
		margin-top: var(--space-3);
	}

	.confirm {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.button {
		padding: var(--space-1) var(--space-3);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
	}

	.button:focus-visible,
	.dismiss:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}

	.have input:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/*
	 * Phones: each station is one grid row (icon, name, location, tick box) with its build cost
	 * on a second line underneath, so the cost isn't squeezed into a narrow fourth column.
	 */
	@media (max-width: 600px) {
		.stations,
		.stations thead,
		.stations tbody {
			display: block;
		}

		.stations tr {
			display: grid;
			grid-template-columns: 40px 1fr auto 64px;
			column-gap: var(--space-3);
			align-items: center;
			padding: var(--space-1) 0;
			border-bottom: 1px solid var(--color-line);
		}

		.stations th,
		.stations td {
			padding: 0;
			border-bottom: none;
		}

		.stations th.cost-cell {
			display: none;
		}

		.stations td.cost-cell {
			grid-column: 2 / -1;
			padding-top: var(--space-1);
			font-size: var(--font-size-sm);
		}

		.cost-cell .cost li {
			display: inline;
		}

		.cost-cell .cost li:not(:last-child)::after {
			content: ', ';
		}
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
