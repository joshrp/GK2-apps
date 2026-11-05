# Perk settings — decisions and deferred items

Decisions for the Settings panel "perk levels" slice, agreed 2026-11-05. Read alongside
[calculator_spec.md](calculator_spec.md); where they differ, this file wins.

## Decisions

### Scope and data
- Local use only for now. CI/GitHub Pages is ignored, and the data is imported from `data_export/`
  (gitignored), not committed.
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
- The panel sits on the left, with targets and output to its right.
- One row per perk, three columns:
  1. perk name
  2. level: a number input starting at 0, whole numbers, min 0, no max, native up/down arrows
     with a 2px gap before them
  3. Affects: the recipes the perk changes. Names are de-duplicated (quality tiers share a name,
     e.g. Cabbage soup). Lists longer than three show the first three and a "+N more" button
     (agreed 2026-11-05, replacing "full list on hover"). The button opens a small popover under
     the row, headed "<Perk> affects N recipes", with every name in two columns. It closes with
     its × button, Esc, a click elsewhere, or the "+N more" button again. Lists of three or fewer
     are shown in full with no button.
- Non-zero perks get no visual cue. There is a Reset button that sets all perks to 0.
- Footnote under the rows: "Only your character's perk levels are used. Update the app when
  zombie or worker levels need to be included."
- Levels are saved in browser storage. A brief flash of zeros on load is accepted.

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

## Parked until the calculator is built
- **Perk level range.** The data has none. Some formulas break at higher levels: Heat Saver gives
  negative fuel above level 1, and chance formulas exceed 1. Decide on clamping or limits then.
- **The 2px gap** between the number and the arrows. Chrome may not honour it, so review it in
  the built app.
- **Two perks on one recipe** (Bread etc.): refine the display if it's confusing.
- **"Improve newspaper I/II"** are listed under Paper maker (their guaranteed output uses the
  perk). Not yet seen in the game, so it's unknown whether they're craftable items or upgrades.
  Printing Press and Newspaper are confirmed craftable.
