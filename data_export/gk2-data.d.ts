/**
 * Graveyard Keeper 2 game data export — types for gk2-data.json.
 *
 * Schema version 0.1.0. Pre-1.0: any minor bump may change or remove fields; see README.md
 * ("Stability") and SCHEMA.md for what each field means and where it is ambiguous.
 *
 * Conventions:
 * - Ids are the game's own string ids, unique within a collection, and stable across game builds
 *   unless the developers rename them. Ids can contain ":" (quality variants, e.g. "cabbage:2").
 * - `null` means "not set in the game data". It never means zero unless a field says so.
 * - References are bare ids. To display any id: find its record, else look it up in `names`,
 *   else show the id itself.
 */

export interface Gk2Data {
  /** Semver of this export's shape. Bumped on every shape change; see README.md changelog. */
  schemaVersion: string;
  /** ISO 8601 UTC timestamp of when the export was generated. */
  generatedAt: string;
  source: Source;

  items: Item[];
  itemGroups: ItemGroup[];
  crafts: Craft[];
  /** Placeable objects. Each has one or more build actions (place, remove, ...). */
  buildables: Buildable[];
  zones: Zone[];
  techs: Tech[];
  /** Tech tree tabs in the game's own order. */
  techTabs: TechTab[];
  /**
   * Display names for ids that are referenced but have no record of their own here:
   * crafting stations and other world objects, builders, perks, quests.
   * Ids with no known name are absent.
   */
  names: Record<string, string>;
}

export interface Source {
  game: "Graveyard Keeper 2";
  steamAppId: number;
  /** Steam build the data was extracted from. Compare to know which patch the data reflects. */
  steamBuildId: number;
  unityVersion: string;
  /** Language of every `name` / `description` in this file. */
  locale: "en";
}

// ---------------------------------------------------------------------------------------------
// Shared building blocks

/**
 * A game quantity: a plain number, or a formula the game evaluates at runtime against game state
 * (perks, worker skills, ...). Formulas are passed through unevaluated; see SCHEMA.md "Formulas".
 */
export type Quantity = number | Formula;

export interface Formula {
  /** Parsed expression, e.g. `12+4*WorkerPar("perk_blacksmith")`. */
  formula: string;
  /** The form the designers wrote, when different, e.g. `12+4*#perk_blacksmith`. */
  authored?: string;
}

/**
 * Where a `name` came from. Informational only (for debugging bad names); the format is not stable.
 * e.g. "key", "alias incense_1", "base alias cabbage:1", "output nails_iron", "wgo incense_1 (key)",
 * "builder builder_church (key)", "action incense_1_p", "reputation lock".
 */
export type NameSource = string;

/** Fields every top-level record has. */
export interface RecordBase {
  id: string;
  /** English display name, or null when the game has no text for it (mostly dev/test content). */
  name: string | null;
  nameSource: NameSource | null;
  /**
   * File stem of the icon in `icons/` (`icons/<icon>.png`), or null when there is none.
   * Only set when the PNG exists in this export.
   */
  icon: string | null;
  /**
   * Heuristic guess that this is test/dev content, from its id (and, for buildings, its builders).
   * The game does not mark such content. Expect false positives and negatives; see SCHEMA.md.
   */
  likelyDev: boolean;
  /**
   * The game's own definition, with default-valued fields removed. Field names are the game's.
   * NOT part of the stable schema: an escape hatch for fields not modelled yet. Ask for a field
   * to be promoted rather than depending on it here. See SCHEMA.md "raw".
   */
  raw: RawDef | null;
}

/** Game def with defaults dropped; formulas appear as `{ $expr, $src? }`. Unstable by design. */
export type RawDef = { [field: string]: unknown };

/**
 * What a recipe line points at. Recipes don't distinguish these in the game data:
 * - "item": an id in `items`
 * - "itemGroup": an id in `itemGroups`, meaning "any member of this group"
 * - "anyQuality": the bare id of quality-variant items (`story` for `story:1..3`). As an input:
 *   any tier. As a (star) output: the tier the craft's quality roll picks. See SCHEMA.md.
 * - "unresolved": matches none of these (none in this drop; kept for future data)
 */
export type RefKind = "item" | "itemGroup" | "anyQuality" | "unresolved";

/** A recipe input (or a build cost). */
export interface ItemStack {
  id: string;
  refKind: RefKind;
  count: Quantity;
}

/** A recipe output. Has either `count`, or a `min`..`max` range, and may be conditional on `chance`. */
export interface ItemOutput {
  id: string;
  refKind: RefKind;
  /** Fixed amount. null when the output uses `min`/`max` instead. */
  count: Quantity | null;
  /** Random range bounds (inclusive, as far as we know), set when `count` is null. */
  min: Quantity | null;
  max: Quantity | null;
  /** Probability 0..1 that this output happens at all. null = always. */
  chance: Quantity | null;
  /** Set for "pick one of a group" outputs; outputs sharing a value are one group. Used once. */
  outputGroup: string | null;
  /**
   * Game flag `isStarGroup`. Observed: set exactly on outputs with refKind "anyQuality", i.e. the
   * output whose quality tier is decided by the craft (see SCHEMA.md "Quality").
   */
  star: boolean;
}

/** A link from an item to a recipe that makes or uses it. */
export interface RecipeLink {
  kind: "craft" | "buildAction";
  /** Craft id, or build action id (find it via `buildables[].actions[].id`). */
  id: string;
  /**
   * null when the recipe names this item directly. Otherwise how it matched: an item group the
   * item belongs to, or its quality base id ("anyQuality").
   */
  via: { kind: "itemGroup" | "anyQuality"; id: string } | null;
}

/** Whether something must be unlocked, and every unlock source we could find. */
export interface Unlock {
  /** The game's `isNeedsUnlock` flag. */
  required: boolean;
  /**
   * Known sources. Can be empty even when `required` is true: the unlock then happens somewhere
   * not extracted yet (scripts, dialogue, code). Can be non-empty when `required` is false.
   */
  sources: UnlockSource[];
}

export type UnlockSource =
  /** Unlocked by researching this tech (see `techs`). */
  | { via: "tech"; techId: string }
  /** Unlocked (or locked) by a scripted effect in another definition. */
  | {
      via: "effect";
      /** Game list the triggering def lives in, e.g. "questDefs", "techDefs", "buildingDefs". */
      collection: string;
      /** Id of the triggering def in that list. */
      id: string;
      /** The game function; "LockBuilding" removes access rather than granting it. */
      call: "UnlockCraft" | "UnlockBuilding" | "LockBuilding";
      /** Field path inside the triggering def, e.g. "execExpressionsStart[0]". */
      field: string;
      /** The full effect expression. */
      expression: string;
    };

// ---------------------------------------------------------------------------------------------
// Collections

export type ItemFlag =
  | "tool" | "weapon" | "seed" | "fuel" | "bag" | "questItem" | "product" | "techPoint" | "fertilizer";

export interface Item extends RecordBase {
  description: string | null;
  /** Icon id the game asked for, whether or not it was found. */
  iconId: string | null;
  /**
   * The part after ":" in the id, or null. Usually "1" | "2" | "3" (quality tiers, each its own
   * item), but other values exist ("peat", "start_bonus_1"). There is no item for the bare id.
   */
  quality: string | null;
  /** Item groups (tags) this item belongs to. See `itemGroups`. */
  groups: string[];
  stackCount: number;
  basePrice: number;
  /** Game enum `type`; names not decoded yet. 0 for most items. */
  type: number;
  flags: ItemFlag[];
  /** Crafts and build actions that output this item (directly or via a group). */
  madeBy: RecipeLink[];
  /** Crafts and build actions that consume this item (directly or via a group). */
  usedIn: RecipeLink[];
}

export interface ItemGroup {
  id: string;
  members: string[];
  /** True when some recipe names this group directly ("any of"). Other groups are tags (e.g. bag rules). */
  usedInRecipes: boolean;
}

export type CraftFlag = "auto" | "hidden" | "oneTime" | "fuel" | "autopsy" | "conveyor";

export interface Craft extends RecordBase {
  /** Description text; the game sets a key on most crafts but very few have text. */
  description: string | null;
  /** "own", or "output <itemId>" when the icon is borrowed from the first output. */
  iconSource: string | null;
  iconId: string | null;
  /**
   * World objects (stations) the craft runs at. A station id is also a `buildables` id when it can
   * be built; otherwise look it up in `names`. Empty for crafts without a station.
   */
  stations: string[];
  inputs: ItemStack[];
  /** Empty for crafts that only do something (destroy, harvest, scripted effect). */
  outputs: ItemOutput[];
  /** Game time units; exact unit not confirmed. */
  duration: Quantity | null;
  energyPerTick: Quantity | null;
  /** Tech points awarded per craft. null = not set (treat as 0). */
  techPoints: { red: Quantity | null; green: Quantity | null; blue: Quantity | null };
  /** Perk ids linked to the craft (they modify it; exact effect is per perk). */
  perks: string[];
  flags: CraftFlag[];
  /** Effects run when the craft finishes, as raw game expressions. */
  effectsOnEnd: string[];
  unlock: Unlock;
}

/** The game's BuildingMode enum. The action id suffix matches (_p, _r, _cp, _fp, _fb, _s). */
export type BuildMode =
  | "None" | "Place" | "Remove" | "ConveyorPlace" | "FightingPlace" | "FightBuilding" | "Script" | "Upgrade";

export interface Buildable extends RecordBase {
  /** "own" (from a build action), "item" (from an item with the same id), or null. */
  iconSource: string | null;
  /** The actions available on this object, Place first. */
  actions: BuildAction[];
  /** Zones whose build menu offers any of the actions (dev zones included). */
  zones: string[];
  /** Crafts that run at this object when it's a station. */
  craftsHere: string[];
  /** For buildables, `raw` is the world object definition (null for script-only ids). */
}

export interface BuildAction {
  /** Building def id, e.g. "incense_1_p". Tech unlocks refer to this id. */
  id: string;
  mode: BuildMode;
  name: string | null;
  nameSource: NameSource | null;
  icon: string | null;
  iconId: string | null;
  /** Build cost (Place) — empty for Remove. */
  cost: ItemStack[];
  /** For Remove: the refund. */
  outputs: ItemOutput[];
  /** Builder ids (zone build menus) offering this action. Map to zones via `zones[].builder`. */
  builders: string[];
  /** Craft run on completion, often a generic one like "destroy_basic". */
  startCraft: string | null;
  /** Max number that can exist; null = no limit set. */
  limit: number | null;
  unlock: Unlock;
  likelyDev: boolean;
  raw: RawDef;
}

export interface Zone extends RecordBase {
  iconId: string | null;
  /** The builder whose build menu belongs to this zone. Shared by a zone and its dev copies. */
  builder: string | null;
  /** Buildables offered by this zone's builder. */
  buildables: string[];
}

export type TechTabId = "Building" | "Metallurgy" | "Farming" | "Theology" | "Anatomy" | "Cooking";

export interface TechTab {
  id: TechTabId;
  /** Display name; may contain "\n" (e.g. "Anatomy\nand alchemy"). */
  name: string;
}

export interface Tech extends RecordBase {
  /**
   * Techs have no icon in the data; it's borrowed from the first thing the tech unlocks.
   * e.g. "building incense_1_p", "craft polished_bronze", "town ...". null when nothing fits.
   */
  iconSource: string | null;
  tab: TechTabId;
  /** Grid position within the tab: x 0..17 left to right, y 0..4. Can be fractional (0.5). */
  x: number;
  y: number;
  /** Prerequisite tech ids (same tab, lower x). */
  parents: string[];
  /** Price in tech points. */
  cost: { red: number; green: number; blue: number };
  /** "Common", or "CharRep" for reputation gates (see `reputationLock`). */
  type: "Common" | "CharRep" | "DisRep";
  hiddenAtStart: boolean;
  /**
   * For reputation gates: required NPC reputation. These techs unlock nothing themselves; they sit
   * as parents of real techs. The name of a gate is generated from this (nameSource "reputation lock").
   */
  reputationLock: { npc: string; npcName: string | null; value: number }[];
  unlocks: {
    crafts: string[];
    /** Build action ids (not buildable ids). */
    buildActions: string[];
    /** Not exported as records yet. */
    alchemyFormulas: string[];
    /** Not exported as records yet. */
    townBuildings: string[];
    /** Perk ids; names in `names`. */
    perks: string[];
  };
}
