# Crafting calculator — decisions

Decisions for the calculator, agreed 2026-11-06. Read alongside
[calculator_spec.md](calculator_spec.md) and [perk_settings_notes.md](perk_settings_notes.md).
Where they differ, this file wins.

## Scope

- **Conveyors and zombies are left out.** Conveyor crafts are never offered, so there's no "Use
  conveyor recipes" setting. Crafts at zombie stations are excluded too: stone, marble, wood +
  stick, iron ore + coal, clay and sand then show as Required items. A footer on every tab says
  "Conveyors and Zombies are not included at this time". Review
  [perk_settings_notes.md](perk_settings_notes.md) "Review when zombies, workers or conveyors are
  added" before changing this.
- **Zombie and conveyor buildings** are hidden in the target picker (shown with Show hidden):
  ids starting `conveyor_` or containing `zombie`, and buildings unlocked by a tech with "Zombie"
  in its name (e.g. Lumberjack stand, from Zombie Lumberjack).
- **No game-state switches.** None of `church_better`, `zombie_conveyor_transporter_ready` or
  `basement_blockage_*` appears in an amount the calculator reads (only in a church upgrade action
  and in blockage crafts with no outputs). Spec open question 2 is closed.
- **In the first build:** Show hidden, Remember my inventory, and the remembered recipe choice per
  item.
- **Targets are saved** in browser storage and stay until you remove them (agreed 2026-11-06).
  Show hidden is saved too, and so are "Build this" choices (until undone with "Don't build").
- **Later:** unlock requirements (the spec's nice-to-have (d)).
- **Dropped (2026-11-06):** the "Load newer data file" button, and with it the `schemaVersion`
  warning (the built-in data is the only data); the craft-order list grouped by station (spec
  nice-to-have (c)). A newer export is taken in by replacing `data_export/` and running the tests.

## Perk levels (parked item, settled)

- No maximum level. A calculated amount never goes below 0. In this data only Heat Saver's fuel
  formulas (`10-5L`, `20-10L`, `15-10L`, `25-15L`) reach 0 or below, from level 2; fuel then
  stops at 0. Yield formulas only grow. Chance formulas are ignored, as before.

## Layout

- Four tabs shown side by side in the header, left to right: **Calculator**, **Days**,
  **Stations**, **Perks**. They replace the left panel. The header is sticky: it stays at the
  top on scroll. (Days added 2026-11-07.)
- **Perks** holds the existing perk panel (450px wide), including its own footnote.
- **Calculator**, top to bottom, separated by full-width 2px white lines:
  1. **Targets**: heading with the options (Show hidden, Remember my inventory), the search
     picker and the target list.
  2. **Steps**: the plan tree, full width (scrolls sideways if the window is narrow).
  3. **Totals** (max 560px wide, no box): Required items (with furnace fuel), Required buildings /
     tools, Stations to build.
- **Days** and **Stations** are described below.
- The footer note "Conveyors and Zombies are not included at this time" is on every tab.
- The app always opens on the Calculator tab; the chosen tab isn't remembered.

## Icons

- `data_export/icons/` (854 PNGs, 3.4 MB) is committed. `src/lib/data/icons.ts` imports them
  with `?no-inline`, so the build ships each as its own file instead of inlining them into the
  script. Pixelated scaling; a "?" box when there's no icon.

## Calculator

### Targets
- Search any part of a name (any case); names starting with the query first; up to 20 matches,
  with icons and "Building", "Added" and "Hidden" tags. Arrow keys + Enter or click to add; Esc
  clears. A target is never added twice. Quantity: whole number of 1 or more, else a red border
  and "Enter a whole number, 1 or more."
- Targets are saved until removed with ×.
- **New targets go at the top** (agreed 2026-11-07), so the newest target gets first call on
  inventory and spare until moved. Adding one that's already there doesn't move it.
- **Order (agreed 2026-11-07).** ↑/↓ buttons on each target move it one place (disabled at the
  ends); the order is saved. Targets get inventory and spare in this order, top first, so moving
  one up gives it first call on what you have (e.g. Chest before Wooden Kit I for Oiled Plank).
  Stations chosen with "Build this" always come after the targets. Reordering only works between
  targets: inside one target, steps still take stock in recipe order. Rows opened or closed by
  hand stay with their target when it moves. (Drag and drop was considered and left for later.)

### Steps tree
- Columns: Item | Need | Have | Blocked | Crafts | Spare | Station.
- Under the item name: "Gather / buy" on Required items, "N from spare", "Tier not guaranteed"
  (amber), and a recipe dropdown when there are several recipes.
- Recipe dropdown options read "inputs → amount made · station", e.g.
  `1 Fat, 2 Clay Plate, 20 fuel → 4 · Distillation Cube` (many alternatives share a name). The
  choice is saved per item and applies everywhere that item appears.
- Default recipe: the chosen one if it makes the item, else the first at a station you have or
  are building, else the first.
- Station column: alternatives stacked, "To build" tag, amber "Not built" flag when none is owned
  or being built, "Station unknown" when the data has none.
- Fuel rows ("Fuel N units"); building targets and stations being built are their own rows.

### Inventory (Have column)
- One count per item key, shared by every row of that item and used up once across the plan.
- Blank = not checked yet: the row stays collapsed and shows its need. A count below the need
  shows "Short N" and opens the row for the shortfall only. Enough shows a green "Covered".
  0 is not blank (checked, have none). Invalid text gets a red border and isn't used.
- The Have field always shows the full count entered. When earlier steps in the plan have
  already used some of it, the step says "N used above" (agreed 2026-11-07), so "Have 6 · 5 used
  above · Short 3" explains itself.
- ▸/▾, "Expand all" and "Collapse all" override the automatic open/closed state; entering a new
  count on a row puts it back to the automatic rule.
- Text stays white on covered rows (no dimming). The Have field is only on tree rows, not in the
  Required items list.
- Remember my inventory: off by default (inventory starts empty each visit). On saves the counts
  on every change; turning it off deletes the saved counts.

### Blocked column
Agreed 2026-11-12.
- A free-text note per item, for what's holding a step up. Multi-line: line breaks are kept,
  and the box grows with its text (Chrome, Edge; elsewhere it can be resized by hand), about
  180px wide.
- One note per item key, like Have: it shows on every row of that item, and stays with the item
  when targets are reordered or recipes change.
- Item rows only: building/target rows and Fuel rows have no box.
- Saved in browser storage on every change, until cleared. Clearing the box (or leaving only
  spaces) deletes the note. Notes for items no longer in the plan are kept and come back with
  the item. No Remember option, no "clear all", no length limit.
- Display only: the planner doesn't read it.

### Saved in browser storage
| Key | What |
|---|---|
| `gk2calc.perkLevels` | perk levels |
| `gk2calc.ownedStations` | "I have this" stations |
| `gk2calc.targets` | targets and quantities |
| `gk2calc.showHidden` | Show hidden option |
| `gk2calc.buildChoices` | stations chosen with "Build this" |
| `gk2calc.recipeChoices` | recipe chosen per item |
| `gk2calc.rememberInventory`, `gk2calc.inventory` | Remember option and the counts |
| `gk2calc.blocked` | Blocked note per item |

Each store drops unusable saved data, says so in a dismissible warning, and warns when the
browser blocks storage.

## Days

Agreed 2026-11-07.

- Standalone: it doesn't read from or feed into the calculator, and nothing is saved in browser
  storage.
- One full-width table (`src/lib/days/DaysPanel.svelte`), styled like the Stations table: a
  header row and 6 rows, with columns **Colour**, **Icon**, **Location**, **Notes**, **Day**.
- Cells are display only and hold fixed text, kept in the `rows` list in the component. Colour
  and Icon are plain words (no swatches or pictures). Line breaks in a cell show as typed. Rows
  are at least 40px high. Filled in 2026-11-07, top to bottom: Wrath, Gluttony, Sloth, Lust,
  Envy, Pride.
- No heading above the table (Stations has one; can be added if wanted).

## Stations

A station is where a craft is done: an id in the craft's `stations` list. 47 stations are used by
recipes the calculator could follow; without the 7 zombie ones that's 40, plus Laboratory I
through the fixes below. `X` and `X_place` are one station (e.g. `wooden_anvil` has its Place cost
on `wooden_anvil_place`).

### Stations tab
- One row per station: icon, name, location, an "I have this" checkbox, and its build cost (the
  Place cost), one cost item per line.
- Saved in browser storage.
- Starting stations are ticked by default, but not locked: they can be unticked like any other.
  - Sawhorse, Woodworking Workbench I, Wooden Anvil, Kitchen Oven, Kitchen Table, Compost Pile,
    and both Firewood sheds (`firewood_shed_1` outside, `firewood_shed_kitchen_1` in the kitchen).
- The Firewood sheds aren't stations: they only store firewood, and no recipe runs there. They
  are listed for completeness only, with the note "Stores firewood only; not used by any recipe.",
  and never affect a plan.
- Reset button: unticks every station, starting ones included ("Reset can still clear them").
- Tiers are separate stations that can be owned side by side: owning Woodworking Workbench II
  says nothing about I, and the other way round.
- Kitchen Table, Kitchen Oven and Compost Pile come with the game, so they need no build cost.
- Locked door (used by one recipe; not met in the game yet) has no build cost: normal checkbox,
  "Build cost unknown", and it can't be chosen with "Build this".
- **Build costs** come from the Place action. Where `X` and `X_place` differ (9 stations), the
  `X_place` cost is used: it's the one techs unlock, and the game confirms it (Furnace II = 12
  Brick, Printing Press = 3 Oiled Beam).
- **Known costs from the game** for stations the export has no Place cost for (kept in
  `src/lib/calc/stationFixes.ts`, used instead of the export):

  | Station | Cost |
  |---|---|
  | Kitchen Table II | 4 Iron Detail, 8 Wooden Plank, 2 Wooden beam |
  | Kitchen Oven II | 16 Piece of stone, 4 Polished Stone, 4 Iron Detail |
  | Compost Pile II | 12 Short Log, 8 Bronze Nails, 2 Bronze Detail |
  | Crematorium I | 6 Brick, 6 Bronze Detail |
  | Crematorium II | 12 Brick, 8 Advanced Detail |
  | Millstone (home) | 2 Board, 2 Piece of stone (matches its Script action in the export) |

- **Millstone.** The home Millstone (`millstone`, its own tech) is where Flour, Seed oil and
  Minced Meat are made, and stays visible. "Kitchen: Millstone" (`conveyor_kitchen_millstone`,
  2 Polished Stone + 4 Stick + 2 Iron Detail) is the conveyor one and is hidden.

### Location column
- Where a station is built: the names of the build menus (zones) that offer it, dev copies
  left out. Several are listed A–Z, one per line (Formulation Bench: Alchemy Lab, Writing Room;
  the kitchen Firewood shed: Alchemy Lab, Home, Vineyard Basement).
- Stations no build menu offers use known locations (agreed 2026-11-06): Kitchen Table, Kitchen
  Table II, Kitchen Oven, Kitchen Oven II = Home; Compost Pile, Compost Pile II = Garden.
- Locked door: "Unknown".

### How stations feed the calculator
1. Where an item has several recipes, the default is one at a station you own (or are building).
2. A step where you have none of its stations is flagged "Not built".
3. A "Stations to build" section lists missing stations. A station's build cost is added to the
   plan (once, expanded like any other target) only when you choose "Build this" for it; "Don't
   build" undoes it. Stations without a known cost show "Comes with the game" or "Build cost
   unknown" instead of the button. Ticking a station on the Stations tab stops it being built.
4. "Required buildings / tools" lists each station group the plan uses ("Iron Anvil or Steel
   Anvil" is one line), marked Have, To build or Not built.

### Display
- Where a recipe can be done at two or more stations (128 recipes), the stations are stacked in
  one column on that step.

### Station fixes (missing in the export)
38 crafts have an empty `stations` list. The app keeps a small list of fixes, used until an
updated export supplies the stations. Anything not fixed shows **"Station unknown"**.

| Station | Crafts |
|---|---|
| Writing Desk (`writing_desk_1`) | all 11 prayers: `prayer_protection`, `prayer_imagination`, `prayer_insanity`, `prayer_prosperity`, `prayer_purity`, `prayer_consumption`, `prayer_demand`, `prayer_speed`, `prayer_obedience`, `prayer_repentance`, `prayer_music` |
| Printing Press (`newspaper_press`) | `book`, `book_hard`, `newspaper` |
| Potter's Wheel (`potter_wheel_1`) | `ceramic_fired_1`, `ceramic_fired_2` |
| Laboratory I (`alchemy_mix`) | `heal_potion`, `heal_potion_2`, `energy_potion`, `energy_potion_2`, `energy_potion_3`, `exp_red_potion_2`, `exp_green_potion_2`, `exp_blue_potion_2`, `exp_orange_potion_2`, `exp_yellow_potion_2`, `quest_paint` (Paint, added 2026-11-14) |
| Station unknown | `sinful_idol`, `scary_idol`, `liquid_harden`, `alkali`, `lacquer`, `organ_improver_red`, `organ_improver_white`, `quality_items_gold`, `resurrection_liquid`, `quality_food_gold`, `miracle_growing_elixir` |

The gap should also be reported for the data export.

### Recipe fixes (wrong in the export)
Ingredients from the game, kept in `KNOWN_RECIPE_INPUTS` in `src/lib/calc/stationFixes.ts` and
used instead of the export's (outputs unchanged):

| Craft | Export | Game |
|---|---|---|
| Paint (`quest_paint`, agreed 2026-11-14) | 1 Melted Fat + 1 Dye | 2 Water → 1 Paint, at Laboratory I |

## Ingredients and quality

- **Random tiers (★ crafts, 29).** An input of any tier (`anyQuality`, or a group of one quality
  family such as `gr_stories`, `gr_newspapers`, `gr_wine`) is expanded through the ★ craft. An
  input of one specific tier (`story:1`, `newspaper:1`, `cook_cabbage_bowl:1`,
  `cook_vegetable_salad:1`) is expanded too, but the step is marked "tier not guaranteed".
- **"Any of" groups that aren't quality tiers** (skin, skulls, bones, heart, brain, guts) are one
  gather line, e.g. "Skin (any) × N", with one inventory count.

## Status (2026-11-14)

Steps 1–10 below are built (82b4adc, f889711, 28caa0a, 27fe81f, plus these notes). The
`calculator` branch was pushed and merged into `main` (fast-forward) on 2026-11-07 and again on
2026-11-12; everything under "Added since" is in `main` except where marked otherwise. GitHub
Pages isn't enabled yet, so the deploy job doesn't publish anything.

### Added since (2026-11-07)
- Target order (d1645e7): ↑/↓ buttons, saved order, focus kept at the ends; steps say "N used
  above" when earlier steps already used some of the count. See Targets and Inventory above.
- New targets go at the top of the list (9cfe9d4).
- Days tab after Calculator (835f772), with its six rows of fixed text (fc4aa34): display only
  (see Days above).

### Added since (2026-11-12)
- Blocked column in Steps (f8b59a2): a saved free-text note per item (see Blocked column above).
  Merged into `main` and pushed 2026-11-12.

### Added since (2026-11-14)
- Paint fixed to 2 Water → 1 Paint at Laboratory I, with a new list of recipe fixes for
  ingredients the export gets wrong (see Recipe fixes above). Committed on `calculator`; not yet
  pushed or merged into `main`.

### Not built yet (from the spec)
- **Unlock requirements** (nice-to-have (d)): "needs tech: …", or "unlock: unknown" where the
  data has no source.
- **Left out on purpose:** "Use conveyor recipes" and anything zombie or worker related (see
  Scope).
- **Dropped:** "Load newer data file" with the `schemaVersion` warning, and the craft-order list
  by station (see Scope).

### Still open
- Data export gaps to report: the 38 crafts with no station (fixed in the app for 27), the 6
  station costs and the 6 station locations supplied by hand, and Paint's wrong ingredients
  (`src/lib/calc/stationFixes.ts`).
- Layout is desktop only; styling to be revisited after use.
- Searching "Chest" lists two buildings both named "Chest". Not looked into yet: check whether
  they're different buildings or a duplicate the `X`/`X_place` merge missed.

## Build plan

Each step ends with tests, all three checks passing, and a stop to check in.

1. Branch `calculator` and these notes.
2. Three tabs: Calculator, Stations, Perks. Move the perk panel into Perks; footer note. No new
   logic.
3. Formula evaluator: numbers, `+ - * /`, brackets, `PPar`/`WorkerPar` reading the perk levels;
   never below 0. Every formula in the data is run through it in a test.
4. Recipe and station model: producers and yield per item (excluding dev, conveyor, zombie and
   Remove crafts), `X`/`X_place` merge, display names, hidden rules, the station fixes, the
   station list with build costs.
5. Stations tab: saved "I have this" list, starting stations ticked, Reset, build costs. Icons
   committed and first shown here.
6. Planner core: targets, perk levels, recipe choices, owned stations, stations chosen to build
   and inventory in; step tree, spare pool, Required items (with "any of" lines), fuel units,
   "Not built" flags and chosen build costs out. Prefers recipes at owned stations; cycle guard.
   The spec's 4 Reinforced Beam check is a test.
7. Target picker: search, quantities, remove, Show hidden.
8. Output: tree and flat list (first side by side; later moved below the tree), stacked station
   column, "Not built" flag, "Build this" choice.
9. Recipe dropdowns, choice remembered per item.
10. Inventory: one count per item, blank / short / covered states, Remember my inventory.
11. Later: unlock requirements. (Newer data file, schema warning and craft order by station were
    dropped.)
