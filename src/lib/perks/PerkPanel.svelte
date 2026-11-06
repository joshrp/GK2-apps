<script lang="ts">
import { onMount } from 'svelte';
import { gk2Data } from '#lib/data/gk2';
import { parseLevelInput } from './levels';
import { perkLevels } from './perkLevels.svelte';
import { listPerks } from './perks';

const perks = listPerks(gk2Data);

/** Rows whose input holds something that isn't a valid level (not saved). */
let invalid: Record<string, boolean> = $state({});

onMount(() => perkLevels.load());

/**
 * Shows the saved level in the input whenever it changes (load, Reset), unless the input
 * already shows it. Not a `value` binding, so text being typed is never overwritten.
 */
function showSavedLevel(id: string) {
	return (input: HTMLInputElement) => {
		const level = perkLevels.levels[id];
		if (parseLevelInput(input.value) !== level) input.value = String(level);
	};
}

function onLevelInput(id: string, text: string) {
	const level = parseLevelInput(text);
	invalid[id] = level === null;
	if (level !== null) perkLevels.setLevel(id, level);
}

/** Reset is asked inline (not `confirm()`, which some browsers block or let users switch off). */
let confirmingReset = $state(false);
/** Set when the inline question closes, so the Reset button gets focus back. */
let refocusReset = false;

function closeResetConfirm(doReset: boolean) {
	if (doReset) {
		perkLevels.reset();
		invalid = {};
	}
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

<h2>Perk levels</h2>

{#if perkLevels.warnings.length > 0}
	<div class="warning" role="status">
		<svg class="warning-icon" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3 2 21h20L12 3Z" />
			<path d="M12 10v5M12 18v.01" />
		</svg>
		<div class="warning-text">
			{#each perkLevels.warnings as message}
				<p>{message}</p>
			{/each}
		</div>
		<button class="dismiss" type="button" aria-label="Dismiss" onclick={() => perkLevels.dismissWarnings()}
			>×</button
		>
	</div>
{/if}

<ul class="rows">
	{#each perks as perk (perk.id)}
		<li class="row">
			<label class="name" for="level-{perk.id}">{perk.name}</label>
			<input
				id="level-{perk.id}"
				class="level"
				type="number"
				min="0"
				step="1"
				aria-invalid={invalid[perk.id] ? 'true' : undefined}
				aria-describedby={invalid[perk.id] ? `level-error-${perk.id}` : undefined}
				oninput={(e) => onLevelInput(perk.id, e.currentTarget.value)}
				{@attach showSavedLevel(perk.id)}
			/>
			<span class="affects">{perk.affects.join(', ')}</span>
			{#if invalid[perk.id]}
				<p class="error" id="level-error-{perk.id}">Enter a whole number, 0 or more.</p>
			{/if}
		</li>
	{/each}
</ul>

{#if confirmingReset}
	<div class="confirm" role="group" aria-labelledby="reset-question">
		<span id="reset-question">Reset all perk levels to 0?</span>
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

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: grid;
		grid-template-columns: 130px 64px minmax(0, 1fr);
		column-gap: var(--space-3);
		align-items: start;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-line);
	}

	.name,
	.affects {
		padding-top: 5px;
		line-height: 1.4;
	}

	.level {
		width: 64px;
		height: 28px;
		padding: 0 var(--space-1) 0 var(--space-2);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
	}

	.level::-webkit-inner-spin-button {
		margin-left: 2px;
	}

	.level[aria-invalid='true'],
	.level[aria-invalid='true']:focus {
		border-color: var(--color-error);
	}

	.error {
		grid-column: 1 / -1;
		margin: var(--space-1) 0 0;
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

	.level:focus,
	.button:focus-visible,
	.dismiss:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}
</style>
