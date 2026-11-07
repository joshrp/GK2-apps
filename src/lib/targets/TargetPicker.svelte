<script lang="ts">
import { onMount, tick } from 'svelte';
import { gameModel } from '#lib/calc/gameModel';
import type { Target } from '#lib/calc/model';
import { iconUrl } from '#lib/data/icons';
import { inventory } from '#lib/plan/inventory.svelte';
import { targetQueue } from './targetQueue.svelte';
import { parseQuantity, SHOW_HIDDEN_KEY, searchTargets } from './targets';

let query = $state('');
let showHidden = $state(false);
/** Index of the highlighted result, for the arrow keys. */
let active = $state(0);
let open = $state(false);

const results = $derived(searchTargets(gameModel.targets, query, showHidden));

onMount(() => {
	targetQueue.load();
	try {
		showHidden = localStorage.getItem(SHOW_HIDDEN_KEY) === 'true';
	} catch {
		// Storage blocked: the option just isn't remembered.
	}
});

function setShowHidden(value: boolean) {
	showHidden = value;
	try {
		localStorage.setItem(SHOW_HIDDEN_KEY, String(value));
	} catch {
		// Storage blocked: the option just isn't remembered.
	}
}

function onQueryInput(text: string) {
	query = text;
	active = 0;
	open = true;
}

/** Adds the target, clears the search and keeps focus there to add more. */
function pick(target: Target) {
	targetQueue.add(target);
	query = '';
	open = false;
	active = 0;
	document.getElementById('target-search')?.focus();
}

function onSearchKeydown(e: KeyboardEvent) {
	if (e.key === 'ArrowDown' && results.length > 0) {
		e.preventDefault();
		open = true;
		active = (active + 1) % results.length;
	} else if (e.key === 'ArrowUp' && results.length > 0) {
		e.preventDefault();
		open = true;
		active = (active - 1 + results.length) % results.length;
	} else if (e.key === 'Enter' && open && results[active]) {
		e.preventDefault();
		pick(results[active]);
	} else if (e.key === 'Escape') {
		query = '';
		open = false;
	}
}

/** Queue rows whose quantity input holds something that isn't valid (not applied). */
let invalid: Record<string, boolean> = $state({});

function onQuantityInput(key: string, text: string) {
	const quantity = parseQuantity(text);
	invalid[key] = quantity === null;
	if (quantity !== null) targetQueue.setQuantity(key, quantity);
}

/**
 * Moves a target. When that takes it to the top or bottom, the button pressed is disabled and
 * would drop keyboard focus, so focus goes to the row's other arrow instead.
 */
async function moveTarget(key: string, by: -1 | 1) {
	targetQueue.move(key, by);
	await tick();
	const pressed = document.getElementById(`move-${by < 0 ? 'up' : 'down'}-${key}`);
	if (pressed instanceof HTMLButtonElement && pressed.disabled) {
		document.getElementById(`move-${by < 0 ? 'down' : 'up'}-${key}`)?.focus();
	}
}

function remove(key: string) {
	targetQueue.remove(key);
	delete invalid[key];
}

/** Shows the quantity unless the input already does, so text being typed is never overwritten. */
const showQuantity = (quantity: number) => (input: HTMLInputElement) => {
	if (parseQuantity(input.value) !== quantity) input.value = String(quantity);
};
</script>

<div class="head">
	<h2>Targets</h2>
	<label class="option">
		<input
			type="checkbox"
			checked={showHidden}
			onchange={(e) => setShowHidden(e.currentTarget.checked)}
		/>
		Show hidden
	</label>
	<label class="option">
		<input
			type="checkbox"
			checked={inventory.remember}
			onchange={(e) => inventory.setRemember(e.currentTarget.checked)}
		/>
		Remember my inventory
	</label>
</div>

{#if targetQueue.warnings.length > 0}
	<div class="warning" role="status">
		<svg class="warning-icon" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3 2 21h20L12 3Z" />
			<path d="M12 10v5M12 18v.01" />
		</svg>
		<div class="warning-text">
			{#each targetQueue.warnings as message}
				<p>{message}</p>
			{/each}
		</div>
		<button
			class="dismiss"
			type="button"
			aria-label="Dismiss"
			onclick={() => targetQueue.dismissWarnings()}>×</button
		>
	</div>
{/if}

<div class="search">
	<label class="visually-hidden" for="target-search">Add an item or building</label>
	<input
		id="target-search"
		class="field search-input"
		type="text"
		role="combobox"
		autocomplete="off"
		placeholder="Add an item or building…"
		aria-expanded={open && results.length > 0}
		aria-controls="target-results"
		aria-activedescendant={open && results[active] ? `result-${active}` : undefined}
		value={query}
		oninput={(e) => onQueryInput(e.currentTarget.value)}
		onkeydown={onSearchKeydown}
		onfocus={() => (open = true)}
		onblur={() => (open = false)}
	/>
	{#if open && results.length > 0}
		<ul id="target-results" class="results" role="listbox" aria-label="Matches">
			{#each results as target, i (`${target.kind}:${target.id}`)}
				{@const url = iconUrl(target.icon)}
				<li
					id="result-{i}"
					class="result"
					role="option"
					aria-selected={i === active}
					onmousedown={(e) => {
						e.preventDefault();
						pick(target);
					}}
					onmousemove={() => (active = i)}
				>
					{#if url}
						<img class="icon" src={url} alt="" width="24" height="24" />
					{:else}
						<span class="icon placeholder" aria-hidden="true">?</span>
					{/if}
					<span class="name">{target.name}</span>
					{#if target.kind === 'building'}<span class="tag">Building</span>{/if}
					{#if target.hidden}<span class="tag">Hidden</span>{/if}
					{#if targetQueue.has(target)}<span class="tag">Added</span>{/if}
				</li>
			{/each}
		</ul>
	{:else if open && query.trim() !== ''}
		<p class="results empty" role="status">No matches.</p>
	{/if}
</div>

{#if targetQueue.items.length === 0}
	<p class="hint">Search above to add what you want to make.</p>
{:else}
	<ul class="queue">
		{#each targetQueue.items as item, i (item.key)}
			{@const url = iconUrl(item.icon)}
			<li class="row">
				{#if url}
					<img class="icon" src={url} alt="" width="24" height="24" />
				{:else}
					<span class="icon placeholder" aria-hidden="true">?</span>
				{/if}
				<label class="name" for="qty-{item.key}"
					>{item.name}{#if item.kind === 'building'}<span class="tag">Building</span>{/if}</label
				>
				<span class="order">
					<button
						id="move-up-{item.key}"
						class="move"
						type="button"
						aria-label="Move {item.name} up"
						title="Move up: gets what you have first"
						disabled={i === 0}
						onclick={() => moveTarget(item.key, -1)}>↑</button
					>
					<button
						id="move-down-{item.key}"
						class="move"
						type="button"
						aria-label="Move {item.name} down"
						title="Move down"
						disabled={i === targetQueue.items.length - 1}
						onclick={() => moveTarget(item.key, 1)}>↓</button
					>
				</span>
				<input
					id="qty-{item.key}"
					class="field qty"
					type="number"
					min="1"
					step="1"
					aria-invalid={invalid[item.key] ? 'true' : undefined}
					aria-describedby={invalid[item.key] ? `qty-error-${item.key}` : undefined}
					oninput={(e) => onQuantityInput(item.key, e.currentTarget.value)}
					{@attach showQuantity(item.quantity)}
				/>
				<button
					class="remove"
					type="button"
					aria-label="Remove {item.name}"
					onclick={() => remove(item.key)}>×</button
				>
				{#if invalid[item.key]}
					<p class="error" id="qty-error-{item.key}">Enter a whole number, 1 or more.</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		margin-bottom: var(--space-2);
	}

	h2 {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.option {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		cursor: pointer;
	}

	.option input {
		accent-color: var(--color-focus);
	}

	.warning {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		max-width: 480px;
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

	.dismiss:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}

	.search {
		position: relative;
		max-width: 480px;
	}

	.field {
		height: 28px;
		padding: 0 var(--space-2);
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
	}

	.field:focus {
		outline: none;
		border-color: var(--color-focus);
	}

	.search-input {
		width: 100%;
	}

	.results {
		position: absolute;
		top: calc(100% + 2px);
		left: 0;
		right: 0;
		z-index: 1;
		max-height: 360px;
		margin: 0;
		padding: var(--space-1) 0;
		overflow-y: auto;
		list-style: none;
		background: var(--color-field);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
	}

	.empty {
		padding: var(--space-2) var(--space-3);
	}

	.result {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		cursor: pointer;
	}

	.result[aria-selected='true'] {
		background: var(--color-line);
	}

	.icon {
		flex: none;
		display: block;
		width: 24px;
		height: 24px;
		image-rendering: pixelated;
	}

	.placeholder {
		display: grid;
		place-items: center;
		background: var(--color-panel);
		border-radius: var(--radius);
		font-size: var(--font-size-sm);
	}

	.tag {
		margin-left: var(--space-2);
		padding: 0 var(--space-1);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		font-size: var(--font-size-sm);
	}

	.hint {
		margin: var(--space-3) 0 0;
	}

	.queue {
		max-width: 480px;
		margin: var(--space-3) 0 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr) auto 72px 28px;
		column-gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) 0;
		border-bottom: 1px solid var(--color-line);
	}

	.qty[aria-invalid='true'],
	.qty[aria-invalid='true']:focus {
		border-color: var(--color-error);
	}

	.order {
		display: flex;
		gap: 2px;
	}

	.move {
		width: 24px;
		height: 28px;
		padding: 0;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius);
		color: var(--color-text);
		font: inherit;
		line-height: 1;
		cursor: pointer;
	}

	.move:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.move:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}

	.remove {
		height: 28px;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: var(--font-size-lg);
		line-height: 1;
		cursor: pointer;
	}

	.remove:focus-visible {
		outline: none;
		border-color: var(--color-focus);
	}

	.error {
		grid-column: 2 / -1;
		margin: var(--space-1) 0 0;
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
</style>
