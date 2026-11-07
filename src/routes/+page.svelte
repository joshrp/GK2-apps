<script lang="ts">
import DaysPanel from '#lib/days/DaysPanel.svelte';
import PerkPanel from '#lib/perks/PerkPanel.svelte';
import PlanView from '#lib/plan/PlanView.svelte';
import StationsPanel from '#lib/stations/StationsPanel.svelte';
import TargetPicker from '#lib/targets/TargetPicker.svelte';

const tabs = [
	{ id: 'calculator', label: 'Calculator' },
	{ id: 'days', label: 'Days' },
	{ id: 'stations', label: 'Stations' },
	{ id: 'perks', label: 'Perks' }
] as const;

type TabId = (typeof tabs)[number]['id'];

let current: TabId = $state('calculator');

/** Left/Right (wrapping), Home and End move between tabs, as in the ARIA tabs pattern. */
function onTabKeydown(e: KeyboardEvent, index: number) {
	const count = tabs.length;
	const moves: Record<string, number> = {
		ArrowRight: (index + 1) % count,
		ArrowLeft: (index - 1 + count) % count,
		Home: 0,
		End: count - 1
	};
	const next = moves[e.key];
	if (next === undefined) return;
	e.preventDefault();
	current = tabs[next].id;
	document.getElementById(`tab-${current}`)?.focus();
}
</script>

<div class="page">
	<header class="header">
		<div class="tabs" role="tablist" aria-label="Sections">
			{#each tabs as tab, i (tab.id)}
				<button
					id="tab-{tab.id}"
					class="tab"
					type="button"
					role="tab"
					aria-selected={current === tab.id}
					aria-controls="panel-{tab.id}"
					tabindex={current === tab.id ? 0 : -1}
					onclick={() => (current = tab.id)}
					onkeydown={(e) => onTabKeydown(e, i)}>{tab.label}</button
				>
			{/each}
		</div>
	</header>

	<main class="main">
		<div
			id="panel-calculator"
			role="tabpanel"
			aria-labelledby="tab-calculator"
			hidden={current !== 'calculator'}
		>
			<TargetPicker />
			<PlanView />
		</div>
		<div id="panel-days" role="tabpanel" aria-labelledby="tab-days" hidden={current !== 'days'}>
			<DaysPanel />
		</div>
		<div
			id="panel-stations"
			role="tabpanel"
			aria-labelledby="tab-stations"
			hidden={current !== 'stations'}
		>
			<StationsPanel />
		</div>
		<div
			id="panel-perks"
			class="perks"
			role="tabpanel"
			aria-labelledby="tab-perks"
			hidden={current !== 'perks'}
		>
			<PerkPanel />
		</div>
	</main>

	<footer class="footer">Conveyors and Zombies are not included at this time</footer>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--color-panel);
		border-bottom: 1px solid var(--color-line);
		padding: 0 var(--space-4);
	}

	.tabs {
		display: flex;
		gap: var(--space-1);
	}

	.tab {
		margin-bottom: -1px;
		padding: var(--space-3) var(--space-4);
		background: none;
		border: 1px solid transparent;
		border-bottom: 2px solid transparent;
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-size-lg);
		cursor: pointer;
	}

	.tab[aria-selected='true'] {
		border-bottom-color: var(--color-text);
		font-weight: 500;
	}

	.tab:focus-visible {
		outline: none;
		border-color: var(--color-focus);
		border-radius: var(--radius) var(--radius) 0 0;
	}

	.main {
		flex: 1;
		padding: var(--space-4);
	}

	.perks {
		max-width: var(--panel-width);
	}

	.footer {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-line);
		font-size: var(--font-size-sm);
	}
</style>
