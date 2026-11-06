import { describe, expect, it } from 'vitest';
import {
	isValidLevel,
	type LevelProblem,
	parseLevelInput,
	parseLevels,
	serializeLevels,
	warningMessages
} from './levels';

const ids = ['perk_cook', 'perk_cook_2', 'perk_blacksmith'];
const save = (levels: unknown, version: unknown = 1) => JSON.stringify({ version, levels });

describe('isValidLevel', () => {
	it('accepts whole numbers of 0 or more', () => {
		for (const n of [0, 3, 100]) expect(isValidLevel(n), String(n)).toBe(true);
	});

	it('rejects everything else', () => {
		for (const v of [-1, 1.5, '2', null, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(isValidLevel(v), String(v)).toBe(false);
		}
	});
});

describe('parseLevelInput', () => {
	it('reads digits, allowing surrounding spaces', () => {
		expect(parseLevelInput('0')).toBe(0);
		expect(parseLevelInput('7')).toBe(7);
		expect(parseLevelInput(' 12 ')).toBe(12);
	});

	it('rejects anything else', () => {
		for (const text of ['', ' ', '-1', '2.5', '1e3', 'abc']) {
			expect(parseLevelInput(text), JSON.stringify(text)).toBeNull();
		}
	});
});

describe('parseLevels', () => {
	const zeros = { perk_cook: 0, perk_cook_2: 0, perk_blacksmith: 0 };

	it('gives all zeros and no problems when nothing is saved', () => {
		expect(parseLevels(null, ids)).toEqual({ levels: zeros, problems: [] });
	});

	it('loads saved levels, with missing perks at 0', () => {
		expect(parseLevels(save({ perk_cook: 2, perk_blacksmith: 5 }), ids)).toEqual({
			levels: { perk_cook: 2, perk_cook_2: 0, perk_blacksmith: 5 },
			problems: []
		});
	});

	it('sets bad values to 0 and reports each', () => {
		expect(parseLevels(save({ perk_cook: -2, perk_cook_2: 1.5, perk_blacksmith: 4 }), ids)).toEqual(
			{
				levels: { perk_cook: 0, perk_cook_2: 0, perk_blacksmith: 4 },
				problems: [
					{ kind: 'badValue', id: 'perk_cook', value: -2 },
					{ kind: 'badValue', id: 'perk_cook_2', value: 1.5 }
				]
			}
		);
	});

	it('drops unknown perks and reports each', () => {
		expect(parseLevels(save({ perk_cook: 1, perk_old: 3 }), ids)).toEqual({
			levels: { ...zeros, perk_cook: 1 },
			problems: [{ kind: 'unknownPerk', id: 'perk_old', value: 3 }]
		});
	});

	it('treats unreadable data as all zeros', () => {
		for (const raw of ['not json', '42', '[]', JSON.stringify({ version: 1 }), save({}, 2)]) {
			expect(parseLevels(raw, ids), raw).toEqual({
				levels: zeros,
				problems: [{ kind: 'unreadable' }]
			});
		}
	});

	it('round-trips through serializeLevels', () => {
		const levels = { perk_cook: 3, perk_cook_2: 0, perk_blacksmith: 12 };
		expect(parseLevels(serializeLevels(levels), ids)).toEqual({ levels, problems: [] });
	});
});

describe('warningMessages', () => {
	const names = { perk_cook: 'Cook', perk_cook_2: 'Cook II' };

	it('returns [] for no problems', () => {
		expect(warningMessages([], names)).toEqual([]);
	});

	it('names bad values by display name, falling back to the id', () => {
		const problems: LevelProblem[] = [
			{ kind: 'badValue', id: 'perk_cook_2', value: -2 },
			{ kind: 'badValue', id: 'perk_blacksmith', value: 1.5 }
		];
		expect(warningMessages(problems, names)).toEqual([
			"Some saved perk levels weren't whole numbers of 0 or more and were set to 0: Cook II (-2), perk_blacksmith (1.5)."
		]);
	});

	it('names unknown perks by id and shows non-numbers as JSON', () => {
		const problems: LevelProblem[] = [
			{ kind: 'unknownPerk', id: 'perk_cook', value: 'abc' },
			{ kind: 'unknownPerk', id: 'perk_old', value: null }
		];
		expect(warningMessages(problems, names)).toEqual([
			'Some saved perk levels are for perks no longer listed and were dropped: perk_cook ("abc"), perk_old (null).'
		]);
	});

	it('gives one message per kind, in a fixed order', () => {
		const problems: LevelProblem[] = [
			{ kind: 'storageBlocked' },
			{ kind: 'unreadable' },
			{ kind: 'unknownPerk', id: 'perk_old', value: 3 },
			{ kind: 'badValue', id: 'perk_cook', value: -1 }
		];
		expect(warningMessages(problems, names)).toEqual([
			"Some saved perk levels weren't whole numbers of 0 or more and were set to 0: Cook (-1).",
			'Some saved perk levels are for perks no longer listed and were dropped: perk_old (3).',
			"Saved perk levels couldn't be read, so all perks start at 0.",
			"Your browser is blocking storage, so perk levels won't be kept after a reload."
		]);
	});
});
