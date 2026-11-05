# Perk settings: build plan for steps 1 and 2

Handoff brief for the agent building the first two steps of the perk levels panel. Read these
first, in order:

1. `CLAUDE.md`: working agreement, commands, conventions. It is binding.
2. `docs/perk_settings_notes.md`: every decision made so far. Where it and the spec differ, the
   notes win.
3. `docs/calculator_spec.md`: the wider calculator, for context only.
4. `data_export/SCHEMA.md` and `data_export/gk2-data.d.ts`: the game data shape.

## Ground rules for this work

- Do **step 1 only**, then stop and check in with the user. Start step 2 only after they say so.
  Stop and check in again after step 2.
- Work on the `perk-settings` branch, not `main`. Check with `git branch --show-current` before
  changing anything. Don't create worktrees, and don't commit, push or merge unless asked.
- Don't start, restart or stop the dev server; the user keeps it running. Look at
  http://localhost:5173 in the built-in browser and check the page **and** its console after UI
  changes. If it isn't running, ask.
- Run npm through WSL, for example `wsl --cd ~/projects/gk2apps -e bash -ic 'npm run lint'`. For
  anything with nested quotes, write a script file and run it with `bash`.
- Before reporting a step as done, run `npm run lint`, `npm run check` and `npm test` and make sure
  all three pass. If one fails for a non-trivial reason, report the output and ask before fixing.
- Formatting follows `biome.json`: tabs, single quotes, no trailing commas, 100-character lines.
  `npm run lint:fix` handles formatting.
- Use Svelte 5 runes only. No `export let`, and no stores for component state.
- If anything here doesn't match what you find (a path, a count, a type error you can't explain),
  stop and ask. Don't work around it.

## Out of scope for steps 1 and 2

- The perk rows, the number inputs, Reset, the footnote, and the Affects "+N more" popover.
  These are steps 4 and 5.
- Saving levels to browser storage. That's step 3.
- Evaluating formulas, the calculator itself, targets, inventory, conveyor settings and the
  "load newer data" feature.
- CI and GitHub Pages. The data stays in `data_export/`, which is gitignored. Don't move it into
  the repo or change `.gitignore`.

---

## Step 1: theme and page shell

**Goal:** the app renders the agreed dark theme with an empty perk panel on the left and an empty
main area on the right. It has no real content yet.

### Files

| File | Action |
|---|---|
| `src/lib/styles/tokens.css` | new: design tokens and base styles |
| `src/routes/+layout.svelte` | edit: import the tokens and set the page title |
| `src/routes/+page.svelte` | edit: replace the `<h1>` with the two-column shell |

### `src/lib/styles/tokens.css`

Define tokens on `:root`. These are the agreed values from the mockup the user approved:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#16140f` | page background |
| `--color-panel` | `#1f1c17` | left panel background |
| `--color-field` | `#2a2620` | input backgrounds (used from step 4) |
| `--color-line` | `#36322a` | hairline borders and row dividers |
| `--color-text` | `#ffffff` | **all** text. There's no muted grey; the user asked for all text white |
| `--color-accent` | `#d9a54a` | only for the focus border of an input (used from step 4) |
| `--space-1` … `--space-4` | `4px`, `8px`, `12px`, `16px` | spacing |
| `--radius` | `6px` | inputs, buttons |
| `--font-size-sm` / `--font-size-md` / `--font-size-lg` | `12px` / `13px` / `14px` | small text / body / panel heading |
| `--font-sans` | `system-ui, sans-serif` | body font |
| `--panel-width` | `450px` | left panel width |

Base rules:

- `:root { color-scheme: dark; }`. The theme is **always dark** and ignores the OS setting, so
  there is no `prefers-color-scheme` media query. `color-scheme: dark` makes native controls such
  as number-input arrows render dark.
- `html, body`: `margin: 0`, `background: var(--color-bg)`, `color: var(--color-text)`,
  `font-family: var(--font-sans)`, `font-size: var(--font-size-md)`.
- `*, *::before, *::after { box-sizing: border-box; }`
- Headings use `font-weight: 500`.

### `src/routes/+layout.svelte`

- Add `import '#lib/styles/tokens.css';` next to the existing favicon import. `#lib/*` maps to
  `./src/lib/*` through `imports` in `package.json`. If Vite won't resolve a CSS import through it,
  use a relative path (`'../lib/styles/tokens.css'`) and mention it in your report.
- In `<svelte:head>`, add `<title>GK2 Crafting Calculator</title>`.

### `src/routes/+page.svelte`

Replace the `<h1>` with:

```svelte
<div class="shell">
	<aside class="panel" aria-label="Settings">
		<h2>Perk levels</h2>
		<!-- step 4 puts the perk rows here -->
	</aside>
	<main class="main">
		<h2>Targets</h2>
		<!-- later steps: target queue, craft tree, required items -->
	</main>
</div>
```

The `<!-- -->` comments above are only guidance; leave them out of the file unless they help.
Scoped styles in the same file:

- `.shell`: `display: grid; grid-template-columns: var(--panel-width) minmax(0, 1fr); min-height: 100vh;`
- `.panel`: `background: var(--color-panel); border-right: 1px solid var(--color-line); padding: var(--space-3) var(--space-4);`
- `.main`: `padding: var(--space-4);`
- `h2`: `font-size: var(--font-size-lg); margin: 0 0 var(--space-2);`

Desktop only. Don't add mobile breakpoints.

### Done when

- [ ] At http://localhost:5173 the page is dark (`#16140f`), with a `#1f1c17` panel 450px wide on
      the left headed "Perk levels", a divider line, and "Targets" on the right. All text is white.
- [ ] The browser tab title is "GK2 Crafting Calculator".
- [ ] There are no errors or warnings in the browser console.
- [ ] `npm run lint`, `npm run check` and `npm test` pass.
- [ ] **Stop. Report to the user** with a screenshot and the check output, and wait for approval
      before step 2.

---

## Step 2: the perk list from the game data

**Goal:** a tested, pure TypeScript function that reads the game data and returns the 19 perks the
panel will show, each with its display name and the recipes it affects. There are **no UI changes**
in this step.

### Files

| File | Action |
|---|---|
| `src/lib/data/gk2.ts` | new: loads and types the game data |
| `src/lib/perks/perks.ts` | new: pure functions that build the perk list |
| `src/lib/perks/perks.test.ts` | new: Vitest tests (fixtures and the real data) |

### `src/lib/data/gk2.ts`

```ts
import type { Gk2Data } from '../../../data_export/gk2-data.d.ts';
import raw from '../../../data_export/gk2-data.json';

export type * from '../../../data_export/gk2-data.d.ts';
export const gk2Data = raw as unknown as Gk2Data;
```

- `data_export/` sits at the project root, which Vite and Vitest can read. It's gitignored, and so
  Biome ignores it. **Don't edit anything in `data_export/`.**
- The `as unknown as` cast is needed because TypeScript infers literal types from the JSON that
  won't match `Gk2Data`'s unions.
- Things to verify with `npm run check`:
  - JSON imports work under the SvelteKit tsconfig (`resolveJsonModule`);
  - `import type` from a `.d.ts` path is accepted;
  - `export type *` works with TypeScript 6.

  If any of these fails, don't change `tsconfig.json` without asking. Report the error and the fix
  you'd suggest.

### What counts as "a perk the calculator uses"

Build the list **from the data by rule**, not from a hard-coded list, so a newer data file picks up
changes. The real-data test (below) pins the expected result.

A perk is listed when its id appears as the argument of `PPar("…")` or `WorkerPar("…")` in a
quantity the calculator reads, on a craft the calculator can use.

**Crafts the calculator can use:** every `crafts[]` record where
- `likelyDev` is `false`, and
- `flags` does not include `'conveyor'`. The user can't use conveyors yet; see the notes'
  "Review later" section.

`flags: 'auto'` crafts (furnaces, ovens, the distillation cube) **are** used. "Auto" means
unattended, not "done by a zombie". Don't exclude them.

**Quantities the calculator reads:**
- `outputs[]` entries where `chance === null`: their `count` and `min`. A `min`..`max` range uses
  `min`, per the spec. Outputs with a `chance` are ignored entirely, even if their `count` is a
  formula.
- `inputs[]`: their `count`. This is how Heat Saver reduces fuel (`fire`).
- **Not** `duration`, `energyPerTick`, `techPoints`, `effectsOnEnd`, `unlock`, `raw`, or build
  actions on `buildables`. In this data no build-action quantity has a formula. If you find one,
  report it rather than adding it.

A `Quantity` is `number | { formula: string; authored?: string }` and can also be `null` on
outputs. Only the object form has parameters.

Both `PPar` and `WorkerPar` count. The user chose "character level only": one level per perk, read
by both functions. See "How perk levels work" in the notes.

### `src/lib/perks/perks.ts`

Export:

```ts
export interface PerkDef {
	/** Game perk id, e.g. 'perk_blacksmith' or 'zperk_tailor'. */
	id: string;
	/** Display name from `data.names`, falling back to the id. */
	name: string;
	/** Display names of the recipes this perk changes: de-duplicated, in game order. */
	affects: string[];
}

/** Perk ids used by PPar/WorkerPar in a quantity; [] for numbers, null and plain formulas. */
export function formulaParams(q: Quantity | null): string[];

/** Perks that change the calculator's results, sorted by name. */
export function listPerks(data: Gk2Data): PerkDef[];
```

Details:

- `formulaParams`: match `/(?:PPar|WorkerPar)\("([^"]+)"\)/g` against `q.formula` and return the
  captured ids, de-duplicated. There's one formula in the data with no function call at all
  (`"perk_alchemist"`, on a chance output of `energy_potion_3`). It must return `[]`, not throw.
- Recipe display name: `craft.name`, else `data.names[craft.id]`, else `craft.id`. Every craft
  affected by the 19 perks has a name in this data, but keep the fallback.
- `affects` is de-duplicated by display name. Quality tiers produce repeats such as "Cabbage soup"
  ×3 under Cook II. Keep the first-seen game order.
- Perk display name: `data.names[id]`, else `id`. Use the data's names as they are. For example
  the data says "Cook", not "Cook I", and "Fish Filleter" for `perk_fishcutter`.
- Sort the result by `name` with `localeCompare`.
- Keep it pure: no imports of `gk2Data` in this file. The caller passes the data in, so tests can
  pass fixtures.
- Comment density should match the surrounding code: short doc comments on exports, not line by
  line.

### `src/lib/perks/perks.test.ts`

**Fixture tests** cover the rules. Write a small helper that builds a full `Craft` with defaults
(`likelyDev: false`, `flags: []`, empty arrays, `unlock: { required: false, sources: [] }`,
`raw: null`, and so on) plus overrides, and a minimal `Gk2Data` holding only `crafts` and `names`
(the other collections are empty arrays).

- `formulaParams`:
  - `5` → `[]`
  - `null` → `[]`
  - `{ formula: '12+4*WorkerPar("perk_blacksmith")' }` → `['perk_blacksmith']`
  - a `PPar` formula → its id
  - two different ids in one formula → both
  - the same id twice → once
  - `{ formula: 'perk_alchemist' }` → `[]`
- `listPerks`:
  - a perk in a guaranteed output `count` is listed, with that craft in `affects`;
  - a perk in an output `min` is listed;
  - a perk in an input `count` is listed;
  - a perk only in an output with a `chance` (either in its `count` or in the `chance` itself) is
    **not** listed;
  - a perk only on a `likelyDev` craft is not listed;
  - a perk only on a `conveyor` craft is not listed;
  - a perk on both a normal and a conveyor craft is listed, with only the normal craft in `affects`;
  - two crafts with the same name appear once in `affects`;
  - names come from `names`, falling back to the id;
  - results are sorted by name.

**Real-data tests** import `gk2Data` from `#lib/data/gk2`. These pin today's data and will flag
changes when a new export arrives.

- The ids are exactly these 19, in any order: `perk_axeman`, `perk_blacksmith`, `perk_brewer`,
  `perk_carpenter`, `perk_compost_chemist`, `perk_cook`, `perk_cook_2`, `perk_cremator`,
  `perk_cube_distillations`, `perk_engineer`, `perk_fireman`, `perk_fishcutter`, `perk_gearmaster`,
  `perk_glassworker`, `perk_paper_maker`, `perk_winemaster`, `zperk_miller`, `zperk_tailor`,
  `perk_heat_saver`.
- None of these is listed: `perk_builder`, `perk_alchemist`, `perk_mason`, `perk_golddigger`,
  `zperk_magpies_eye`, `perk_farmer`, `perk_farmer_2`, `perk_seedmaster`, `perk_grapemaster`,
  `perk_rich_surgeon`.
- Spot checks (each was seen in a manual scan of this data):
  - Blacksmith affects include "Iron Nails".
  - Fireman affects include "Iron Ingot". Fireman's crafts are all `auto`, so this catches a wrong
    `auto` exclusion.
  - Heat Saver affects include "Bread".
  - Miller's affects are exactly `['Flour']`. "Supply: Flour Sack" is a conveyor craft.
  - Tailor's affects contain no name starting with "Supply:" and no "Fabric".
  - No perk's `affects` has duplicates.
  - Every perk has at least one affected recipe.

If a real-data expectation fails, **don't change the test to match**. Report what the data
returned, because it may be a rule mistake or a data surprise, and the user decides.

### Done when

- [ ] All fixture and real-data tests pass.
- [ ] `npm run lint`, `npm run check` and `npm test` pass.
- [ ] The page in the browser is unchanged from step 1, and the console has no errors.
- [ ] **Stop. Report to the user:** the 19 perk names in display order, each with its
      affected-recipe count, plus anything surprising. Wait for approval before step 3.

---

## Next steps after these two (for context only)

3. Saved settings: perk levels (character level only, whole numbers, min 0, no max) saved to
   `localStorage` under a versioned key, plus Reset. Tests included.
4. Panel on screen: three-column rows (name, number input starting at 0 with native arrows and a
   2px gap, Affects).
5. Finishing touches: Affects shortened to the first three names and a "+N more" button that
   opens the full list in a popover (see the notes' "Layout and UX"), and the
   footnote: "Only your character's perk levels are used. Update the app when zombie or worker
   levels need to be included."
