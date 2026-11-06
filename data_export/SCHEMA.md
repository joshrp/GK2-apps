# gk2-data.json schema (0.1.0)

What each field means, how sure we are, and where the data is ambiguous. `gk2-data.d.ts` has the
exact types; this explains them. Numbers are from this drop (Steam build `25910882`) and will drift.

How sure we are, where it matters:
- **confirmed**: checked against the game data or game code
- **observed**: consistent across the data, but we haven't seen the game code that uses it
- **unknown**: open question; treat with care on a wiki page

## Contents

- [Conventions](#conventions)
- [Formulas](#formulas)
- [Quality variants](#quality-variants)
- [Recipe lines](#recipe-lines)
- [Unlocks](#unlocks)
- [Collections](#collections): [items](#items), [itemGroups](#itemgroups), [crafts](#crafts),
  [buildables](#buildables-and-build-actions), [zones](#zones), [techs](#techs), [names](#names)
- [Names and icons](#names-and-icons)
- [Test and dev content](#test-and-dev-content)
- [raw](#raw)
- [Known gaps](#known-gaps)

## Conventions

- **Ids** are the game's own string ids, unique within a collection. They're the stable key for
  pages. They can contain `:` (`cabbage:2`), and a few have typos the game relies on (tech
  `chooping`), so match them exactly.
- **The same id can exist in several collections** with different meanings. `nails_iron` is both an
  item and the craft that makes it. `incense_1` is both a buildable and the tech that unlocks it.
  Always pair an id with the collection it came from.
- **References are bare ids**, and the field says which collection they point into (e.g.
  `stations` → `buildables` or `names`). To display any id: find its record, else `names[id]`,
  else show the id.
- **`null` means "not set in the game data"**, never zero, except where a field says so
  (`techPoints`).
- **Order** of records is the game's own order. It isn't meaningful for display.
- **Enums** are given as names where we've decoded them (`mode`, `tab`, tech `type`) and as raw
  numbers where we haven't (item `type`).

## Formulas

Many quantities are a `Quantity`: either a number, or a formula the game evaluates at runtime.

```json
{ "formula": "12+4*WorkerPar(\"perk_blacksmith\")", "authored": "12+4*#perk_blacksmith" }
```

- `formula` is the expression the game runs. `authored` is what the designers typed, present only
  when it differs. It uses two shorthands: `$x` = `PPar("x")` and `#x` = `WorkerPar("x")`. **confirmed**
- In this drop, 280 of the 5,399 quantities on crafts and build actions are formulas (74 distinct).
  They only use two functions plus arithmetic:
  - `PPar("x")`: a player parameter, usually a perk level (`perk_fireman`). **observed**
  - `WorkerPar("x")`: the same for whoever does the work, e.g. a worker's perk. **observed**
- Durations and energy costs are always plain numbers in this drop.
- We don't evaluate formulas. A wiki can show the text, show a range ("12, +4 per Blacksmith
  level"), or evaluate at 0 for a base value. **unknown**: the exact value ranges of `PPar` and
  `WorkerPar` (levels 0..n?).
- Effect lists (`effectsOnEnd`, unlock `expression`) are scripts, not quantities: plain strings
  such as `AddInspiration("insp_iron_crafts", 1)`. Their full grammar isn't documented yet.

## Quality variants

Some items come in quality tiers, and **each tier is its own item**: `cabbage:1`, `cabbage:2` and
`cabbage:3`, with no plain `cabbage` item. **confirmed**

- `items[].quality` is the part after `:`. 179 items have one. Usually `"1"`, `"2"` or `"3"`, but a
  few suffixes are not tiers (`fertilizer:peat`, `…:start_bonus_1`, `…:add_cells_1`), so treat it
  as a string.
- Recipes may name the **bare id** (`story`) instead of a tier. `refKind` is then `"anyQuality"`:
  - as an **input**: any tier is accepted. **observed**
  - as an **output**: the tier is decided by the craft. These outputs always have `star: true`,
    and their crafts have bronze/silver/gold thresholds (`raw.bronzeLevel` / `silverLevel` /
    `goldLevel`). **observed**; how the tier is rolled is **unknown**.
- A wiki will probably want one page per family (`cabbage`) listing its tiers. Group items by
  the id before the `:`.

## Recipe lines

Crafts and build actions share two shapes.

`ItemStack` (inputs, build costs): `{ id, refKind, count }`.

`ItemOutput` (outputs, refunds):

| Field | Meaning |
|---|---|
| `id`, `refKind` | what's produced (see below) |
| `count` | fixed amount, or null when a range is used |
| `min`, `max` | random range when `count` is null (71 outputs). Inclusive bounds are **unknown** |
| `chance` | 0..1 probability the output happens at all; null = always. Often a formula (`0.5*WorkerPar("perk_mason")`) |
| `outputGroup` | outputs sharing a value form a "pick one" group. Used by one craft (`energy_potion_3`). The value (`"0.6*"`) is **unknown** |
| `star` | see [Quality variants](#quality-variants) |

So `stone_plate_1` outputs 4 stone plates, plus 1–2 more with a perk-scaled chance.

`refKind` says what the `id` points at, because the game data doesn't say:

| `refKind` | Count | Meaning |
|---|---|---|
| `item` | 1,704 | an id in `items` |
| `itemGroup` | 35 | an id in `itemGroups`: any member (`gr_cabbage` = any cabbage tier) |
| `anyQuality` | 49 | bare id of a quality family (see above) |
| `unresolved` | 0 | matches nothing; none in this drop, kept for future drops |

Items link back with `madeBy` / `usedIn`. Each link has a `via` saying how it matched (null =
named directly, otherwise the group or quality family).

## Unlocks

`unlock` on crafts and build actions:

```json
{ "required": true, "sources": [{ "via": "tech", "techId": "tech_iron_anvil" }] }
```

- `required` is the game's own `isNeedsUnlock` flag. **confirmed**
- `sources` are the unlocks we've found:
  - `{ via: "tech", techId }`: a tech lists it in its unlocks.
  - `{ via: "effect", collection, id, call, field, expression }`: a script somewhere calls
    `UnlockCraft` / `UnlockBuilding` on it. `collection` is the game list the caller is in
    (`questDefs`, `buildingDefs`, `craftDefs`, `perkDefs`), and `id` is the caller. **`call:
    "LockBuilding"` takes access away** (50 build actions), so don't present it as an unlock.
- **Gaps (unknown):** many things flagged `required` have no source in this export. They're
  unlocked somewhere we haven't extracted yet (quest scripts, dialogue, game code). That includes
  core stations like `iron_anvil_p` and `furnace_1_p`. Show "unlock: unknown", not "no unlock needed".

  | | `required` | with a source | no source found |
  |---|---|---|---|
  | crafts | 471 | 366 | 105 |
  | build actions | 290 | 217 | 73 |

- 11 crafts have tech sources but `required: false`. **unknown** whether the tech matters for them.
- One effect names a craft that doesn't exist (`UnlockCraft("ingot_iron_scrap")`).

## Collections

Every record in `items`, `crafts`, `buildables`, `zones` and `techs` has the
[`RecordBase`](gk2-data.d.ts) fields: `id`, `name`, `nameSource`, `icon`, `likelyDev`, `raw`.
See [Names and icons](#names-and-icons), [Test and dev content](#test-and-dev-content) and [raw](#raw).

### items

| Field | Meaning |
|---|---|
| `description` | English description. Only 171 items have one |
| `iconId` | icon the game asked for, even if missing from `icons/` |
| `quality` | see [Quality variants](#quality-variants) |
| `groups` | item groups (tags) it belongs to |
| `stackCount` | max stack size |
| `basePrice` | base trade value. 0 for 437 items; **unknown** whether that means "can't be sold" |
| `type` | raw enum number; names not decoded. 601 items are `0` |
| `flags` | `tool`, `weapon`, `seed`, `fuel`, `bag`, `questItem`, `product`, `techPoint`, `fertilizer` (from the game's `is*` flags) |
| `madeBy`, `usedIn` | recipes that make or consume it, see [Recipe lines](#recipe-lines) |

Items `game_res_tech_red` / `_green` / `_blue` represent tech points. They have no name in the
game text. Some items share an id with a world object (an item that can also be placed).

### itemGroups

`{ id, members, usedInRecipes }`. Groups have no name or icon in the game. Most are tags used by
game rules (e.g. `u_bag`: what fits in a bag, with 586 members). The 22 with
`usedInRecipes: true` are "any of" recipe ingredients, e.g. `gr_cabbage`. One quirk:
`mushroom_red` lists `u_bag` twice in the game data; members are de-duplicated here.

### crafts

A craft is any timed action with inputs and/or outputs, not only "making" things. 361 crafts have
no outputs (destroying, harvesting, scripted actions), and 130 have no station.

| Field | Meaning |
|---|---|
| `description` | very few crafts have one (30) |
| `icon`, `iconSource`, `iconId` | most crafts have no icon of their own, so `icon` falls back to the first output's (`iconSource: "output <id>"`) |
| `stations` | world objects it runs at. 75 of the 177 distinct stations are `buildables`; the rest (NPCs, resource nodes, …) are in `names` or unnamed |
| `inputs`, `outputs` | see [Recipe lines](#recipe-lines) |
| `duration` | time per craft. **unknown**: unit (game minutes?) |
| `energyPerTick` | energy cost; tick length is **unknown** |
| `techPoints` | tech points earned per craft, `{red, green, blue}`. null = 0 |
| `perks` | perks that affect this craft. Ids, names in `names` |
| `flags` | `auto` (runs without the player), `hidden`, `oneTime`, `fuel`, `autopsy`, `conveyor`. Exact meanings **observed** from names |
| `effectsOnEnd` | scripts run when it finishes |
| `unlock` | see [Unlocks](#unlocks) |

`raw.talentLock` is set on almost every craft (values 1–10+), and its meaning is **unknown**.

### buildables and build actions

**A buildable is a placeable object. Its build actions are what you can do with it.** In the
game, "buildings" are actions (place, remove, …) that point at an object, so `incense_1_p` places
`incense_1` and `incense_1_r` removes it. **confirmed** This export groups them: 373 buildables
holding 615 actions.

Buildable:

| Field | Meaning |
|---|---|
| `id` | the world object id. Also what craft `stations` refer to |
| `icon`, `iconSource` | from a build action (`own`), else an item with the same id (`item`). 78 have none |
| `actions` | its build actions, Place first |
| `zones` | zones whose build menu offers it |
| `craftsHere` | crafts that run at it, when it's a station |
| `raw` | the world object definition. null for 32 script-only ids such as `remove` and `upgrade_church_1` |

Build action:

| Field | Meaning |
|---|---|
| `id` | the building def id. Tech unlocks and unlock sources refer to this |
| `mode` | `Place` 209, `Remove` 310, `Script` 55, `ConveyorPlace` 16, `FightingPlace` 12, `FightBuilding` 12, `Upgrade` 1. The id suffix matches (`_p`, `_r`, `_s`, `_cp`, `_fp`, `_fb`, `_u`) |
| `cost` | build cost (Place). Empty for Remove |
| `outputs` | for Remove: the refund. **observed**: usually equals the Place cost |
| `builders` | builder ids offering this action. A builder is a zone's build menu (see `zones[].builder`) |
| `startCraft` | a craft run on completion, often the generic `destroy_basic` |
| `limit` | max number allowed, null = no limit (set on 11) |
| `unlock` | see [Unlocks](#unlocks) |

Ambiguities:
- Many stations exist twice, as `X` and `X_place` (`iron_anvil` / `iron_anvil_place`), each with
  its own actions. **unknown**: what `_place` means (preview object? upgrade path?). Expect
  near-duplicate buildables.
- Remove actions often have no name of their own; the name falls back to the object's
  (`nameSource: "wgo …"`).

### zones

| Field | Meaning |
|---|---|
| `builder` | the builder id whose build menu belongs to this zone. 43 zones have none |
| `buildables` | buildables its builder offers |
| `icon`, `iconId` | the zone's build-desk icon |

Zones have no text of their own. Their names come from their builder (`builder_church` → "Church",
`nameSource: "builder …"`), so zones without a builder are mostly unnamed. Real zones share
builders with their dev copies (`alchemy_lab` and `alchemy_lab_dev` both use `builder_alchemy_lab`),
so the same buildables appear in both.

### techs

The tech tree, laid out as the game draws it.

| Field | Meaning |
|---|---|
| `tab` | which tree: `Building`, `Metallurgy`, `Farming`, `Theology`, `Anatomy`, `Cooking`. Display names in `techTabs` (one contains `\n`) |
| `x`, `y` | grid cell in the tab (x 0–17, y 0–4; some halves like 0.5). No two techs share a cell |
| `parents` | prerequisites. Always in the same tab and further left, so the tree reads left to right. The Cooking tab has no links |
| `cost` | price in red / green / blue tech points |
| `type` | `Common`, or `CharRep` for reputation gates |
| `hiddenAtStart` | hidden until something reveals it (39 techs) |
| `reputationLock` | for gates: `[{ npc, npcName, value }]`, e.g. Jack ≥ 40 |
| `unlocks` | `crafts` → crafts; `buildActions` → build action ids; `perks` → `names`; `alchemyFormulas` and `townBuildings` → not exported yet |
| `icon`, `iconSource` | **Techs have no icon in the game data.** We borrow the icon of the first thing it unlocks (`iconSource: "building …"`, `"craft …"`, `"town …"`). 18 have none. The real in-game icon is **unknown** |

Reputation gates (`lock_npc_*`, 10 techs) unlock nothing themselves; they sit as parents of real
techs. The game has no text for them, so their `name` is generated, e.g. "Jack rep 40"
(`nameSource: "reputation lock"`). The number in the id isn't always the requirement: use
`reputationLock.value`.

### names

`Record<id, name>` for 705 ids that are referenced here but have no record of their own: stations
and other world objects, builders, perks, quests. It's a display aid only, since ids from
different game lists share this one map.

## Names and icons

- **`name`** is the game's English text, or null when there is none. Unnamed records are mostly
  dev/test content, Remove actions and harvesting crafts.
- **`nameSource`** says how we found the name. Text lookup is by id, so many records borrow a name
  from a related id: `alias x` (the game's own alias table), `base …` (a quality item using the
  family's text), `output x` (a craft named after what it makes), `wgo x` (a build action named
  after its object), `builder x` (a zone named after its build menu), `action x`, `reputation lock`.
  It's for spotting bad names. Don't parse it; the format may change.
- Names can be wrong in the game itself (craft `trinkets_bronze` is "Copper Trinkets"). We don't
  correct them.
- **`icon`** is a file stem in `icons/`, only set when the PNG exists. **`iconId`** (where present)
  is what the game asked for, so `iconId` set and `icon` null means the art is missing from the
  game build (74 ids, mostly unfinished content).
- Icons are small pixel art (about 32×32) with a **1px blue outline baked in**, probably recoloured
  by the game for hover/selection. Scale with nearest-neighbour (`image-rendering: pixelated`). If
  the outline looks wrong on your page, tell us and we can strip or recolour it on export.

## Test and dev content

The game ships test and developer content mixed in with real content, with nothing marking it.
`likelyDev` is our heuristic, nothing has been removed, and **it will have mistakes both ways**:

- true when the id contains `test`, `dev`, `playground` or `GK1927` as a word
- for build actions: also true when every builder offering it is a dev builder
- for buildables: true when all its actions are `likelyDev`, or its id matches

In this drop: items 20, crafts 21, buildables 9, build actions 18, zones 12, techs 0.

Also suspect, but not flagged: `cook_*` items with no icon and mostly no recipes, and unnamed
records generally.

## raw

Every record carries `raw`: the game's own definition with default-valued fields removed, using
the game's field names. In `raw`, formulas look like `{ "$expr": "...", "$src": "..." }`, plain
constants are inlined, and booleans are `0`/`1`.

**`raw` is outside the schema contract.** It's there so you can see what else exists (perk links,
quality thresholds, `talentLock`, …) and ask for it. Its fields can appear, disappear or change
shape between drops without a schema version bump.

## Known gaps

Things we know are missing or unclear, roughly in the order we expect to tackle them:

- Unlock sources for 105 crafts and 73 build actions (see [Unlocks](#unlocks))
- Enum names: item `type`, and others inside `raw`
- Collections not exported yet: quests, perks, alchemy, vendors, town buildings, inspirations,
  talents (their ids appear in references, with names in `names` where known)
- Units for `duration` / `energyPerTick`, and ranges for `PPar` / `WorkerPar`
- Real tech icons
- What `_place` objects, `talentLock` and `outputGroup` values mean
- Other languages (the game has 11; this drop is English only)
