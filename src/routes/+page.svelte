<div class="shell">
	<aside class="panel" aria-label="Settings">
		<h2>Perk levels</h2>
	</aside>
	<main class="main">
		<h2>Targets</h2>
	</main>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: var(--panel-width) minmax(0, 1fr);
		min-height: 100vh;
	}

	.panel {
		background: var(--color-panel);
		border-right: 1px solid var(--color-line);
		padding: var(--space-3) var(--space-4);
	}

	.main {
		padding: var(--space-4);
	}

	h2 {
		font-size: var(--font-size-lg);
		margin: 0 0 var(--space-2);
	}
</style>
