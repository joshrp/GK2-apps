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
- **Later:** "Load newer data file" and the `schemaVersion` warning; the spec's nice-to-haves
  (craft order by station, unlock requirements).

## Perk levels (parked item, settled)

- No maximum level. A calculated amount never goes below 0. In this data only Heat Saver's fuel
  formulas (`10-5L`, `20-10L`, `15-10L`, `25-15L`) reach 0 or below, from level 2; fuel then
  stops at 0. Yield formulas only grow. Chance formulas are ignored, as before.

## Layout

- Three tabs shown side by side in the header, left to right: **Calculator**, **Stations**,
  **Perks**. They replace the left panel.
- **Perks** holds the existing perk panel, including its own footnote.
- **Calculator** holds the targets, the output and its options (Show hidden, Remember my
  inventory).
- **Stations** is described below.
- The footer note "Conveyors and Zombies are not included at this time" is on every tab.

## Icons

- Shown in the first build. `data_export/icons/` (854 PNGs, 3.4 MB) is committed when the
  Stations tab first shows them, and `.gitignore` is updated then. Pixelated scaling, text
  placeholder when there's no icon (spec).

## Stations

A station is where a craft is done: an id in the craft's `stations` list. 47 stations are used by
recipes the calculator could follow; without the 7 zombie ones that's 40, plus Laboratory I
through the fixes below. `X` and `X_place` are one station (e.g. `wooden_anvil` has its Place cost
on `wooden_anvil_place`).

### Stations tab
- One row per station: icon, name, an "I have this" checkbox, and its build cost (the Place cost).
- Saved in browser storage.
- Starting stations are ticked by default, but not locked: they can be unticked like any other.
  - Sawhorse, Woodworking Workbench I, Wooden Anvil, Kitchen Oven, Kitchen Table, Compost Pile,
    and both Firewood sheds (`firewood_shed_1` outside, `firewood_shed_kitchen_1` in the kitchen).
- The Firewood sheds aren't stations: they only store firewood, and no recipe runs there. They
  are listed for completeness only and never affect a plan.
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

### How stations feed the calculator
1. Where an item has several recipes, the default is one at a station you own.
2. A step at a station you don't own is flagged "Not built: <station>".
3. A "Stations to build" section lists missing stations. A station's build cost is added to the
   plan (once, expanded like any other target) only when you choose "Build this" for it.

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
| Laboratory I (`alchemy_mix`) | `heal_potion`, `heal_potion_2`, `energy_potion`, `energy_potion_2`, `energy_potion_3`, `exp_red_potion_2`, `exp_green_potion_2`, `exp_blue_potion_2`, `exp_orange_potion_2`, `exp_yellow_potion_2` |
| Station unknown | `sinful_idol`, `scary_idol`, `liquid_harden`, `alkali`, `lacquer`, `quest_paint`, `organ_improver_red`, `organ_improver_white`, `quality_items_gold`, `resurrection_liquid`, `quality_food_gold`, `miracle_growing_elixir` |

The gap should also be reported for the data export.

## Ingredients and quality

- **Random tiers (★ crafts, 29).** An input of any tier (`anyQuality`, or a group of one quality
  family such as `gr_stories`, `gr_newspapers`, `gr_wine`) is expanded through the ★ craft. An
  input of one specific tier (`story:1`, `newspaper:1`, `cook_cabbage_bowl:1`,
  `cook_vegetable_salad:1`) is expanded too, but the step is marked "tier not guaranteed".
- **"Any of" groups that aren't quality tiers** (skin, skulls, bones, heart, brain, guts) are one
  gather line, e.g. "Skin (any) × N", with one inventory count.

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
8. Output: tree and flat list side by side, stacked station column, "Not built" flag, "Build
   this" choice.
9. Recipe dropdowns, choice remembered per item.
10. Inventory: one count per item, blank / short / covered states, Remember my inventory.
11. Later: newer data file and schema warning, craft order by station, unlock requirements.
