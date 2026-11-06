# Perk settings — decisions and deferred items

Decisions for the Settings panel "perk levels" slice, agreed 2026-11-05. Read alongside
[calculator_spec.md](calculator_spec.md); where they differ, this file wins.

## Decisions

### Scope and data
- The game data is committed (agreed 2026-11-06, replacing "local use only"): `data_export/`'s
  JSON, types, README and SCHEMA are in the repo, so CI can check, test and build. The repo is
  private, but the deployed Pages site is public and bundles the full JSON (about 190 KB
  gzipped); the user accepted that. Icons (`data_export/icons/`) stay gitignored until the app
  shows them. No trimming for now: dropping `raw` would only save about 75 KB gzipped.
- Only perks that change the calculator's result are listed: 19 perks.
  - Yield: Axeman, Blacksmith, Brewer, Carpenter, Compost Chemist, Cook, Cook II, Cremator,
    Cube distillations, Engineer, Fireman, Fish Filleter, Gear Master, Glassworker, Paper maker,
    Wine Master, Miller, Tailor.
  - Fuel: Heat Saver.
  - Left out, as they only touch chance outputs (which the calculator ignores): Builder,
    Alchemist, Mason, Gold Digger, Magpie's Eye.
  - Left out, as they aren't in any field the calculator reads: Farmer, Farmer II, Seed Master,
    Grape Master, Treasure Hunter.
- **Character level only.** One level per perk, the character's. Both `PPar("x")` and
  `WorkerPar("x")` read it, as if the character does every craft.

### Layout and UX
- Dark theme only, whatever the OS setting. All text is white (`#ffffff`). Styling will be
  revisited after the app has been in use.
- Colours with a job (agreed 2026-11-06, replacing the single amber accent): focus border
  `#32a852` green, warnings `#d9a54a` amber, invalid input `#e05252` red.
- The panel is on the **Perks** tab (it sat on the left until the calculator's tabs replaced the
  left panel on 2026-11-06; see [calculator_notes.md](calculator_notes.md), "Layout").
- One row per perk, three columns:
  1. perk name
  2. level: a number input starting at 0, whole numbers, min 0, no max, native up/down arrows
     with a 2px gap before them
  3. Affects: the recipes the perk changes. Names are de-duplicated (quality tiers share a name,
     e.g. Cabbage soup). Lists of five or more show the first three and a "+N more" button
     (agreed 2026-11-05, replacing "full list on hover"; on 2026-11-06 lists of four were made to
     show in full, so there's never a "+1 more"). The button opens a small popover under the
     row, floating over the rows below, headed "<Perk> affects N recipes", with every name in two
     columns. It closes with its × button, Esc, a click elsewhere, or the "+N more" button again.
     Lists of four or fewer are shown in full with no button.
- An invalid level (empty, negative, decimal) gets a red border and "Enter a whole number, 0 or
  more." under the row. It isn't saved, and stays as typed until fixed.
- Non-zero perks get no visual cue. There is a Reset button under the rows that sets all perks
  to 0, after an inline confirm: the button is replaced by "Reset all perk levels to 0?" with
  Reset and Cancel buttons (Esc cancels). Not the browser's `confirm()`, which the built-in
  browser pane blocks and Chrome lets users switch off (found 2026-11-06).
- Footnote at the bottom of the panel, under Reset, in small text: "Only your character's perk
  levels are used. Update the app when zombie or worker levels need to be included."
- Levels are saved in browser storage on every change. A brief flash of zeros on load is
  accepted.
- Saved levels that can't be used (bad values, perks no longer listed, unreadable data) are
  cleaned up and named in a warning under the heading, which stays until dismissed with ×. A
  warning also shows when the browser blocks storage. Details in
  [perk_settings_step_3.md](perk_settings_step_3.md).
- The levels live in a shared runes module, so the calculator can read them later.

### Accepted behaviour
- One recipe can appear under two perks (e.g. Bread under Cook and Heat Saver).
- Recipes flagged `likelyDev` are hidden. If a real recipe is missing, it will be flagged on an
  updated build.
- Conveyor crafts are left out of the Affects lists, in line with "Use conveyor recipes: off".
  Of the 19 perks, this affects only Miller (Supply: Flour Sack) and Tailor (the conveyor
  Fabric, Supply: Fabric, Supply: Clothes I/II). Tailor keeps the Weaving Loom Fabric, a separate
  craft with the same name. No perk loses all its recipes.

## Review when zombies, workers or conveyors are added

Not usable at the current point in the game. Revisit all of these before adding anything to do
with zombies, workers or conveyors:

- **Worker levels.** `WorkerPar` is the level of whoever does the craft, which can be a zombie or
  worker. It currently reads the character's level. A separate worker level per perk may be
  needed, or per craft depending on who does it. Update the footnote when this changes.
- **Supply and conveyor crafts** (`conveyor` flag, "Supply: …" names, conveyor stations): these
  are hidden from the Affects lists and, per the spec, from recipes by default. They'll need to be
  shown once conveyors are in use, and are probably worker-run, so they tie into the point above.
- **Conveyor-related perks and switches.** The data has `zombie_conveyor_transporter_ready` and
  `basement_blockage_conveyors_darkness_destroyed` (spec open question 2). Neither is used yet.

## Parked until the calculator is built (all settled)
- **Perk level range.** Settled 2026-11-06: no maximum, and a calculated amount never goes below
  0 (see [calculator_notes.md](calculator_notes.md), "Perk levels").
- The other parked display items (the 2px gap before the number arrows, two perks on one recipe,
  "Improve newspaper I/II") were dropped on 2026-11-06: no further work planned.
