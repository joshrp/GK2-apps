# GK2 Crafting Calculator — Spec v1

Discovery session 2026-10-27. Data: `gk2-data.json` schema 0.1.0 (Steam build 25910882).
Private, desktop-only, hosted page. **Do not start the build until the `icons/` folder has been provided.**

> **Status (2026-11-14):** built on the `calculator` branch and merged into `main`. Decisions made
> during the build are in [calculator_notes.md](calculator_notes.md), which wins over this spec
> where they differ; its "Status" section lists what is built and what is left.

## Purpose
Pick one or more target items or buildings with quantities. Enter what you already have. Get back what to craft, at which station, and which raw items to gather.

## Targets
- A queue of targets, e.g. "4 Reinforced Beam + 2 Iron Kit I + 1 Paper Press". All targets resolve into one combined plan.
- The picker offers crafted items (326 with a real recipe) and buildings (176 named buildings with a Place cost).
- `X` and `X_place` duplicates are merged into one entry.
- Hidden by default: `likelyDev` records, unnamed records, and `<sprite …>` names. A "show hidden" toggle reveals them.
- Quality tiers are shown as "Cabbage ★1 / ★2 / ★3".

## Recipe selection
- Valid producers are crafts whose **guaranteed** output (no `chance`) is the item. Excluded: dev crafts, build-action Remove refunds, and chance-only outputs.
- For a building target, the Place action's `cost` is used.
- Where an item has several recipes, a dropdown appears on that step. The default is the first non-conveyor recipe, and the user's choice is remembered per item in browser storage.
- A **"Use conveyor recipes"** setting is OFF by default. While it is off, `conveyor`-flagged crafts are not offered. When it is on, they appear in the dropdowns.
- Cycle guard: an item that appears among its own ancestors is treated as a required item rather than expanded further (known case: Inquisitor's medallion).

## Quantities
- **Crafts needed** = ceil(shortfall ÷ guaranteed yield per craft). Every input is multiplied by the number of crafts.
- **Spare** = crafts × yield − shortfall. Spare goes into a pool and is used before any further crafts for the same item, anywhere in the tree.
- Chance outputs, by-products and bonus outputs are ignored. Where the main output is a range (`min`..`max`), `min` is used.
- Formulas: `PPar("x")` and `WorkerPar("x")` both read the user's level for `x` from Settings. The arithmetic in a formula is evaluated (+ − * / and parentheses only), never as arbitrary code. Input formulas are evaluated the same way.

## Inventory flow
- Inventory is keyed **per item**, not per row. A count entered once applies wherever that item appears, and is used up only once across the whole plan.
- "Any of" inputs (item groups and `anyQuality`) take one combined count; the tier doesn't matter.
- Field states:
  - blank = not checked yet; the row stays collapsed and shows its need.
  - number < need = the row expands for the shortfall only.
  - number ≥ need = the row is marked covered.
- Inventory starts fresh on every load. A "Remember my inventory" toggle persists it in browser storage.

## Required items (raw)
- Any input with no valid recipe is a leaf, listed as **"Required items"** (gather / buy). Examples: Fat, Log, Steel Ingot, Glue, Flax.
- Fuel (`fire`) is listed separately as **furnace fuel units**, not as an item.

## Output layout (side by side)
1. **Expandable tree**: each step shows the item, the amount needed, the number of crafts, any spare, and the **station**. Where a recipe runs at several stations it lists them all ("Iron Anvil or Steel Anvil").
2. **Flat list**: Required items with totals, fuel units, and **Required buildings / tools**. That last group is every distinct station the plan uses (e.g. Iron Anvil, Circular Saw, Distillation Cube).
- Nice-to-have, later: (c) a craft-order list grouped by station; (d) unlock requirements ("needs tech: …", or "unlock: unknown" where the data has no source).

## Settings panel (saved in browser storage)
- Perk levels 0–6, default 0. Only perks that appear in formulas are listed (Builder, Carpenter, Engineer, Fireman, Blacksmith, Mason, Cook I/II, Alchemist, Heat Saver, Cube distillations, Glassworker, Paper maker, Farmer I/II, Seed Master, Compost Chemist, Fish Filleter, Treasure Hunter, Tailor, Miller, Cremator, Axeman, Wine Master, Brewer, Grape Master, Gear Master, Gold Digger, Magpie's Eye).
- Use conveyor recipes: off.
- Show hidden content: off.
- Remember inventory: off.

## Data handling
- The 0.1.0 data is built into the page, with a **"Load newer data file"** button that loads a replacement JSON (stored in the browser).
- An adapter layer maps the export into the calculator's internal model. Schema changes are absorbed there, and the app warns when `schemaVersion` differs from 0.1.x.
- Icons come from `icons/<icon>.png`, rendered pixelated. Items without an icon get a text placeholder.

## Worked check (4 Reinforced Beam, all perks 0, no inventory)
4× Reinforced Beam (Iron/Steel Anvil) needs 4 Oiled Beam + 4 Iron Detail.
- 4 Oiled Beam: 2 crafts at Woodworking Workbench II, needing 2 Melted Fat + 4 Wooden beam.
- 4 Iron Detail: 1 craft (2 spare), needing 1 Iron Ingot.
- 2 Melted Fat: 1 craft (2 spare), needing 1 Fat + 2 Clay Plate + 20 fuel.
- 4 Wooden beam: 2 crafts at Circular Saw, needing 2 Log.
- 1 Iron Ingot: 1 furnace craft (2 spare), needing 3 Iron Ore + 30 fuel.

## Open questions
1. **Icons folder.** Needed before the build starts.
2. **Game-state switches in formulas.** These are not perks: `church_better`, `church_best`, `zombie_conveyor_transporter_ready`, and `basement_blockage_{conveyors,vineyard,well,morgue,warehouse}_darkness_destroyed`. Proposal: on/off toggles in Settings, default off.
3. **Buildings (Q10).** Interpretation: buildings can be picked as targets AND every station a plan uses is listed under "Required buildings / tools". Should a required station that you don't own yet also be expanded into its own build cost, or just listed?