<script lang="ts">
type DayRow = { colour: string; icon: string; location: string; notes: string; day: string };

const blank: DayRow = { colour: '', icon: '', location: '', notes: '', day: '' };

/** Fixed text, one entry per row. Blank for now. */
const rows: DayRow[] = Array.from({ length: 6 }, () => ({ ...blank }));
</script>

<table class="days">
	<thead>
		<tr>
			<th scope="col">Colour</th>
			<th scope="col">Icon</th>
			<th scope="col">Location</th>
			<th scope="col">Notes</th>
			<th scope="col">Day</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row}
			<tr>
				<td>{row.colour}</td>
				<td>{row.icon}</td>
				<td>{row.location}</td>
				<td>{row.notes}</td>
				<td>{row.day}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.days {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		padding: var(--space-1) var(--space-3) var(--space-2) 0;
		font-weight: 500;
		text-align: left;
		border-bottom: 1px solid var(--color-line);
	}

	td {
		height: 40px;
		padding: var(--space-1) var(--space-3) var(--space-1) 0;
		border-bottom: 1px solid var(--color-line);
		vertical-align: middle;
	}
</style>
