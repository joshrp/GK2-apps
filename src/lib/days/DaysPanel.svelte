<script lang="ts">
type DayRow = { colour: string; icon: string; location: string; notes: string; day: string };

/** Fixed text, one entry per row, in this order. Line breaks in a cell are shown as typed. */
const rows: DayRow[] = [
	{
		colour: 'Burgundy',
		icon: 'Arrow Up',
		location: 'Church and Crossroads',
		notes:
			"Church Service days\n&\nYou can speak with the Nun to discuss the bodies you'll receive",
		day: 'Wrath'
	},
	{
		colour: 'Brown',
		icon: 'Antler',
		location: 'Astrologer',
		notes:
			'Focus on increasing the number of zombies you can resurrect.\n\nPlace newspapers and charged hypno devices on the PR machine every week to increase the zombie limit for the week.',
		day: 'Gluttony'
	},
	{
		colour: 'Blue',
		icon: 'Moon',
		location: 'Port area and the Market gates',
		notes: 'This is when you fight the undead at the mentioned locations.',
		day: 'Sloth'
	},
	{
		colour: 'Red',
		icon: 'Arrow down',
		location: 'Dockside Club',
		notes: 'You can provide Linda with Green Scrolls and turn in Looter Orders.',
		day: 'Lust'
	},
	{
		colour: 'Green',
		icon: 'Devil',
		location: 'Morgue and Goddess Statue',
		notes: 'This is related to the Resurrection activities and the Blue Crystals.',
		day: 'Envy'
	},
	{
		colour: 'Purple',
		icon: 'Sun',
		location: 'Town Warehouse',
		notes: 'Order accepted at town order board',
		day: 'Pride'
	}
];
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
		white-space: pre-line;
	}
</style>
