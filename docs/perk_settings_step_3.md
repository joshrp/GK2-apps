# Perk settings: build plan for step 3

Brief for step 3 of the perk levels panel: saving levels in browser storage. Agreed with the user
on 2026-11-05. Read `CLAUDE.md`, `docs/perk_settings_notes.md` and
`docs/perk_settings_steps_1_2.md` (ground rules) first. Those ground rules apply here too.

## Goal

A shared, tested runes module that holds the perk levels, saves them to `localStorage` on every
change, loads them on start, resets them, and reports anything in the saved data it couldn't use.
**No UI changes** in this step: the inputs, the Reset button (with its confirm) and the warning
display arrive with the rows in step 4.

## Files

| File                                | Action                                               |
| ----------------------------------- | ---------------------------------------------------- |
| `src/lib/perks/levels.ts`           | new: pure functions (parse, serialize, messages)     |
| `src/lib/perks/levels.test.ts`      | new: tests for the pure functions                    |
| `src/lib/perks/perkLevels.svelte.ts` | new: the runes store class and the shared instance  |
| `src/lib/perks/perkLevels.test.ts`  | new: tests for the store, with a fake `Storage`      |

## Levels

- One level per perk id from `listPerks` (character level only, see the notes).
- A valid level is a whole number of 0 or more (`Number.isInteger(n) && n >= 0`). No maximum.
- Every perk starts at 0. A perk missing from the saved data counts as 0, with no warning.

## Storage format

- Key: `gk2calc.perkLevels`.
- Value: JSON `{ "version": 1, "levels": { "<perk id>": <level>, … } }`, with every listed perk
  included (zeros too).
- `version` lets a later format change recognise old data. Any version other than 1 is treated as
  unreadable.

## Loading and warnings

Loading never throws. It returns clean levels plus a list of problems. Each kind of problem gives
one warning message, in this order:

| Problem                                                          | Result                     | Message                                                                                                          |
| ---------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Bad value: a listed perk whose level isn't valid                 | that perk is 0             | `Some saved perk levels weren't whole numbers of 0 or more and were set to 0: Cook II (-2), Blacksmith (1.5).`   |
| Unknown perk: a saved id that isn't in today's list              | dropped                    | `Some saved perk levels are for perks no longer listed and were dropped: perk_old_thing (3).`                   |
| Unreadable: not JSON, wrong shape, or version isn't 1            | all perks 0                | `Saved perk levels couldn't be read, so all perks start at 0.`                                                   |
| Storage blocked: reading or writing `localStorage` throws        | levels work, not kept      | `Your browser is blocking storage, so perk levels won't be kept after a reload.`                                 |

- Bad values are named by the perk's display name; unknown perks by their id. The saved value is
  shown as it was: numbers as-is, anything else as JSON (`"abc"`, `null`).
- No saved data at all (first visit) is not a problem: all zeros, no warning.
- After a load with bad values, unknown perks or unreadable data, the cleaned levels are saved
  straight away, so the same warning doesn't come back on the next reload.
- Warnings stay until dismissed (`dismissWarnings()`); step 4 shows them under the "Perk levels"
  heading with a × button.

## `src/lib/perks/levels.ts`

Pure: no `localStorage`, no `gk2Data`, no runes.

```ts
export const STORAGE_KEY = 'gk2calc.perkLevels';
export type PerkLevels = Record<string, number>;
export type LevelProblem =
	| { kind: 'badValue'; id: string; value: unknown }
	| { kind: 'unknownPerk'; id: string; value: unknown }
	| { kind: 'unreadable' }
	| { kind: 'storageBlocked' };

export function isValidLevel(value: unknown): value is number;
export function zeroLevels(perkIds: string[]): PerkLevels;
/** Saved text (or null when nothing is saved) to clean levels plus the problems found. */
export function parseLevels(raw: string | null, perkIds: string[]): {
	levels: PerkLevels;
	problems: LevelProblem[];
};
export function serializeLevels(levels: PerkLevels): string;
/** One message per kind of problem, in the table's order. */
export function warningMessages(problems: LevelProblem[], names: Record<string, string>): string[];
```

## `src/lib/perks/perkLevels.svelte.ts`

```ts
export class PerkLevelStore {
	levels: PerkLevels;        // $state
	problems: LevelProblem[];  // $state
	get warnings(): string[];  // messages for problems (a getter: reactive through problems)
	constructor(perks: PerkDef[], getStorage?: () => Storage); // default: () => localStorage
	load(): void;
	setLevel(id: string, level: number): void; // ignores unlisted ids and invalid levels
	reset(): void;                              // all perks to 0, then save
	dismissWarnings(): void;
}
export const perkLevels: PerkLevelStore; // shared instance over listPerks(gk2Data)
```

- The app is prerendered, so nothing may touch `localStorage` at import time. `getStorage` is only
  called inside `load()` and saves, each wrapped in `try`/`catch`. Step 4 calls `load()` once, in
  the browser, when the panel mounts.
- A failure to read or write adds a `storageBlocked` problem (once) and the app carries on with
  in-memory levels.
- `setLevel` and `reset` save immediately.

## Tests

`levels.test.ts`:
- `isValidLevel`: 0, 3 and 100 valid; -1, 1.5, `'2'`, `null`, `NaN` and `Infinity` invalid.
- `parseLevels`:
  - `null` gives all zeros and no problems;
  - a valid save loads its levels, and missing perks are 0;
  - bad values become 0 with a `badValue` problem each;
  - unknown ids are dropped with an `unknownPerk` problem each;
  - not-JSON, a non-object, a missing `levels` object and `version: 2` are each `unreadable`,
    with all zeros.
- `serializeLevels` then `parseLevels` gives the same levels back.
- `warningMessages`: each message's exact text, names used for bad values and ids for unknown
  perks, non-numbers shown as JSON, the fixed order, and `[]` for no problems.

`perkLevels.test.ts` (fake in-memory `Storage`):
- an empty store loads all zeros with no warnings;
- `setLevel` saves straight away, and a new store over the same storage loads it;
- `setLevel` ignores unlisted ids and invalid levels;
- `reset` sets every perk to 0 and saves;
- a load with problems sets `warnings` and re-saves the cleaned levels, so a second load has no
  warnings;
- `dismissWarnings` clears them;
- a storage that throws gives one `storageBlocked` warning, and levels still change in memory.

## Done when

- [ ] All tests pass; `npm run lint`, `npm run check` and `npm test` pass.
- [ ] The page is unchanged and its console has no errors.
- [ ] **Stop. Report to the user** and wait for approval before step 4.
