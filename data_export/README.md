# Graveyard Keeper 2 data export

Game data pulled straight from the Graveyard Keeper 2 game files, for building a wiki: items,
recipes, buildings, zones and the tech tree, with English names and icons.

**This is an early, evolving export.** It reflects what we've decoded so far, and its shape will
change based on what you need and what else we find in the data. Pin to a `schemaVersion`, read the
changelog when you take a new drop, and tell us what's missing or confusing.

## What's here

| File | What |
|---|---|
| `gk2-data.json` | All the data, one JSON file (~4 MB) |
| `gk2-data.d.ts` | TypeScript types for the JSON, with a short comment on every field |
| `SCHEMA.md` | What every field means, where the data is ambiguous, and what we don't know yet |
| `icons/*.png` | 854 icons, referenced by `icon` fields as `icons/<icon>.png` |

Contents of this drop:

| Collection | Records | Named | With icon | Notes |
|---|---|---|---|---|
| `items` | 814 | 737 | 741 | includes quality variants (`cabbage:1..3`) as separate items |
| `crafts` | 829 | 643 | 652 | recipes, including harvest/destroy/scripted actions |
| `buildables` | 373 | 328 | 295 | placeable objects, with 615 build actions (place, remove, ...) |
| `zones` | 105 | 57 | 54 | build zones, including dev/test ones |
| `techs` | 236 | 236 | 218 | the tech tree, with grid positions for drawing it |
| `itemGroups` | 57 | — | — | tags and "any of" recipe groups |
| `names` | 705 | | | names for referenced ids without a record (stations, perks, quests) |

## Quick start

```ts
import type { Gk2Data } from "./gk2-data.d.ts";
import raw from "./gk2-data.json" with { type: "json" };
const data = raw as Gk2Data;

const items = new Map(data.items.map(i => [i.id, i]));
const buildables = new Map(data.buildables.map(b => [b.id, b]));
// A reference resolves to a record in the collection its field points at, else `names`, else the id.
const itemName = (id: string) => items.get(id)?.name ?? data.names[id] ?? id;
const stationName = (id: string) => buildables.get(id)?.name ?? data.names[id] ?? id;

const nails = data.crafts.find(c => c.id === "nails_iron")!;
// nails.name        "Iron Nails"
// nails.stations    ["iron_anvil", "steel_anvil"]        -> stationName: "Iron Anvil", ...
// nails.inputs      [{ id: "ingot_iron", refKind: "item", count: 1 }]
// nails.outputs[0]  { id: "nails_iron", count: { formula: '12+4*WorkerPar("perk_blacksmith")', ... } }
// nails.unlock      { required: true, sources: [{ via: "tech", techId: "tech_iron_anvil" }] }
```

Three things to know before building pages:

1. **Quantities can be formulas.** Many counts, durations and chances depend on perks or worker
   skills, and come through as `{ formula: "..." }` rather than a number. Show the text, or a base
   value if you want to evaluate the simple ones yourself. See SCHEMA.md "Formulas".
2. **Not everything is real content.** The game ships test and dev content mixed in with the real
   thing and doesn't mark it. `likelyDev` is our best guess; nothing has been removed.
3. **A recipe line isn't always one item.** It can name an item group ("any cabbage") or a
   quality family ("any `story:1..3`"); `refKind` says which. And some unlockable things have no
   known unlock source yet. SCHEMA.md covers both.

## Where it comes from

Extracted from the installed game (Steam app 4358690, build `25910882`, Unity `6000.3.9f1`). The
build is recorded in `source` in the JSON, so you can tell which patch a drop reflects. Names are
the game's own English text. Nothing is hand-edited: odd names, typos in ids and missing text are
the game's.

The data and icons are the game developers' content. Use them as you would any fan-wiki material.

## Stability

- `schemaVersion` follows semver. **While it's 0.x, any minor bump (0.1 → 0.2) can rename, reshape
  or remove fields.** Patch bumps (0.1.0 → 0.1.1) only add fields or fix values.
- Ids come from the game and survive our schema changes. Game patches can still add, remove or
  rename them, so build pages keyed on id, and expect a few to come and go with each game update.
- Counts, names and coverage numbers will change from drop to drop as we decode more.
- `raw` on each record is the game's own definition, passed through for fields we haven't modelled
  yet. It is **not** covered by the schema version and may change shape at any time. If you need
  something from `raw`, ask and we'll promote it to a proper field.

## Asking for changes

Tell us what pages you're building and what's missing or awkward. Useful things to send:
- a field you want that's only in `raw` (or not there at all)
- a name, link or count that looks wrong (include the id)
- a shape that's awkward to consume

Things we expect to add, in no particular order: names for item types and other enums, more
collections (quests, perks, alchemy, vendors, town buildings), evaluated base values for formulas,
the unlock sources still missing, and other languages.

## Changelog

### 0.1.0 (first drop)

Items, item groups, crafts, buildables with their build actions, zones, techs, tech tabs, names
and icons.
