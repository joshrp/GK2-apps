/**
 * Stations for crafts whose `stations` list is empty in the export (see calculator_notes.md,
 * "Station fixes"). Used only while the export's list is empty, so an updated export wins.
 * Crafts not listed here show "Station unknown".
 */
export const STATION_FIXES: Readonly<Record<string, string>> = {
	...Object.fromEntries(
		[
			'prayer_protection',
			'prayer_imagination',
			'prayer_insanity',
			'prayer_prosperity',
			'prayer_purity',
			'prayer_consumption',
			'prayer_demand',
			'prayer_speed',
			'prayer_obedience',
			'prayer_repentance',
			'prayer_music'
		].map((id) => [id, 'writing_desk_1'])
	),
	book: 'newspaper_press',
	book_hard: 'newspaper_press',
	newspaper: 'newspaper_press',
	ceramic_fired_1: 'potter_wheel_1',
	ceramic_fired_2: 'potter_wheel_1',
	...Object.fromEntries(
		[
			'heal_potion',
			'heal_potion_2',
			'energy_potion',
			'energy_potion_2',
			'energy_potion_3',
			'exp_red_potion_2',
			'exp_green_potion_2',
			'exp_blue_potion_2',
			'exp_orange_potion_2',
			'exp_yellow_potion_2',
			'quest_paint',
			'lacquer'
		].map((id) => [id, 'alchemy_mix'])
	)
};

/**
 * Ingredients from the game where the export's are wrong (agreed 2026-11-14). Used instead of the
 * export's inputs. Outputs are unchanged.
 */
export const KNOWN_RECIPE_INPUTS: Readonly<Record<string, [itemId: string, count: number][]>> = {
	// Export: 1 Melted Fat + 1 Dye.
	quest_paint: [['water', 2]],
	// Export: 1 Melted Fat + 1 Resin.
	lacquer: [['flower_night', 1]]
};

/**
 * Build costs from the game for stations the export has no Place cost for (agreed 2026-11-06).
 * Used instead of anything in the export.
 */
export const KNOWN_STATION_COSTS: Readonly<Record<string, [itemId: string, count: number][]>> = {
	kitchen_table_t2: [
		['detail_1_iron', 4],
		['wooden_plank', 8],
		['wooden_beam', 2]
	],
	kitchen_oven_t2: [
		['stone_plate_1', 16],
		['stone_plate_2', 4],
		['detail_1_iron', 4]
	],
	compost_pile_2: [
		['wood1', 12],
		['nails_bronze', 8],
		['details_1_bronze', 2]
	],
	crematorium_1: [
		['brick', 6],
		['details_1_bronze', 6]
	],
	crematorium_2: [
		['brick', 12],
		['detail_2_iron', 8]
	],
	millstone: [
		['flitch', 2],
		['stone_plate_1', 2]
	]
};

/** Stations that come with the game, so they have no build cost. */
export const COMES_WITH_GAME: ReadonlySet<string> = new Set([
	'kitchen_table',
	'kitchen_oven',
	'compost_pile_1'
]);

/**
 * Locations from the game for stations no build menu offers (agreed 2026-11-06). Used only while
 * the export gives none. Anything without a location shows "Unknown" (e.g. Locked door).
 */
export const KNOWN_LOCATIONS: Readonly<Record<string, string>> = {
	kitchen_table: 'Home',
	kitchen_table_t2: 'Home',
	kitchen_oven: 'Home',
	kitchen_oven_t2: 'Home',
	compost_pile_1: 'Garden',
	compost_pile_2: 'Garden'
};

/** Listed on the Stations tab for completeness only: they store firewood, no recipe runs there. */
export const STORAGE_ONLY: ReadonlySet<string> = new Set([
	'firewood_shed_1',
	'firewood_shed_kitchen_1'
]);
