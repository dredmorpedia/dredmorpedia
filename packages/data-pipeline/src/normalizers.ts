import { existsSync } from "node:fs";

import {
  canonicalKey,
  compareCodeUnits,
  damageSourceKeys,
  entityId,
  itemTrapActivationModes,
  itemTriggerKinds,
  monsterSpellTriggerKinds,
  slugify,
  statModifierKinds,
  unresolvedRelationship,
  type Ability,
  type Encrustment,
  type EncrustmentInstabilityEffect,
  type EncrustmentPower,
  type EntityCandidate,
  type EntityKind,
  type EntityProvenance,
  type Item,
  type ItemArmourMetadata,
  type ItemArtifactMetadata,
  type ItemMacguffinMetadata,
  type ItemToolkitBounds,
  type ItemToolkitControlMetadata,
  type ItemToolkitMetadata,
  type ItemTrigger,
  type ItemTriggerKind,
  type ItemWeaponMetadata,
  type Monster,
  type MonsterDrop,
  type MonsterSpellTrigger,
  type NormalizedEntityBase,
  type Recipe,
  type Skill,
  type SkillLoadout,
  type Spell,
  type SpellAiHintMetadata,
  type SpellAnimationMetadata,
  type SpellBuff,
  type SpellBuffDescription,
  type SpellBuffEventHook,
  type SpellBuffHaloMetadata,
  type SpellBuffPaybackDeclaration,
  type SpellBuffPolymorphDeclaration,
  type SpellBuffSenseWallsDeclaration,
  type SpellBuffSightModifier,
  type SpellBuffZorkmidAbsorptionDeclaration,
  type SpellEffect,
  type SpellEffectOption,
  type SpellImpactMetadata,
  type SpellTrigger,
  type SourceFlag,
  type StatModifier,
  type StatModifierKind,
  type Stat,
  type SkillProgressionTag,
  type Template,
} from "@dredmorpedia/domain";

import type { DatabaseKind } from "./manifest";
import { firstMonsterFramePath } from "./monster-art";
import type { NormalizationContext } from "./normalization-context";
import { parseSourceInteger, parseSourceNumber } from "./numeric-lexemes";
import {
  assertSafeRelativePath,
  PathBoundaryError,
  resolveExistingWithin,
  toPosixPath,
} from "./safe-path";
import { parseSpellRequirements } from "./spell-requirements";
import type { XmlRecord } from "./xml-adapter";
import {
  collectElements,
  collectNestedElements,
  isXmlRecord,
  xmlAttribute,
  xmlChildren,
} from "./xml-adapter";

export interface CandidateCollections {
  items: EntityCandidate<Item>[];
  recipes: EntityCandidate<Recipe>[];
  encrustments: EntityCandidate<Encrustment>[];
  encrustmentInstabilityEffects: EncrustmentInstabilityEffect[];
  skills: EntityCandidate<Skill>[];
  abilities: EntityCandidate<Ability>[];
  spells: EntityCandidate<Spell>[];
  monsters: EntityCandidate<Monster>[];
  stats: EntityCandidate<Stat>[];
  templates: EntityCandidate<Template>[];
}

export function emptyCandidateCollections(): CandidateCollections {
  return {
    items: [],
    recipes: [],
    encrustments: [],
    encrustmentInstabilityEffects: [],
    skills: [],
    abilities: [],
    spells: [],
    monsters: [],
    stats: [],
    templates: [],
  };
}

function childAttribute(
  record: XmlRecord,
  childName: string,
  attributeName: string,
): string | undefined {
  const child = xmlChildren(record, childName)[0];
  return child ? xmlAttribute(child, attributeName) : undefined;
}

function itemQualityAttribute(record: XmlRecord): string | undefined {
  if (Object.hasOwn(record, "weapon")) {
    return xmlAttribute(record, "level");
  }
  if (Object.hasOwn(record, "trap")) {
    return childAttribute(record, "trap", "level");
  }
  return undefined;
}

const weaponCategories: Readonly<Record<string, string>> = {
  "0": "weapon:sword",
  "1": "weapon:axe",
  "2": "weapon:mace",
  "3": "weapon:staff",
  "4": "weapon:crossbow",
  "5": "weapon:thrown",
  "6": "weapon:ammunition",
  "7": "weapon:dagger",
  "8": "weapon:polearm",
};

const armourCategories: Readonly<Record<string, string>> = {
  head: "armour:head",
  chest: "armour:chest",
  legs: "armour:legs",
  hands: "armour:hands",
  feet: "armour:feet",
  waist: "armour:waist",
  shield: "armour:shield",
  ring: "armour:ring",
  neck: "armour:neck",
  sleeve: "armour:sleeve",
};

function itemCategory(record: XmlRecord): string {
  if (Object.hasOwn(record, "weapon")) {
    const sourceType = xmlAttribute(record, "type");
    return weaponCategories[sourceType ?? "0"] ?? "weapon";
  }

  if (Object.hasOwn(record, "armour")) {
    const overrideClass = xmlAttribute(record, "overrideClassName")
      ?.trim()
      .toLocaleLowerCase("en");
    if (overrideClass === "orb" || overrideClass === "tome") {
      return overrideClass;
    }
    const sourceType = childAttribute(record, "armour", "type")
      ?.trim()
      .toLocaleLowerCase("en");
    return (sourceType && armourCategories[sourceType]) || "armour";
  }

  const food = xmlChildren(record, "food");
  if (food.some((child) => xmlAttribute(child, "hp") !== undefined)) {
    return "food";
  }
  if (food.some((child) => xmlAttribute(child, "mp") !== undefined)) {
    return "booze";
  }
  if (food.length > 0) {
    return "food";
  }

  if (Object.hasOwn(record, "macguffin")) {
    return "macguffin";
  }

  for (const category of [
    "trap",
    "wand",
    "potion",
    "mushroom",
    "gem",
  ] as const) {
    if (Object.hasOwn(record, category)) {
      return category;
    }
  }

  if (Object.hasOwn(record, "toolkit")) {
    return "toolkit";
  }
  if (xmlAttribute(record, "alchemical") !== undefined) {
    return "reagent";
  }

  const sourceType = xmlAttribute(record, "type")?.trim();
  return sourceType && !/^\d+$/.test(sourceType)
    ? canonicalKey(sourceType)
    : "item";
}

const directItemTriggerSpecs: readonly {
  childName: string;
  kind: ItemTriggerKind;
}[] = [
  { childName: "targetHitEffectBuff", kind: "melee-target" },
  { childName: "targethiteffectbuff", kind: "melee-target" },
  { childName: "crossbowShotBuff", kind: "crossbow-target" },
  { childName: "thrownBuff", kind: "thrown-target" },
  { childName: "targetKillBuff", kind: "kill-target" },
  { childName: "playerHitEffectBuff", kind: "melee-self" },
  { childName: "playerhiteffectbuff", kind: "melee-self" },
  { childName: "dodgeBuff", kind: "dodge" },
  { childName: "triggerondodge", kind: "dodge" },
  { childName: "criticalBuff", kind: "critical" },
  { childName: "counterBuff", kind: "counter" },
  { childName: "blockBuff", kind: "block" },
  { childName: "triggeroncast", kind: "cast" },
  { childName: "spell", kind: "activated" },
];

const effectTriggerKinds: Readonly<Record<string, ItemTriggerKind>> = {
  trigger: "trigger-once",
  dot: "trigger-repeat",
  triggerfromlist: "trigger-list",
};

const directSpellTriggerAttributes = new Set([
  "after",
  "amount",
  "name",
  "percent",
  "percentage",
  "resistable",
  "spell",
  "taxa",
  "type",
]);

const itemTriggerKindRanks = new Map(
  itemTriggerKinds.map((kind, index) => [kind, index]),
);

const monsterSpellTriggerKindRanks = new Map(
  monsterSpellTriggerKinds.map((kind, index) => [kind, index]),
);

const partiallySupportedItemChildren = new Set(["effect"]);

function validateItemGemMarkers(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): void {
  for (const gem of xmlChildren(record, "gem")) {
    reportUnknownLeafContent(
      context,
      gem,
      "gem",
      new Set(),
      provenance,
      currentEntityId,
      true,
    );
  }
}

function parseItemArmourDeclarations(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): ItemArmourMetadata[] {
  const rawArmourDeclarations = Object.hasOwn(record, "armour")
    ? Array.isArray(record.armour)
      ? record.armour
      : [record.armour]
    : [];

  return rawArmourDeclarations.map((rawArmour, armourIndex) => {
    const armour = isXmlRecord(rawArmour) ? rawArmour : {};
    if (
      !isXmlRecord(rawArmour) &&
      (typeof rawArmour !== "string" || rawArmour.trim() !== "")
    ) {
      context.diagnostics.push({
        severity: "warning",
        code: "unknown_element",
        message:
          "Unsupported text content inside <armour> was preserved only as a diagnostic.",
        source: context.parsed.locateChildElement(record, "armour"),
        entityId: currentEntityId,
        details: { element: "armour" },
      });
    }

    reportUnknownLeafContent(
      context,
      armour,
      "armour",
      new Set(["level", "randoms", "type"]),
      provenance,
      currentEntityId,
      true,
    );

    const rawSlot = xmlAttribute(armour, "type");
    const slot = rawSlot?.trim().toLocaleLowerCase("en") || null;
    if (slot === null) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_item_armour_slot",
        message: `Armour declaration ${armourIndex + 1} has no type; its equipment slot is unavailable.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }

    const rawLevel = xmlAttribute(armour, "level");
    if (rawLevel === undefined || rawLevel === "") {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_item_armour_level",
        message: `Armour declaration ${armourIndex + 1} has no level; its source level is unavailable.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }

    return {
      slot,
      level: optionalIntegerValue(
        rawLevel,
        context,
        provenance,
        `item armour declaration ${armourIndex + 1} level`,
        currentEntityId,
        0,
      ),
      randoms: optionalIntegerValue(
        xmlAttribute(armour, "randoms"),
        context,
        provenance,
        `item armour declaration ${armourIndex + 1} randoms`,
        currentEntityId,
        0,
      ),
    };
  });
}

function parseItemWeaponDeclarations(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): ItemWeaponMetadata[] {
  const rawWeaponDeclarations = Object.hasOwn(record, "weapon")
    ? Array.isArray(record.weapon)
      ? record.weapon
      : [record.weapon]
    : [];

  return rawWeaponDeclarations.map((rawWeapon, weaponIndex) => {
    const weapon = isXmlRecord(rawWeapon) ? rawWeapon : {};
    if (
      !isXmlRecord(rawWeapon) &&
      (typeof rawWeapon !== "string" || rawWeapon.trim() !== "")
    ) {
      context.diagnostics.push({
        severity: "warning",
        code: "unknown_element",
        message:
          "Unsupported text content inside <weapon> was preserved only as a diagnostic.",
        source: context.parsed.locateChildElement(record, "weapon"),
        entityId: currentEntityId,
        details: { element: "weapon" },
      });
    }

    reportUnknownLeafContent(
      context,
      weapon,
      "weapon",
      new Set([
        ...statModifierDamageKeys,
        "canTargetFloor",
        "cantargetfloor",
        "hit",
        "thrown",
      ]),
      provenance,
      currentEntityId,
      true,
    );

    const floorTargetAttribute = Object.hasOwn(weapon, "@canTargetFloor")
      ? "canTargetFloor"
      : "cantargetfloor";

    return {
      canTargetFloor: optionalBooleanAttribute(
        weapon,
        floorTargetAttribute,
        context,
        provenance,
        `item weapon declaration ${weaponIndex + 1} floor-target flag`,
        currentEntityId,
      ),
      thrownPath: normalizeAssetReference(
        xmlAttribute(weapon, "thrown"),
        context,
        provenance,
        currentEntityId,
      ),
    };
  });
}

function parseItemMacguffinDeclarations(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): ItemMacguffinMetadata[] {
  const rawDeclarations = Object.hasOwn(record, "macguffin")
    ? Array.isArray(record.macguffin)
      ? record.macguffin
      : [record.macguffin]
    : [];

  return rawDeclarations.map((rawDeclaration, declarationIndex) => {
    const declaration = isXmlRecord(rawDeclaration) ? rawDeclaration : {};
    if (
      !isXmlRecord(rawDeclaration) &&
      (typeof rawDeclaration !== "string" || rawDeclaration.trim() !== "")
    ) {
      context.diagnostics.push({
        severity: "warning",
        code: "unknown_element",
        message:
          "Unsupported text content inside <macguffin> was preserved only as a diagnostic.",
        source: context.parsed.locateChildElement(record, "macguffin"),
        entityId: currentEntityId,
        details: { element: "macguffin" },
      });
    }

    reportUnknownLeafContent(
      context,
      declaration,
      "macguffin",
      new Set(["consumable", "item_class_name", "spell"]),
      provenance,
      currentEntityId,
      true,
    );

    const rawSpellName = xmlAttribute(declaration, "spell");
    const spellName = rawSpellName?.trim() ? rawSpellName : null;
    if (spellName === null) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_item_macguffin_spell",
        message: `Macguffin declaration ${declarationIndex + 1} has no spell reference.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }

    const rawItemClassName = xmlAttribute(declaration, "item_class_name");
    const itemClassName = rawItemClassName?.trim() ? rawItemClassName : null;
    if (rawItemClassName !== undefined && itemClassName === null) {
      context.diagnostics.push({
        severity: "warning",
        code: "invalid_item_macguffin_class_name",
        message: `Macguffin declaration ${declarationIndex + 1} has an empty item class name.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }

    return {
      spellKey: spellName === null ? null : canonicalKey(spellName),
      spellName,
      itemClassName,
      consumable: optionalBooleanAttribute(
        declaration,
        "consumable",
        context,
        provenance,
        `item macguffin declaration ${declarationIndex + 1} consumable flag`,
        currentEntityId,
      ),
    };
  });
}

const itemToolkitAttributes = new Set([
  "active",
  "autofillbutton",
  "autofillbuttonposx",
  "autofillbuttonposy",
  "bg",
  "closex",
  "closey",
  "craftbutton",
  "craftbuttonposx",
  "craftbuttonposy",
  "missing",
  "numslots",
  "output_x1",
  "output_x2",
  "output_y1",
  "output_y2",
  "present",
  "recipebutton",
  "recipebuttonposx",
  "recipebuttonposy",
  "slot1_x1",
  "slot1_x2",
  "slot1_y1",
  "slot1_y2",
  "slot2_x1",
  "slot2_x2",
  "slot2_y1",
  "slot2_y2",
  "slot3_x1",
  "slot3_x2",
  "slot3_y1",
  "slot3_y2",
  "slot4_x1",
  "slot4_x2",
  "slot4_y1",
  "slot4_y2",
  "sound",
  "tag",
]);

function parseItemToolkitDeclarations(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): ItemToolkitMetadata[] {
  const rawDeclarations = Object.hasOwn(record, "toolkit")
    ? Array.isArray(record.toolkit)
      ? record.toolkit
      : [record.toolkit]
    : [];

  return rawDeclarations.map((rawDeclaration, declarationIndex) => {
    const declaration = isXmlRecord(rawDeclaration) ? rawDeclaration : {};
    const declarationLabel = `item toolkit declaration ${declarationIndex + 1}`;
    if (
      !isXmlRecord(rawDeclaration) &&
      (typeof rawDeclaration !== "string" || rawDeclaration.trim() !== "")
    ) {
      context.diagnostics.push({
        severity: "warning",
        code: "unknown_element",
        message:
          "Unsupported text content inside <toolkit> was preserved only as a diagnostic.",
        source: context.parsed.locateChildElement(record, "toolkit"),
        entityId: currentEntityId,
        details: { element: "toolkit" },
      });
    }

    reportUnknownLeafContent(
      context,
      declaration,
      "toolkit",
      itemToolkitAttributes,
      provenance,
      currentEntityId,
      true,
    );

    const sourceText = (
      attribute: string,
      field: string,
      required = false,
    ): string | null => {
      const rawValue = xmlAttribute(declaration, attribute);
      const value = rawValue?.trim() || null;
      if ((required || rawValue !== undefined) && value === null) {
        context.diagnostics.push({
          severity: "warning",
          code: "invalid_item_toolkit_text",
          message: `${declarationLabel} has no usable ${field}.`,
          source: provenance,
          entityId: currentEntityId,
          details: { field, value: rawValue ?? "" },
        });
      }
      return value;
    };
    const coordinate = (attribute: string, field: string) =>
      optionalIntegerValue(
        xmlAttribute(declaration, attribute),
        context,
        provenance,
        `${declarationLabel} ${field}`,
        currentEntityId,
        0,
      );
    const bounds = (prefix: string, field: string): ItemToolkitBounds => {
      const parsed = {
        x1: coordinate(`${prefix}_x1`, `${field} x1`),
        y1: coordinate(`${prefix}_y1`, `${field} y1`),
        x2: coordinate(`${prefix}_x2`, `${field} x2`),
        y2: coordinate(`${prefix}_y2`, `${field} y2`),
      };
      const suppliedCount = Object.values(parsed).filter(
        (value) => value !== null,
      ).length;
      if (suppliedCount > 0 && suppliedCount < 4) {
        context.diagnostics.push({
          severity: "warning",
          code: "incomplete_item_toolkit_bounds",
          message: `${declarationLabel} has incomplete ${field} coordinates.`,
          source: provenance,
          entityId: currentEntityId,
          details: { field },
        });
      }
      return parsed;
    };
    const control = (
      referenceAttribute: string,
      xAttribute: string,
      yAttribute: string,
      field: string,
    ): ItemToolkitControlMetadata => {
      const sourcePath = sourceText(
        referenceAttribute,
        `${field} presentation reference`,
      );
      const parsed = {
        path: normalizeAssetReference(
          sourcePath ?? undefined,
          context,
          provenance,
          currentEntityId,
        ),
        positionX: coordinate(xAttribute, `${field} position x`),
        positionY: coordinate(yAttribute, `${field} position y`),
      };
      const suppliedCount = Object.values(parsed).filter(
        (value) => value !== null,
      ).length;
      if (suppliedCount > 0 && suppliedCount < 3) {
        context.diagnostics.push({
          severity: "warning",
          code: "incomplete_item_toolkit_control",
          message: `${declarationLabel} has incomplete ${field} presentation metadata.`,
          source: provenance,
          entityId: currentEntityId,
          details: { field },
        });
      }
      return parsed;
    };
    const assetReference = (attribute: string, field: string) => {
      const sourcePath = sourceText(attribute, field);
      return normalizeAssetReference(
        sourcePath ?? undefined,
        context,
        provenance,
        currentEntityId,
      );
    };

    const tag = sourceText("tag", "crafting tag", true);
    const rawNumSlots = xmlAttribute(declaration, "numslots");
    if (rawNumSlots === undefined || rawNumSlots === "") {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_item_toolkit_slot_count",
        message: `${declarationLabel} has no slot count.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }
    const numSlots = optionalIntegerValue(
      rawNumSlots,
      context,
      provenance,
      `${declarationLabel} slot count`,
      currentEntityId,
      0,
    );
    const missingPath = assetReference(
      "missing",
      "missing-state presentation reference",
    );
    const presentPath = assetReference(
      "present",
      "present-state presentation reference",
    );
    const activePath = assetReference(
      "active",
      "active-state presentation reference",
    );
    const stateReferenceCount = [missingPath, presentPath, activePath].filter(
      (value) => value !== null,
    ).length;
    if (stateReferenceCount > 0 && stateReferenceCount < 3) {
      context.diagnostics.push({
        severity: "warning",
        code: "incomplete_item_toolkit_state_references",
        message: `${declarationLabel} has an incomplete set of state presentation references.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }

    const slotBounds = [1, 2, 3, 4]
      .map((slot) => ({ slot, ...bounds(`slot${slot}`, `slot ${slot}`) }))
      .filter(({ x1, y1, x2, y2 }) =>
        [x1, y1, x2, y2].some((value) => value !== null),
      );
    if (numSlots !== null && slotBounds.some(({ slot }) => slot > numSlots)) {
      context.diagnostics.push({
        severity: "warning",
        code: "invalid_item_toolkit_slot_layout",
        message: `${declarationLabel} supplies coordinates beyond its declared slot count.`,
        source: provenance,
        entityId: currentEntityId,
        details: { numSlots },
      });
    }
    const closePosition = {
      x: coordinate("closex", "close position x"),
      y: coordinate("closey", "close position y"),
    };
    const closeCoordinateCount = Object.values(closePosition).filter(
      (value) => value !== null,
    ).length;
    if (closeCoordinateCount === 1) {
      context.diagnostics.push({
        severity: "warning",
        code: "incomplete_item_toolkit_close_position",
        message: `${declarationLabel} has an incomplete close position.`,
        source: provenance,
        entityId: currentEntityId,
      });
    }

    return {
      tag,
      numSlots,
      soundCue: sourceText("sound", "sound cue"),
      missingPath,
      presentPath,
      activePath,
      slotBounds,
      outputBounds: bounds("output", "output"),
      craftButton: control(
        "craftbutton",
        "craftbuttonposx",
        "craftbuttonposy",
        "craft button",
      ),
      recipeButton: control(
        "recipebutton",
        "recipebuttonposx",
        "recipebuttonposy",
        "recipe button",
      ),
      autofillButton: control(
        "autofillbutton",
        "autofillbuttonposx",
        "autofillbuttonposy",
        "autofill button",
      ),
      closePosition,
      backgroundPath: assetReference("bg", "background presentation reference"),
    };
  });
}

function parseItemRecoveries(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): Item["recoveries"] {
  const recoveries: Item["recoveries"] = [];
  for (const food of xmlChildren(record, "food")) {
    reportUnknownLeafContent(
      context,
      food,
      "food",
      new Set(["effect", "hp", "meat", "mp"]),
      provenance,
      currentEntityId,
      true,
    );
    const meat = xmlAttribute(food, "meat");
    const sourceFlags =
      meat === undefined ? [] : [{ sourceKey: "meat", value: meat }];
    for (const [attribute, resource] of [
      ["hp", "life"],
      ["mp", "mana"],
    ] as const) {
      const value = xmlAttribute(food, attribute);
      if (value === undefined) {
        continue;
      }
      recoveries.push({
        resource,
        amount: optionalIntegerValue(
          value,
          context,
          provenance,
          `item ${resource} recovery`,
          currentEntityId,
          0,
        ),
        sourceFlags: sourceFlags.map((flag) => ({ ...flag })),
      });
    }
    if (
      xmlAttribute(food, "hp") === undefined &&
      xmlAttribute(food, "mp") === undefined
    ) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_item_recovery",
        message:
          "A food declaration has no hp or mp source value; recovery is unavailable.",
        source: provenance,
        entityId: currentEntityId,
        details: {
          ...(meat === undefined ? {} : { sourceFlag: `meat=${meat}` }),
        },
      });
    }
  }
  return recoveries;
}

function parseItemChargeRanges(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): Item["chargeRanges"] {
  return xmlChildren(record, "wand").map((wand) => {
    reportUnknownLeafContent(
      context,
      wand,
      "wand",
      new Set(["maxcharge", "mincharge", "spell"]),
      provenance,
      currentEntityId,
      true,
    );
    const minimum = optionalIntegerValue(
      xmlAttribute(wand, "mincharge"),
      context,
      provenance,
      "item wand minimum charges",
      currentEntityId,
      0,
    );
    const maximum = optionalIntegerValue(
      xmlAttribute(wand, "maxcharge"),
      context,
      provenance,
      "item wand maximum charges",
      currentEntityId,
      0,
    );
    if (minimum !== null && maximum !== null && minimum > maximum) {
      context.diagnostics.push({
        severity: "warning",
        code: "invalid_item_charge_range",
        message:
          "A wand minimum charge count exceeded its maximum; the range is unavailable.",
        source: provenance,
        entityId: currentEntityId,
        details: { minimum, maximum },
      });
      return { minimum: null, maximum: null };
    }
    return { minimum, maximum };
  });
}

function parseItemTraps(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): Item["traps"] {
  return xmlChildren(record, "trap").map((trap) => {
    reportUnknownLeafContent(
      context,
      trap,
      "trap",
      new Set([
        "casts",
        "level",
        "origin",
        "originFacing",
        "originMount",
        "targetIsCaster",
        "trigger",
      ]),
      provenance,
      currentEntityId,
      true,
    );
    const activationValue = xmlAttribute(trap, "trigger");
    const activation = itemTrapActivationModes.find(
      (mode) => mode === activationValue,
    );
    if (activationValue !== undefined && activation === undefined) {
      context.diagnostics.push({
        severity: "warning",
        code: "invalid_item_trap_activation",
        message: `Expected always or once for item trap activation; used an unavailable value instead.`,
        source: provenance,
        entityId: currentEntityId,
        details: { value: activationValue },
      });
    }

    return {
      activation: activation ?? null,
      level: optionalIntegerValue(
        xmlAttribute(trap, "level"),
        context,
        provenance,
        "item trap level",
        currentEntityId,
        0,
      ),
      targetsCaster: optionalBooleanAttribute(
        trap,
        "targetIsCaster",
        context,
        provenance,
        "item trap targets-caster flag",
        currentEntityId,
      ),
      originPath: normalizeAssetPath(
        xmlAttribute(trap, "origin"),
        context,
        provenance,
        currentEntityId,
      ),
      originMount: xmlAttribute(trap, "originMount") ?? null,
      originFacing: xmlAttribute(trap, "originFacing") ?? null,
    };
  });
}

function parseSpellTrigger(
  record: XmlRecord,
  kind: ItemTriggerKind,
  referenceAttributes: readonly string[],
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  ownerLabel: "item" | "ability",
): SpellTrigger | null {
  const spellName = referenceAttributes
    .map((attribute) => xmlAttribute(record, attribute))
    .find((value): value is string => Boolean(value));
  if (!spellName) {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_trigger_spell",
      message: `An ${ownerLabel} ${kind} trigger is missing its spell reference.`,
      source: provenance,
      entityId: currentEntityId,
      details: { triggerKind: kind },
    });
    return null;
  }

  const chanceText =
    xmlAttribute(record, "percent") ?? xmlAttribute(record, "percentage");
  const effectType = xmlAttribute(record, "type");
  const amountText = xmlAttribute(record, "amount");
  const after = xmlAttribute(record, "after");
  const resistable = optionalBooleanAttribute(
    record,
    "resistable",
    context,
    provenance,
    `${ownerLabel} trigger resistable`,
    currentEntityId,
  );
  const numericMetadata = (
    value: string | undefined,
    field: string,
    maximum?: number,
  ) =>
    value === undefined
      ? 0
      : integerValue(
          value,
          0,
          context,
          provenance,
          field,
          currentEntityId,
          0,
          maximum,
        );

  return {
    kind,
    spellKey: canonicalKey(spellName),
    spellName,
    chance:
      chanceText === undefined
        ? null
        : numericMetadata(chanceText, `${ownerLabel} trigger chance`, 100),
    delay:
      effectType === "trigger"
        ? numericMetadata(amountText, `${ownerLabel} trigger delay`)
        : 0,
    duration:
      effectType === "dot"
        ? numericMetadata(amountText, `${ownerLabel} trigger duration`)
        : 0,
    unresistable: resistable === false,
    monsterTaxonomy: xmlAttribute(record, "taxa") ?? null,
    sourceFlags:
      after === undefined ? [] : [{ sourceKey: "after", value: after }],
  };
}

function compareSpellTriggers(left: SpellTrigger, right: SpellTrigger): number {
  return (
    (itemTriggerKindRanks.get(left.kind) ?? 0) -
      (itemTriggerKindRanks.get(right.kind) ?? 0) ||
    compareCodeUnits(left.spellKey, right.spellKey) ||
    (left.chance ?? -1) - (right.chance ?? -1) ||
    left.delay - right.delay ||
    left.duration - right.duration ||
    Number(left.unresistable) - Number(right.unresistable) ||
    compareCodeUnits(left.monsterTaxonomy ?? "", right.monsterTaxonomy ?? "") ||
    compareCodeUnits(
      left.sourceFlags
        .map((flag) => `${flag.sourceKey}\u0000${flag.value}`)
        .join("\u0000"),
      right.sourceFlags
        .map((flag) => `${flag.sourceKey}\u0000${flag.value}`)
        .join("\u0000"),
    )
  );
}

function parseDirectSpellTriggers(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  ownerLabel: "item" | "ability",
): SpellTrigger[] {
  const triggers: SpellTrigger[] = [];
  const addTriggers = (
    children: readonly XmlRecord[],
    kind: ItemTriggerKind,
    referenceAttributes: readonly string[],
  ) => {
    for (const child of children) {
      const trigger = parseSpellTrigger(
        child,
        kind,
        referenceAttributes,
        context,
        provenance,
        currentEntityId,
        ownerLabel,
      );
      if (trigger) {
        triggers.push(trigger);
      }
    }
  };

  for (const spec of directItemTriggerSpecs) {
    const children = xmlChildren(record, spec.childName);
    for (const child of children) {
      reportUnknownLeafContent(
        context,
        child,
        spec.childName,
        directSpellTriggerAttributes,
        provenance,
        currentEntityId,
        true,
      );
    }
    addTriggers(children, spec.kind, ["name", "spell"]);
  }
  for (const effect of xmlChildren(record, "effect")) {
    const kind = effectTriggerKinds[xmlAttribute(effect, "type") ?? ""];
    if (kind) {
      addTriggers([effect], kind, ["name", "spell"]);
    }
  }

  return triggers.sort(compareSpellTriggers);
}

function parseItemTriggers(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): ItemTrigger[] {
  const triggers = parseDirectSpellTriggers(
    record,
    context,
    provenance,
    currentEntityId,
    "item",
  );
  const addTriggers = (
    children: readonly XmlRecord[],
    kind: ItemTriggerKind,
    referenceAttributes: readonly string[],
  ) => {
    for (const child of children) {
      const trigger = parseSpellTrigger(
        child,
        kind,
        referenceAttributes,
        context,
        provenance,
        currentEntityId,
        "item",
      );
      if (trigger) {
        triggers.push(trigger);
      }
    }
  };

  const food = xmlChildren(record, "food");
  const foodKind = food.some((child) => xmlAttribute(child, "hp") !== undefined)
    ? "eaten"
    : food.some((child) => xmlAttribute(child, "mp") !== undefined)
      ? "drunk"
      : undefined;
  if (foodKind) {
    addTriggers(
      food.filter((child) => xmlAttribute(child, "effect") !== undefined),
      foodKind,
      ["effect"],
    );
  }
  addTriggers(xmlChildren(record, "trap"), "stepped-on", ["casts"]);
  addTriggers(xmlChildren(record, "wand"), "zapped", ["spell"]);
  const potions = xmlChildren(record, "potion");
  for (const potion of potions) {
    reportUnknownLeafContent(
      context,
      potion,
      "potion",
      new Set(["spell"]),
      provenance,
      currentEntityId,
      true,
    );
  }
  addTriggers(potions, "quaffed", ["spell"]);
  if (Object.hasOwn(record, "mushroom")) {
    for (const mushroom of xmlChildren(record, "mushroom")) {
      reportUnknownLeafContent(
        context,
        mushroom,
        "mushroom",
        new Set(),
        provenance,
        currentEntityId,
        true,
      );
    }
    const casts = xmlChildren(record, "casts");
    if (casts.length === 0) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_mushroom_cast",
        message:
          "A mushroom item has no casts declaration; its spell trigger is unavailable.",
        source: provenance,
        entityId: currentEntityId,
      });
    }
    for (const cast of casts) {
      reportUnknownLeafContent(
        context,
        cast,
        "casts",
        new Set(["spell"]),
        provenance,
        currentEntityId,
        true,
      );
    }
    addTriggers(casts, "munched", ["spell"]);
  }
  addTriggers(
    xmlChildren(record, "weapon").filter(
      (child) => xmlAttribute(child, "hit") !== undefined,
    ),
    "item-hit",
    ["hit"],
  );

  return triggers.sort(compareSpellTriggers);
}

function booleanAttribute(
  record: XmlRecord,
  name: string,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
): boolean {
  const value = xmlAttribute(record, name);
  if (value === undefined || value === "0" || value === "false") {
    return false;
  }
  if (value === "1" || value === "true") {
    return true;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_boolean",
    message: `Expected 0, 1, false, or true for ${field}; used false instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return false;
}

function optionalBooleanAttribute(
  record: XmlRecord,
  name: string,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
): boolean | null {
  const value = xmlAttribute(record, name);
  if (value === undefined) {
    return null;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_boolean",
    message: `Expected 0, 1, false, or true for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return null;
}

function optionalBinaryBooleanAttribute(
  record: XmlRecord,
  name: string,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
): boolean | null {
  const value = xmlAttribute(record, name);
  if (value === undefined) {
    return null;
  }
  if (value === "1") {
    return true;
  }
  if (value === "0") {
    return false;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_boolean",
    message: `Expected 0 or 1 for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return null;
}

function integerValue(
  value: string | undefined,
  fallback: number,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
  minimum?: number,
  maximum?: number,
): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = parseSourceInteger(value);
  if (
    parsed !== null &&
    (minimum === undefined || parsed >= minimum) &&
    (maximum === undefined || parsed <= maximum)
  ) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected ${minimum === undefined ? "an integer" : maximum === undefined ? `an integer greater than or equal to ${minimum}` : `an integer from ${minimum} to ${maximum}`} for ${field}; used ${fallback} instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return fallback;
}

function optionalIntegerValue(
  value: string | undefined,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
  minimum?: number,
  maximum?: number,
): number | null {
  if (value === undefined || value === "") {
    return null;
  }

  const parsed = parseSourceInteger(value);
  if (
    parsed !== null &&
    (minimum === undefined || parsed >= minimum) &&
    (maximum === undefined || parsed <= maximum)
  ) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected ${minimum === undefined ? "an integer" : maximum === undefined ? `an integer greater than or equal to ${minimum}` : `an integer from ${minimum} to ${maximum}`} for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return null;
}

function numberValue(
  value: string | undefined,
  fallback: number,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
  minimum?: number,
  maximum?: number,
): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = parseSourceNumber(value);
  if (
    parsed !== null &&
    (minimum === undefined || parsed >= minimum) &&
    (maximum === undefined || parsed <= maximum)
  ) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected ${minimum === undefined ? "a finite number" : maximum === undefined ? `a number greater than or equal to ${minimum}` : `a number from ${minimum} to ${maximum}`} for ${field}; used ${fallback} instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return fallback;
}

function optionalNumberValue(
  value: string | undefined,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
  minimum?: number,
  maximum?: number,
): number | null {
  if (value === undefined || value === "") {
    return null;
  }

  const parsed = parseSourceNumber(value);
  if (
    parsed !== null &&
    (minimum === undefined || parsed >= minimum) &&
    (maximum === undefined || parsed <= maximum)
  ) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected ${minimum === undefined ? "a finite number" : maximum === undefined ? `a number greater than or equal to ${minimum}` : `a number from ${minimum} to ${maximum}`} for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return null;
}

function provenanceFor(
  context: NormalizationContext,
  record: XmlRecord,
  name: string,
  originalId?: string,
): EntityProvenance {
  return {
    ...context.parsed.locateRecord(record),
    originalName: name,
    ...(originalId ? { originalId } : {}),
  };
}

function baseEntity<K extends EntityKind>(
  kind: K,
  name: string,
  description: string,
  provenance: EntityProvenance,
): Omit<NormalizedEntityBase, "kind"> & { kind: K } {
  return {
    id: entityId(kind, name),
    kind,
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description,
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

function normalizeAssetPath(
  value: string | undefined,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  try {
    assertSafeRelativePath(normalized);
    for (const assetRoot of context.assetRoots) {
      const absolutePath = resolveExistingWithin(
        assetRoot.absolutePath,
        normalized,
      );
      if (existsSync(absolutePath)) {
        context.registerInput(
          absolutePath,
          toPosixPath(`${assetRoot.displayPath}/${normalized}`),
        );
        return normalized;
      }
    }

    context.diagnostics.push({
      severity: "warning",
      code: "missing_asset",
      message: `Referenced asset does not exist: ${normalized}`,
      source: provenance,
      entityId: currentEntityId,
      details: { assetPath: normalized },
    });
    return normalized;
  } catch (error) {
    if (!(error instanceof PathBoundaryError)) {
      throw error;
    }
    context.diagnostics.push({
      severity: "error",
      code: "unsafe_asset_path",
      message: error.message,
      source: provenance,
      entityId: currentEntityId,
      details: { assetPath: normalized },
    });
    return null;
  }
}

function normalizeMonsterIconPath(
  value: string | undefined,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): string | null {
  const iconPath = normalizeAssetPath(
    value,
    context,
    provenance,
    currentEntityId,
  );
  if (iconPath === null || !iconPath.toLowerCase().endsWith(".xml")) {
    return iconPath;
  }

  for (const assetRoot of context.assetRoots) {
    const absoluteSpritePath = resolveExistingWithin(
      assetRoot.absolutePath,
      iconPath,
    );
    if (!existsSync(absoluteSpritePath)) {
      continue;
    }
    const spriteSnapshot = context.registerInput(
      absoluteSpritePath,
      toPosixPath(`${assetRoot.displayPath}/${iconPath}`),
    );
    const frame = firstMonsterFramePath(spriteSnapshot.bytes, iconPath);
    if (!frame.ok) {
      context.diagnostics.push({
        severity: "warning",
        code: "invalid_monster_sprite_wrapper",
        message: frame.message,
        source: provenance,
        entityId: currentEntityId,
        details: { assetPath: iconPath },
      });
      return iconPath;
    }

    try {
      const absoluteFramePath = resolveExistingWithin(
        assetRoot.absolutePath,
        frame.path,
      );
      if (!existsSync(absoluteFramePath)) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_monster_sprite_frame",
          message: `The first frame referenced by the monster sprite wrapper does not exist: ${frame.path}`,
          source: provenance,
          entityId: currentEntityId,
          details: { assetPath: iconPath, framePath: frame.path },
        });
        return iconPath;
      }
      context.registerInput(
        absoluteFramePath,
        toPosixPath(`${assetRoot.displayPath}/${frame.path}`),
      );
    } catch (error) {
      if (!(error instanceof PathBoundaryError)) {
        throw error;
      }
      context.diagnostics.push({
        severity: "error",
        code: "unsafe_asset_path",
        message: error.message,
        source: provenance,
        entityId: currentEntityId,
        details: { assetPath: frame.path },
      });
    }
    return iconPath;
  }

  return iconPath;
}

function normalizeMonsterPaletteName(
  value: string | undefined,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): string | null {
  if (!value) {
    return null;
  }
  return value.toLowerCase().endsWith(".pal")
    ? normalizeAssetPath(value, context, provenance, currentEntityId)
    : value;
}

function reportUnknownChildren(
  context: NormalizationContext,
  record: XmlRecord,
  allowedChildren: ReadonlySet<string>,
  currentEntityId: string,
  partiallySupportedChildren: ReadonlySet<string> = new Set(),
): void {
  for (const key of Object.keys(record).sort((left, right) =>
    compareCodeUnits(left, right),
  )) {
    if (key.startsWith("@") || allowedChildren.has(key)) {
      continue;
    }

    const partiallySupported = partiallySupportedChildren.has(key);
    context.diagnostics.push({
      severity: "warning",
      code: partiallySupported
        ? "partially_supported_element"
        : "unknown_element",
      message: partiallySupported
        ? `Supported fields from <${key}> were normalized, but other content remains unmodeled.`
        : `Unsupported <${key}> element was preserved only as a diagnostic.`,
      source: context.parsed.locateChildElement(record, key),
      entityId: currentEntityId,
      details: { element: key },
    });
  }
}

function reportUnknownAttributes(
  context: NormalizationContext,
  record: XmlRecord,
  elementName: string,
  allowedAttributes: ReadonlySet<string>,
  provenance: EntityProvenance,
  currentEntityId: string,
  includeValue = false,
): void {
  for (const key of Object.keys(record).sort((left, right) =>
    compareCodeUnits(left, right),
  )) {
    if (!key.startsWith("@")) {
      continue;
    }
    const attribute = key.slice(1);
    if (allowedAttributes.has(attribute)) {
      continue;
    }
    context.diagnostics.push({
      severity: "warning",
      code: "unknown_attribute",
      message: `Unsupported ${elementName} attribute ${attribute} was preserved only as a diagnostic.`,
      source: provenance,
      entityId: currentEntityId,
      details: {
        element: elementName,
        attribute,
        ...(includeValue
          ? { value: xmlAttribute(record, attribute) ?? "" }
          : {}),
      },
    });
  }
}

function reportUnknownLeafContent(
  context: NormalizationContext,
  record: XmlRecord,
  elementName: string,
  allowedAttributes: ReadonlySet<string>,
  provenance: EntityProvenance,
  currentEntityId: string,
  includeAttributeValues = false,
): void {
  reportUnknownAttributes(
    context,
    record,
    elementName,
    allowedAttributes,
    provenance,
    currentEntityId,
    includeAttributeValues,
  );
  reportUnknownChildren(context, record, new Set(), currentEntityId);
}

function addCandidate<
  T extends
    | Item
    | Recipe
    | Encrustment
    | Skill
    | Ability
    | Spell
    | Monster
    | Stat
    | Template,
>(collection: EntityCandidate<T>[], entity: T, precedence: number): void {
  collection.push({ entity, precedence });
}

function parseItems(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "item")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "An <item> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }

    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("item", name);
    const priceText = childAttribute(record, "price", "amount");
    const price = priceText
      ? integerValue(
          priceText,
          0,
          context,
          provenance,
          "price",
          currentEntityId,
          0,
        )
      : null;
    const stats = xmlChildren(record, "stat")
      .map((stat) => {
        const statName = xmlAttribute(stat, "name");
        if (!statName) {
          return null;
        }
        return {
          statKey: canonicalKey(statName),
          statName,
          amount: integerValue(
            xmlAttribute(stat, "amount"),
            0,
            context,
            provenance,
            `stat:${statName}`,
            currentEntityId,
          ),
        };
      })
      .filter((stat): stat is NonNullable<typeof stat> => stat !== null)
      .sort((left, right) => compareCodeUnits(left.statKey, right.statKey));
    const traps = parseItemTraps(record, context, provenance, currentEntityId);
    const armourDeclarations = parseItemArmourDeclarations(
      record,
      context,
      provenance,
      currentEntityId,
    );
    const weaponDeclarations = parseItemWeaponDeclarations(
      record,
      context,
      provenance,
      currentEntityId,
    );
    const macguffinDeclarations = parseItemMacguffinDeclarations(
      record,
      context,
      provenance,
      currentEntityId,
    );
    const toolkitDeclarations = parseItemToolkitDeclarations(
      record,
      context,
      provenance,
      currentEntityId,
    );
    validateItemGemMarkers(record, context, provenance, currentEntityId);

    const item: Item = {
      ...baseEntity(
        "item",
        name,
        childAttribute(record, "description", "text") ?? "",
        provenance,
      ),
      category: itemCategory(record),
      price,
      quality:
        traps.length > 0
          ? (traps[0]?.level ?? 0)
          : armourDeclarations.length > 0
            ? (armourDeclarations[0]?.level ?? 0)
            : integerValue(
                itemQualityAttribute(record),
                0,
                context,
                provenance,
                "item quality",
                currentEntityId,
                0,
              ),
      artifacts: parseItemArtifacts(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      armourDeclarations,
      weaponDeclarations,
      macguffinDeclarations,
      toolkitDeclarations,
      recoveries: parseItemRecoveries(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      chargeRanges: parseItemChargeRanges(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      traps,
      iconPath: normalizeAssetPath(
        xmlAttribute(record, "iconFile"),
        context,
        provenance,
        currentEntityId,
      ),
      stats,
      modifiers: parseItemStatModifiers(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      triggers: parseItemTriggers(record, context, provenance, currentEntityId),
    };
    reportUnknownChildren(
      context,
      record,
      new Set([
        "artifact",
        "armour",
        "food",
        "gem",
        "macguffin",
        "mushroom",
        "potion",
        "trap",
        "toolkit",
        "wand",
        "weapon",
        ...(Object.hasOwn(record, "mushroom") ? ["casts"] : []),
        "description",
        "price",
        "stat",
        ...directItemTriggerSpecs.map((spec) => spec.childName),
        ...matchingStatModifierElementNames(record),
      ]),
      currentEntityId,
      partiallySupportedItemChildren,
    );
    addCandidate(result.items, item, context.source.precedence);
  }
}

function parseRecipes(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "craft")) {
    const outputRecords = xmlChildren(record, "output");
    const fallbackName = outputRecords[0]
      ? `${xmlAttribute(outputRecords[0], "name") ?? "Unnamed"} Recipe`
      : "Unnamed Recipe";
    const name = xmlAttribute(record, "name") ?? fallbackName;
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("recipe", name);
    const references = (children: XmlRecord[]) =>
      children
        .map((child) => {
          const itemName = xmlAttribute(child, "name");
          if (!itemName) {
            return null;
          }
          return {
            itemKey: canonicalKey(itemName),
            itemName,
            amount: integerValue(
              xmlAttribute(child, "amount"),
              1,
              context,
              provenance,
              "recipe amount",
              currentEntityId,
              1,
            ),
          };
        })
        .filter(
          (reference): reference is NonNullable<typeof reference> =>
            reference !== null,
        );
    const outputs = outputRecords
      .map((output) => {
        const [reference] = references([output]);
        if (!reference) {
          return null;
        }
        return {
          ...reference,
          skillLevel: integerValue(
            xmlAttribute(output, "skill"),
            0,
            context,
            provenance,
            "skill",
            currentEntityId,
            0,
          ),
        };
      })
      .filter(
        (output): output is NonNullable<typeof output> => output !== null,
      );
    const recipe: Recipe = {
      ...baseEntity("recipe", name, "", provenance),
      tool: childAttribute(record, "tool", "tag") ?? "unknown",
      hidden: booleanAttribute(
        record,
        "hidden",
        context,
        provenance,
        "recipe hidden",
        currentEntityId,
      ),
      skillLevel: Math.max(0, ...outputs.map((output) => output.skillLevel)),
      inputs: references(xmlChildren(record, "input")),
      outputs,
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["tool", "input", "output"]),
      currentEntityId,
    );
    addCandidate(result.recipes, recipe, context.source.precedence);
  }
}

const statModifierDamageKeys = new Set<string>(damageSourceKeys);

const statModifierElementNames = [
  "damagebuff",
  "resistbuff",
  "damage",
  "resistances",
  "primarybuff",
  "secondarybuff",
] as const;

type StatModifierElementName = (typeof statModifierElementNames)[number];

function matchingStatModifierElementNames(record: XmlRecord): string[] {
  const canonicalNames = new Set(statModifierElementNames);
  return Object.keys(record).filter((key) =>
    canonicalNames.has(key.toLocaleLowerCase("en") as StatModifierElementName),
  );
}

function statModifierChildren(
  record: XmlRecord,
  childName: StatModifierElementName,
): XmlRecord[] {
  return matchingStatModifierElementNames(record)
    .filter(
      (key) =>
        key.toLocaleLowerCase("en") === childName.toLocaleLowerCase("en"),
    )
    .flatMap((key) => xmlChildren(record, key));
}

const statModifierKindRanks: Readonly<Record<StatModifierKind, number>> = {
  damage: 0,
  resistance: 1,
  primary: 2,
  secondary: 3,
};

function parseStatModifiers(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  ownerLabel: "ability" | "encrustment" | "item" | "monster" | "spell_buff",
): StatModifier[] {
  const modifiers: StatModifier[] = [];
  const ownerDescription =
    ownerLabel === "spell_buff" ? "spell buff" : ownerLabel;
  const ownerArticle =
    ownerDescription === "ability" ||
    ownerDescription === "encrustment" ||
    ownerDescription === "item"
      ? "An"
      : "A";
  const addAttributeModifiers = (
    childName: "damagebuff" | "resistbuff" | "damage" | "resistances",
    kind: "damage" | "resistance",
  ) => {
    for (const child of statModifierChildren(record, childName)) {
      for (const [attribute, value] of Object.entries(child)) {
        if (!attribute.startsWith("@") || typeof value !== "string") {
          continue;
        }
        const sourceKey = attribute.slice(1);
        if (!statModifierDamageKeys.has(sourceKey)) {
          context.diagnostics.push({
            severity: "warning",
            code: `unknown_${ownerLabel}_modifier`,
            message: `Unsupported ${ownerDescription} ${kind} modifier key: ${sourceKey}.`,
            source: provenance,
            entityId: currentEntityId,
            details: { modifierKind: kind, sourceKey },
          });
          continue;
        }
        modifiers.push({
          kind,
          sourceKey,
          amount: numberValue(
            value,
            0,
            context,
            provenance,
            `${ownerDescription} ${kind}:${sourceKey}`,
            currentEntityId,
          ),
        });
      }
    }
  };
  addAttributeModifiers(
    ownerLabel === "monster" ? "damage" : "damagebuff",
    "damage",
  );
  addAttributeModifiers(
    ownerLabel === "monster" ? "resistances" : "resistbuff",
    "resistance",
  );

  const addIndexedModifiers = (
    childName: "primarybuff" | "secondarybuff",
    kind: "primary" | "secondary",
  ) => {
    for (const child of statModifierChildren(record, childName)) {
      const sourceKey = xmlAttribute(child, "id");
      if (!sourceKey) {
        context.diagnostics.push({
          severity: "warning",
          code: `missing_${ownerLabel}_modifier_key`,
          message: `${ownerArticle} ${ownerDescription} ${kind} modifier is missing its source stat ID.`,
          source: provenance,
          entityId: currentEntityId,
          details: { modifierKind: kind },
        });
        continue;
      }
      modifiers.push({
        kind,
        sourceKey,
        amount: numberValue(
          xmlAttribute(child, "amount"),
          0,
          context,
          provenance,
          `${ownerDescription} ${kind}:${sourceKey}`,
          currentEntityId,
        ),
      });
    }
  };
  addIndexedModifiers("primarybuff", "primary");
  addIndexedModifiers("secondarybuff", "secondary");

  let normalizedModifiers = modifiers;
  if (ownerLabel === "monster") {
    const overrides = new Map<string, StatModifier>();
    for (const modifier of modifiers) {
      const overrideKey = `${modifier.kind}:${modifier.sourceKey}`;
      const previous = overrides.get(overrideKey);
      if (previous) {
        context.diagnostics.push({
          severity: "warning",
          code: "duplicate_monster_modifier",
          message: `Duplicate monster ${modifier.kind} modifier ${modifier.sourceKey}; the last declaration overrides the earlier value.`,
          source: provenance,
          entityId: currentEntityId,
          details: {
            modifierKind: modifier.kind,
            sourceKey: modifier.sourceKey,
            overriddenAmount: previous.amount,
            replacementAmount: modifier.amount,
          },
        });
      }
      overrides.set(overrideKey, modifier);
    }
    normalizedModifiers = [...overrides.values()];
  }

  return normalizedModifiers.sort(
    (left, right) =>
      statModifierKindRanks[left.kind] - statModifierKindRanks[right.kind] ||
      compareCodeUnits(left.sourceKey, right.sourceKey) ||
      left.amount - right.amount,
  );
}

function parseItemStatModifiers(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): StatModifier[] {
  const modifiers = parseStatModifiers(
    record,
    context,
    provenance,
    currentEntityId,
    "item",
  );

  for (const weapon of xmlChildren(record, "weapon")) {
    for (const [attribute, value] of Object.entries(weapon)) {
      if (!attribute.startsWith("@") || typeof value !== "string") {
        continue;
      }
      const sourceKey = attribute.slice(1);
      if (!statModifierDamageKeys.has(sourceKey)) {
        continue;
      }
      modifiers.push({
        kind: "damage",
        sourceKey,
        amount: numberValue(
          value,
          0,
          context,
          provenance,
          `item weapon damage:${sourceKey}`,
          currentEntityId,
        ),
      });
    }
  }

  return modifiers.sort(
    (left, right) =>
      statModifierKindRanks[left.kind] - statModifierKindRanks[right.kind] ||
      compareCodeUnits(left.sourceKey, right.sourceKey) ||
      left.amount - right.amount,
  );
}

function parseItemArtifacts(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): ItemArtifactMetadata[] {
  const rawArtifacts = Object.hasOwn(record, "artifact")
    ? Array.isArray(record.artifact)
      ? record.artifact
      : [record.artifact]
    : [];
  return rawArtifacts.map((rawArtifact, artifactIndex) => {
    const artifact = isXmlRecord(rawArtifact) ? rawArtifact : {};
    reportUnknownLeafContent(
      context,
      artifact,
      "artifact",
      new Set(["quality"]),
      provenance,
      currentEntityId,
      true,
    );
    return {
      quality: optionalIntegerValue(
        xmlAttribute(artifact, "quality"),
        context,
        provenance,
        `item artifact ${artifactIndex + 1} quality`,
        currentEntityId,
        0,
      ),
    };
  });
}

function parseEncrustmentPowers(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): EncrustmentPower[] {
  return xmlChildren(record, "power")
    .map((power) => {
      const name = xmlAttribute(power, "name");
      if (!name) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_encrustment_power_name",
          message: "An encrustment power hook is missing its name.",
          source: provenance,
          entityId: currentEntityId,
        });
        return null;
      }
      const chance = xmlAttribute(power, "chance");
      return {
        name,
        chance:
          chance === undefined
            ? null
            : numberValue(
                chance,
                0,
                context,
                provenance,
                `encrustment power chance:${name}`,
                currentEntityId,
                0,
                1,
              ),
      };
    })
    .filter((power): power is EncrustmentPower => power !== null)
    .sort(
      (left, right) =>
        compareCodeUnits(left.name, right.name) ||
        (left.chance ?? -1) - (right.chance ?? -1),
    );
}

function parseEncrustments(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "encrust")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "An <encrust> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }

    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("encrustment", name);
    const inputRecords = xmlChildren(record, "input");
    const inputs = inputRecords
      .map((input) => {
        const itemName = xmlAttribute(input, "name");
        if (!itemName) {
          return null;
        }
        return {
          itemKey: canonicalKey(itemName),
          itemName,
          amount: integerValue(
            xmlAttribute(input, "amount"),
            1,
            context,
            provenance,
            "encrustment ingredient amount",
            currentEntityId,
            1,
          ),
        };
      })
      .filter(
        (reference): reference is NonNullable<typeof reference> =>
          reference !== null,
      );
    const skillLevel = Math.max(
      0,
      ...xmlChildren(record, "skill").map((skill) =>
        integerValue(
          xmlAttribute(skill, "level"),
          0,
          context,
          provenance,
          "encrustment skill level",
          currentEntityId,
          0,
        ),
      ),
    );
    const slots = [
      ...new Set(
        xmlChildren(record, "slot")
          .map((slot) => xmlAttribute(slot, "type"))
          .filter((value): value is string => Boolean(value))
          .map(canonicalKey),
      ),
    ].sort((left, right) => compareCodeUnits(left, right));
    const tool =
      childAttribute(record, "tool", "tag") ??
      xmlAttribute(record, "tool") ??
      "unknown";
    const encrustment: Encrustment = {
      ...baseEntity(
        "encrustment",
        name,
        childAttribute(record, "description", "text") ?? "",
        provenance,
      ),
      tool,
      hidden: booleanAttribute(
        record,
        "hidden",
        context,
        provenance,
        "encrustment hidden",
        currentEntityId,
      ),
      skillLevel,
      inputs,
      slots,
      instability: integerValue(
        childAttribute(record, "instability", "amount"),
        0,
        context,
        provenance,
        "encrustment instability",
        currentEntityId,
      ),
      modifiers: parseStatModifiers(
        record,
        context,
        provenance,
        currentEntityId,
        "encrustment",
      ),
      powers: parseEncrustmentPowers(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      appearanceDescriptors: xmlChildren(record, "encrustwith")
        .map((descriptor) => xmlAttribute(descriptor, "name"))
        .filter((value): value is string => Boolean(value)),
    };
    reportUnknownChildren(
      context,
      record,
      new Set([
        "description",
        "tool",
        "input",
        "skill",
        "slot",
        "instability",
        ...matchingStatModifierElementNames(record),
        "power",
        "encrustwith",
      ]),
      currentEntityId,
    );
    addCandidate(result.encrustments, encrustment, context.source.precedence);
  }

  for (const record of collectElements(
    context.parsed.document,
    "unstableEffect",
  )) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_instability_effect_name",
        message: "An unstable encrustment effect is missing its name.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }

    const provenance = provenanceFor(context, record, name);
    const spellName = xmlAttribute(record, "spell");
    if (!spellName) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_instability_effect_spell",
        message: `Unstable encrustment effect ${name} is missing its spell reference.`,
        source: provenance,
        details: { instabilityEffectName: name },
      });
      continue;
    }

    result.encrustmentInstabilityEffects.push({
      name,
      spellKey: canonicalKey(spellName),
      spellName,
      provenance,
    });
  }
}

function parseSourceFlags(record: XmlRecord): SourceFlag[] {
  return xmlChildren(record, "flags")
    .flatMap((flags) =>
      Object.entries(flags).flatMap(([attribute, value]) =>
        attribute.startsWith("@") && typeof value === "string"
          ? [{ sourceKey: attribute.slice(1), value }]
          : [],
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.sourceKey, right.sourceKey) ||
        compareCodeUnits(left.value, right.value),
    );
}

function parseSkillProgressionTags(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SkillProgressionTag[] {
  return xmlChildren(record, "tag")
    .flatMap((tag) => {
      const name = xmlAttribute(tag, "name");
      if (!name) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_skill_tag_name",
          message: "A skill progression tag is missing its name.",
          source: provenance,
          entityId: currentEntityId,
        });
        return [];
      }
      return [
        {
          name,
          level: integerValue(
            xmlAttribute(tag, "level"),
            0,
            context,
            provenance,
            `skill progression tag:${name}`,
            currentEntityId,
            0,
          ),
        },
      ];
    })
    .sort(
      (left, right) =>
        left.level - right.level || compareCodeUnits(left.name, right.name),
    );
}

function parseAbilityNumericMetadata(
  record: XmlRecord,
  childName: "recoverybuff" | "zorkmidbuff",
  attributeName: "amount" | "percent",
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): number[] {
  return xmlChildren(record, childName)
    .flatMap((child) => {
      const value = xmlAttribute(child, attributeName);
      if (value === undefined) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_ability_metadata_value",
          message: `An ability <${childName}> is missing its ${attributeName} value.`,
          source: provenance,
          entityId: currentEntityId,
          details: { element: childName, field: attributeName },
        });
        return [];
      }
      return [
        numberValue(
          value,
          0,
          context,
          provenance,
          `ability ${childName} ${attributeName}`,
          currentEntityId,
        ),
      ];
    })
    .sort((left, right) => left - right);
}

function parseSkills(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "skill")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "A <skill> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("skill", name);
    const loadouts = xmlChildren(record, "loadout").map(
      (loadout): SkillLoadout => {
        const itemName = xmlAttribute(loadout, "subtype");
        const itemType = xmlAttribute(loadout, "type");
        const shared = {
          ...(itemType ? { itemType } : {}),
          amount: integerValue(
            xmlAttribute(loadout, "amount"),
            1,
            context,
            provenance,
            "skill loadout amount",
            currentEntityId,
            1,
          ),
          always: booleanAttribute(
            loadout,
            "always",
            context,
            provenance,
            "skill loadout always",
            currentEntityId,
          ),
        };
        return itemName
          ? {
              ...shared,
              itemKey: canonicalKey(itemName),
              itemName,
              itemResolution: unresolvedRelationship("item", itemName),
            }
          : shared;
      },
    );
    const skill: Skill = {
      ...baseEntity(
        "skill",
        name,
        xmlAttribute(record, "description") ?? "",
        provenance,
      ),
      archetype: xmlAttribute(record, "type") ?? "unknown",
      iconPath: normalizeAssetPath(
        childAttribute(record, "art", "icon"),
        context,
        provenance,
        currentEntityId,
      ),
      loadouts,
      loadoutItemKeys: loadouts
        .flatMap((loadout) => (loadout.itemKey ? [loadout.itemKey] : []))
        .sort((left, right) => compareCodeUnits(left, right)),
      sourceFlags: parseSourceFlags(record),
      progressionTags: parseSkillProgressionTags(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      abilityIds: [],
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["art", "loadout", "flags", "tag"]),
      currentEntityId,
    );
    addCandidate(result.skills, skill, context.source.precedence);
  }

  for (const record of collectElements(context.parsed.document, "ability")) {
    const name = xmlAttribute(record, "name");
    const skillReference = xmlAttribute(record, "skill");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "An <ability> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }
    if (!skillReference) {
      const provenance = provenanceFor(
        context,
        record,
        name,
        xmlAttribute(record, "id"),
      );
      context.diagnostics.push({
        severity: "error",
        code: "missing_required_reference",
        message: `Ability ${name} is missing its required skill reference.`,
        source: provenance,
        entityId: entityId("ability", name),
        details: { field: "skill" },
      });
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("ability", name);
    const triggers = parseDirectSpellTriggers(
      record,
      context,
      provenance,
      currentEntityId,
      "ability",
    );
    const modifiers = parseStatModifiers(
      record,
      context,
      provenance,
      currentEntityId,
      "ability",
    );
    const ability: Ability = {
      ...baseEntity(
        "ability",
        name,
        childAttribute(record, "description", "text") ?? "",
        provenance,
      ),
      skillKey: canonicalKey(skillReference),
      iconPath: normalizeAssetPath(
        xmlAttribute(record, "icon"),
        context,
        provenance,
        currentEntityId,
      ),
      level: integerValue(
        xmlAttribute(record, "level"),
        0,
        context,
        provenance,
        "ability level",
        currentEntityId,
        0,
      ),
      startSkill: booleanAttribute(
        record,
        "startSkill",
        context,
        provenance,
        "ability start skill",
        currentEntityId,
      ),
      modifiers,
      sourceFlags: parseSourceFlags(record),
      recoveryBuffAmounts: parseAbilityNumericMetadata(
        record,
        "recoverybuff",
        "amount",
        context,
        provenance,
        currentEntityId,
      ),
      currencyBuffPercents: parseAbilityNumericMetadata(
        record,
        "zorkmidbuff",
        "percent",
        context,
        provenance,
        currentEntityId,
      ),
      triggers,
      spellKeys: triggers
        .map((trigger) => trigger.spellKey)
        .sort((left, right) => compareCodeUnits(left, right)),
      spellIds: [],
    };
    reportUnknownChildren(
      context,
      record,
      new Set([
        "description",
        "flags",
        "recoverybuff",
        "zorkmidbuff",
        ...matchingStatModifierElementNames(record),
        ...directItemTriggerSpecs.map((spec) => spec.childName),
      ]),
      currentEntityId,
      new Set(["effect"]),
    );
    addCandidate(result.abilities, ability, context.source.precedence);
  }
}

const spellFramePresentationAttributes = new Set([
  "sprite",
  "frames",
  "num",
  "framerate",
  "firstframe",
  "first",
  "centerEffect",
  "centereffect",
  "sync",
  "sfx",
]);

function normalizeAssetReference(
  value: string | undefined,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  try {
    assertSafeRelativePath(normalized);
    return normalized;
  } catch (error) {
    if (!(error instanceof PathBoundaryError)) {
      throw error;
    }
    context.diagnostics.push({
      severity: "error",
      code: "unsafe_asset_path",
      message: error.message,
      source: provenance,
      entityId: currentEntityId,
      details: { assetPath: normalized },
    });
    return null;
  }
}

function spellFramePresentationRecords(
  record: XmlRecord,
  elementName: "anim" | "impact",
): XmlRecord[] {
  const value = record[elementName];
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellAnimations(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellAnimationMetadata[] {
  return parseSpellFramePresentation(
    record,
    "anim",
    "animation",
    "missing_spell_animation_sprite",
    context,
    provenance,
    currentEntityId,
  );
}

function parseSpellImpacts(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellImpactMetadata[] {
  return parseSpellFramePresentation(
    record,
    "impact",
    "impact",
    "missing_spell_impact_sprite",
    context,
    provenance,
    currentEntityId,
  );
}

function parseSpellFramePresentation(
  record: XmlRecord,
  elementName: "anim" | "impact",
  declarationLabel: "animation" | "impact",
  missingSpriteCode:
    "missing_spell_animation_sprite" | "missing_spell_impact_sprite",
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellAnimationMetadata[] {
  return spellFramePresentationRecords(record, elementName).map(
    (declaration, declarationIndex) => {
      reportUnknownLeafContent(
        context,
        declaration,
        elementName,
        spellFramePresentationAttributes,
        provenance,
        currentEntityId,
        true,
      );

      const spritePath = normalizeAssetReference(
        xmlAttribute(declaration, "sprite"),
        context,
        provenance,
        currentEntityId,
      );
      if (!xmlAttribute(declaration, "sprite")) {
        context.diagnostics.push({
          severity: "warning",
          code: missingSpriteCode,
          message: `Spell ${declarationLabel} ${declarationIndex + 1} is missing its sprite reference.`,
          source: provenance,
          entityId: currentEntityId,
          details: { [`${declarationLabel}Index`]: declarationIndex },
        });
      }

      const optionalPresentationInteger = (
        value: string | undefined,
        field: string,
      ): number | null =>
        optionalIntegerValue(
          value,
          context,
          provenance,
          `spell ${declarationLabel} ${declarationIndex + 1} ${field}`,
          currentEntityId,
          0,
        );
      const centerAttribute =
        xmlAttribute(declaration, "centerEffect") === undefined &&
        xmlAttribute(declaration, "centereffect") !== undefined
          ? "centereffect"
          : "centerEffect";

      return {
        spritePath,
        frameCount: optionalPresentationInteger(
          xmlAttribute(declaration, "frames") ??
            xmlAttribute(declaration, "num"),
          "frame count",
        ),
        frameRate: optionalPresentationInteger(
          xmlAttribute(declaration, "framerate"),
          "frame rate",
        ),
        firstFrame: optionalPresentationInteger(
          xmlAttribute(declaration, "firstframe") ??
            xmlAttribute(declaration, "first"),
          "first frame",
        ),
        centered: optionalBooleanAttribute(
          declaration,
          centerAttribute,
          context,
          provenance,
          `spell ${declarationLabel} ${declarationIndex + 1} centered flag`,
          currentEntityId,
        ),
        synchronized: optionalBooleanAttribute(
          declaration,
          "sync",
          context,
          provenance,
          `spell ${declarationLabel} ${declarationIndex + 1} synchronized flag`,
          currentEntityId,
        ),
        soundEffect: xmlAttribute(declaration, "sfx") || null,
      };
    },
  );
}

const spellBuffSourceFlagAttributes = [
  "affectsCorpses",
  "destroyonmove",
  "digglegod",
  "insufficientFunds",
  "requiresShield",
  "tag",
] as const;

const spellBuffAttributes = new Set([
  "icon",
  "smallicon",
  "useTimer",
  "usetimer",
  "time",
  "manaUpkeep",
  "manaupkeep",
  "zorkmidUpkeep",
  "brittle",
  "attacks",
  "removable",
  "self",
  "resistable",
  "bad",
  "stackable",
  "allowstacking",
  "allowStacking",
  "stacksize",
  ...spellBuffSourceFlagAttributes,
]);

const spellBuffModifierElementNames = new Set([
  "damagebuff",
  "resistbuff",
  "primarybuff",
  "secondarybuff",
]);

const spellBuffEventHookSpecs = [
  {
    childName: "targetHitEffectBuff",
    kind: "target-hit",
    supportsAfter: true,
  },
  {
    childName: "playerHitEffectBuff",
    kind: "player-hit",
    supportsAfter: true,
  },
  { childName: "dodgebuff", kind: "dodge", supportsAfter: false },
] as const;

function spellBuffSightModifierRecords(buff: XmlRecord): XmlRecord[] {
  const value = buff.sightbuff;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

type SpellBuffAmountMarkerElement = "invisible" | "mute";

function spellBuffAmountMarkerRecords(
  buff: XmlRecord,
  elementName: SpellBuffAmountMarkerElement,
): XmlRecord[] {
  const value = buff[elementName];
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellBuffAmountMarkerDeclarations(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
  elementName: SpellBuffAmountMarkerElement,
  declarationLabel: string,
): { amount: number | null }[] {
  return spellBuffAmountMarkerRecords(buff, elementName).map(
    (declaration, declarationIndex) => {
      const declarationLocation =
        Object.keys(declaration).length === 0
          ? context.parsed.locateChildElement(buff, elementName)
          : context.parsed.locateRecord(declaration);
      const declarationProvenance = {
        ...provenance,
        ...declarationLocation,
      };
      reportUnknownLeafContent(
        context,
        declaration,
        elementName,
        new Set(["amount"]),
        declarationProvenance,
        currentEntityId,
        true,
      );

      const sourceAmount = xmlAttribute(declaration, "amount");
      if (sourceAmount !== undefined && sourceAmount.trim() === "") {
        context.diagnostics.push({
          severity: "warning",
          code: "invalid_number",
          message: `Expected an integer greater than or equal to 0 for spell buff ${buffIndex + 1} ${declarationLabel} declaration ${declarationIndex + 1} amount; used an unavailable value instead.`,
          source: declarationProvenance,
          entityId: currentEntityId,
          details: {
            field: `spell buff ${buffIndex + 1} ${declarationLabel} declaration ${declarationIndex + 1} amount`,
            value: sourceAmount,
          },
        });
        return { amount: null };
      }

      return {
        amount: optionalIntegerValue(
          sourceAmount,
          context,
          declarationProvenance,
          `spell buff ${buffIndex + 1} ${declarationLabel} declaration ${declarationIndex + 1} amount`,
          currentEntityId,
          0,
        ),
      };
    },
  );
}

function spellBuffSenseWallsRecords(buff: XmlRecord): XmlRecord[] {
  const value = buff.senseWallsFlag;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellBuffSenseWallsDeclarations(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffSenseWallsDeclaration[] {
  return spellBuffSenseWallsRecords(buff).map(
    (declaration, declarationIndex) => {
      const declarationLocation =
        Object.keys(declaration).length === 0
          ? context.parsed.locateChildElement(buff, "senseWallsFlag")
          : context.parsed.locateRecord(declaration);
      const declarationProvenance = {
        ...provenance,
        ...declarationLocation,
      };
      reportUnknownLeafContent(
        context,
        declaration,
        "senseWallsFlag",
        new Set(["amount"]),
        declarationProvenance,
        currentEntityId,
        true,
      );

      const sourceAmount = xmlAttribute(declaration, "amount");
      if (sourceAmount === undefined) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_spell_buff_sense_walls_amount",
          message: `Spell buff ${buffIndex + 1} wall-sensing declaration ${declarationIndex + 1} is missing its required source flag.`,
          source: declarationProvenance,
          entityId: currentEntityId,
          details: { buffIndex, declarationIndex },
        });
        return { enabled: null };
      }

      return {
        enabled: optionalBooleanAttribute(
          declaration,
          "amount",
          context,
          declarationProvenance,
          `spell buff ${buffIndex + 1} wall-sensing declaration ${declarationIndex + 1} source flag`,
          currentEntityId,
        ),
      };
    },
  );
}

function spellBuffPaybackRecords(buff: XmlRecord): XmlRecord[] {
  const value = buff.payback;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellBuffPaybackDeclarations(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffPaybackDeclaration[] {
  return spellBuffPaybackRecords(buff).map((declaration, declarationIndex) => {
    const declarationLocation =
      Object.keys(declaration).length === 0
        ? context.parsed.locateChildElement(buff, "payback")
        : context.parsed.locateRecord(declaration);
    const declarationProvenance = {
      ...provenance,
      ...declarationLocation,
    };
    reportUnknownLeafContent(
      context,
      declaration,
      "payback",
      new Set(["secondaryScale", "paybackF"]),
      declarationProvenance,
      currentEntityId,
      true,
    );

    const sourceSecondaryScale = xmlAttribute(declaration, "secondaryScale");
    if (sourceSecondaryScale === undefined) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_spell_buff_payback_secondary_scale",
        message: `Spell buff ${buffIndex + 1} payback declaration ${declarationIndex + 1} is missing its required secondaryScale source flag.`,
        source: declarationProvenance,
        entityId: currentEntityId,
        details: { buffIndex, declarationIndex },
      });
    }

    const sourceFactor = xmlAttribute(declaration, "paybackF");
    if (sourceFactor === undefined) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_spell_buff_payback_factor",
        message: `Spell buff ${buffIndex + 1} payback declaration ${declarationIndex + 1} is missing its required paybackF source factor.`,
        source: declarationProvenance,
        entityId: currentEntityId,
        details: { buffIndex, declarationIndex },
      });
    }

    return {
      secondaryScale: optionalBooleanAttribute(
        declaration,
        "secondaryScale",
        context,
        declarationProvenance,
        `spell buff ${buffIndex + 1} payback declaration ${declarationIndex + 1} secondaryScale source flag`,
        currentEntityId,
      ),
      factor: optionalNumberValue(
        sourceFactor,
        context,
        declarationProvenance,
        `spell buff ${buffIndex + 1} payback declaration ${declarationIndex + 1} paybackF source factor`,
        currentEntityId,
      ),
    };
  });
}

function spellBuffZorkmidAbsorptionRecords(buff: XmlRecord): XmlRecord[] {
  const value = buff.zorkmidAbsorption;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellBuffZorkmidAbsorptionDeclarations(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffZorkmidAbsorptionDeclaration[] {
  return spellBuffZorkmidAbsorptionRecords(buff).map(
    (declaration, declarationIndex) => {
      const declarationLocation =
        Object.keys(declaration).length === 0
          ? context.parsed.locateChildElement(buff, "zorkmidAbsorption")
          : context.parsed.locateRecord(declaration);
      const declarationProvenance = {
        ...provenance,
        ...declarationLocation,
      };
      reportUnknownLeafContent(
        context,
        declaration,
        "zorkmidAbsorption",
        new Set(["zorkmidsPerDamage", "damageCap", "maxRatio"]),
        declarationProvenance,
        currentEntityId,
        true,
      );

      const requiredAttribute = (attribute: string, field: string) => {
        const value = xmlAttribute(declaration, attribute);
        if (value === undefined) {
          context.diagnostics.push({
            severity: "warning",
            code: `missing_spell_buff_zorkmid_absorption_${field}`,
            message: `Spell buff ${buffIndex + 1} zorkmid-absorption declaration ${declarationIndex + 1} is missing its required ${attribute} source value.`,
            source: declarationProvenance,
            entityId: currentEntityId,
            details: { buffIndex, declarationIndex },
          });
        }
        return value;
      };

      const zorkmidsPerDamage = requiredAttribute(
        "zorkmidsPerDamage",
        "zorkmids_per_damage",
      );
      const damageCap = requiredAttribute("damageCap", "damage_cap");
      const maxRatio = requiredAttribute("maxRatio", "max_ratio");

      return {
        zorkmidsPerDamage: optionalIntegerValue(
          zorkmidsPerDamage,
          context,
          declarationProvenance,
          `spell buff ${buffIndex + 1} zorkmid-absorption declaration ${declarationIndex + 1} zorkmidsPerDamage source value`,
          currentEntityId,
          -128,
          127,
        ),
        damageCap: optionalIntegerValue(
          damageCap,
          context,
          declarationProvenance,
          `spell buff ${buffIndex + 1} zorkmid-absorption declaration ${declarationIndex + 1} damageCap source value`,
          currentEntityId,
          -128,
          127,
        ),
        maxRatio: optionalNumberValue(
          maxRatio,
          context,
          declarationProvenance,
          `spell buff ${buffIndex + 1} zorkmid-absorption declaration ${declarationIndex + 1} maxRatio source value`,
          currentEntityId,
        ),
      };
    },
  );
}

function spellBuffPolymorphRecords(buff: XmlRecord): XmlRecord[] {
  const value = buff.polymorph;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellBuffPolymorphDeclarations(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffPolymorphDeclaration[] {
  return spellBuffPolymorphRecords(buff).map(
    (declaration, declarationIndex) => {
      const declarationLocation =
        Object.keys(declaration).length === 0
          ? context.parsed.locateChildElement(buff, "polymorph")
          : context.parsed.locateRecord(declaration);
      const declarationProvenance = {
        ...provenance,
        ...declarationLocation,
      };
      reportUnknownLeafContent(
        context,
        declaration,
        "polymorph",
        new Set(["name"]),
        declarationProvenance,
        currentEntityId,
        true,
      );

      const sourceName = xmlAttribute(declaration, "name");
      const monsterName =
        sourceName === undefined || sourceName.trim() === ""
          ? null
          : sourceName;
      if (monsterName === null) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_spell_buff_polymorph_target",
          message: `Spell buff ${buffIndex + 1} polymorph declaration ${declarationIndex + 1} is missing its monster target.`,
          source: declarationProvenance,
          entityId: currentEntityId,
          details: { buffIndex, declarationIndex },
        });
      }

      return {
        monsterKey: monsterName === null ? null : canonicalKey(monsterName),
        monsterName,
      };
    },
  );
}

function parseSpellBuffDescriptions(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffDescription[] {
  return xmlChildren(buff, "description").map(
    (description, descriptionIndex) => {
      reportUnknownLeafContent(
        context,
        description,
        "description",
        new Set(["text"]),
        provenance,
        currentEntityId,
      );
      const text = xmlAttribute(description, "text");
      if (text === undefined) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_spell_buff_description_text",
          message: `Spell buff ${buffIndex + 1} description ${descriptionIndex + 1} is missing its text.`,
          source: context.parsed.locateRecord(description),
          entityId: currentEntityId,
          details: { buffIndex, descriptionIndex },
        });
      }
      return { text: text ?? null };
    },
  );
}

const spellBuffHaloAttributes = new Set([
  "centerEffect",
  "centereffect",
  "first",
  "frameRate",
  "framerate",
  "name",
  "num",
]);

function spellAiHintRecords(record: XmlRecord): XmlRecord[] {
  const value = record.ai;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellAiHints(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  scope: { buffIndex?: number } = {},
): SpellAiHintMetadata[] {
  return spellAiHintRecords(record).map((aiHint, hintIndex) => {
    const sourceLocation =
      Object.keys(aiHint).length === 0
        ? context.parsed.locateChildElement(record, "ai")
        : context.parsed.locateRecord(aiHint);
    const hintProvenance = {
      ...provenance,
      ...sourceLocation,
    };
    reportUnknownLeafContent(
      context,
      aiHint,
      "ai",
      new Set(["hint"]),
      hintProvenance,
      currentEntityId,
      true,
    );
    const sourceHint = xmlAttribute(aiHint, "hint");
    const hint =
      sourceHint === undefined || sourceHint.trim() === "" ? null : sourceHint;
    if (hint === null) {
      const scopeLabel =
        scope.buffIndex === undefined
          ? "Spell"
          : `Spell buff ${scope.buffIndex + 1}`;
      context.diagnostics.push({
        severity: "warning",
        code: "missing_spell_ai_hint",
        message: `${scopeLabel} AI declaration ${hintIndex + 1} is missing its hint.`,
        source: hintProvenance,
        entityId: currentEntityId,
        details: {
          hintIndex,
          ...(scope.buffIndex === undefined
            ? { scope: "spell" }
            : { scope: "buff", buffIndex: scope.buffIndex }),
        },
      });
    }
    return { hint };
  });
}

function spellBuffHaloRecords(buff: XmlRecord): XmlRecord[] {
  const value = buff.halo;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellBuffHalos(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffHaloMetadata[] {
  return spellBuffHaloRecords(buff).map((halo, haloIndex) => {
    const haloProvenance = {
      ...provenance,
      ...context.parsed.locateRecord(halo),
    };
    reportUnknownLeafContent(
      context,
      halo,
      "halo",
      spellBuffHaloAttributes,
      haloProvenance,
      currentEntityId,
      true,
    );

    const spriteReference = xmlAttribute(halo, "name");
    if (!spriteReference) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_spell_buff_halo_sprite",
        message: `Spell buff ${buffIndex + 1} halo ${haloIndex + 1} is missing its sprite reference.`,
        source: haloProvenance,
        entityId: currentEntityId,
        details: { buffIndex, haloIndex },
      });
    }

    const optionalHaloInteger = (
      value: string | undefined,
      field: string,
    ): number | null =>
      optionalIntegerValue(
        value,
        context,
        haloProvenance,
        `spell buff ${buffIndex + 1} halo ${haloIndex + 1} ${field}`,
        currentEntityId,
        0,
      );
    const reportAliasConflict = (
      canonicalAttribute: string,
      aliasAttribute: string,
      field: string,
    ): void => {
      const canonicalValue = xmlAttribute(halo, canonicalAttribute);
      const aliasValue = xmlAttribute(halo, aliasAttribute);
      if (canonicalValue === undefined || aliasValue === undefined) {
        return;
      }
      context.diagnostics.push({
        severity: "warning",
        code: "conflicting_spell_buff_halo_aliases",
        message: `Spell buff ${buffIndex + 1} halo ${haloIndex + 1} supplies both supported ${field} attribute aliases; the canonical casing was used.`,
        source: haloProvenance,
        entityId: currentEntityId,
        details: {
          buffIndex,
          haloIndex,
          field,
          canonicalAttribute,
          canonicalValue,
          aliasAttribute,
          aliasValue,
        },
      });
    };
    reportAliasConflict("frameRate", "framerate", "frame rate");
    reportAliasConflict("centerEffect", "centereffect", "centered flag");
    const frameRateAttribute =
      xmlAttribute(halo, "frameRate") === undefined &&
      xmlAttribute(halo, "framerate") !== undefined
        ? "framerate"
        : "frameRate";
    const centerAttribute =
      xmlAttribute(halo, "centerEffect") === undefined &&
      xmlAttribute(halo, "centereffect") !== undefined
        ? "centereffect"
        : "centerEffect";

    return {
      spritePath: normalizeAssetReference(
        spriteReference,
        context,
        haloProvenance,
        currentEntityId,
      ),
      frameCount: optionalHaloInteger(xmlAttribute(halo, "num"), "frame count"),
      frameRate: optionalHaloInteger(
        xmlAttribute(halo, frameRateAttribute),
        "frame rate",
      ),
      firstFrame: optionalHaloInteger(
        xmlAttribute(halo, "first"),
        "first frame",
      ),
      centered: optionalBooleanAttribute(
        halo,
        centerAttribute,
        context,
        haloProvenance,
        `spell buff ${buffIndex + 1} halo ${haloIndex + 1} centered flag`,
        currentEntityId,
      ),
    };
  });
}

function parseSpellBuffSightModifiers(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffSightModifier[] {
  return spellBuffSightModifierRecords(buff).map((modifier, modifierIndex) => {
    reportUnknownLeafContent(
      context,
      modifier,
      "sightbuff",
      new Set(["amount"]),
      provenance,
      currentEntityId,
    );
    const amountText = xmlAttribute(modifier, "amount");
    if (amountText === undefined || amountText === "") {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_spell_buff_sight_amount",
        message: `Spell buff ${buffIndex + 1} sight modifier ${modifierIndex + 1} is missing its amount.`,
        source: provenance,
        entityId: currentEntityId,
        details: { buffIndex, modifierIndex },
      });
      return { amount: null };
    }

    return {
      amount: optionalNumberValue(
        amountText,
        context,
        provenance,
        `spell buff ${buffIndex + 1} sight modifier ${modifierIndex + 1} amount`,
        currentEntityId,
      ),
    };
  });
}

function parseSpellBuffEventHooks(
  buff: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  buffIndex: number,
): SpellBuffEventHook[] {
  return spellBuffEventHookSpecs.flatMap(({ childName, kind, supportsAfter }) =>
    xmlChildren(buff, childName).flatMap((hook, hookIndex) => {
      const hookProvenance = {
        ...provenance,
        ...context.parsed.locateRecord(hook),
      };
      reportUnknownLeafContent(
        context,
        hook,
        childName,
        new Set(["name", "percentage", ...(supportsAfter ? ["after"] : [])]),
        hookProvenance,
        currentEntityId,
        true,
      );
      const sourceChance = xmlAttribute(hook, "percentage");
      if (sourceChance === undefined) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_spell_buff_hook_chance",
          message: `Spell buff ${buffIndex + 1} ${kind} hook ${hookIndex + 1} is missing its required chance percentage.`,
          source: hookProvenance,
          entityId: currentEntityId,
          details: { buffIndex, hookIndex, hookKind: kind },
        });
      }
      const chance = optionalIntegerValue(
        sourceChance,
        context,
        hookProvenance,
        `spell buff ${buffIndex + 1} ${kind} hook ${hookIndex + 1} chance`,
        currentEntityId,
        0,
        100,
      );
      const spellName = xmlAttribute(hook, "name");
      if (!spellName) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_spell_buff_hook_target",
          message: `Spell buff ${buffIndex + 1} ${kind} hook ${hookIndex + 1} is missing its spell reference.`,
          source: hookProvenance,
          entityId: currentEntityId,
          details: { buffIndex, hookIndex, hookKind: kind },
        });
        return [];
      }
      const after = supportsAfter ? xmlAttribute(hook, "after") : undefined;
      return [
        {
          kind,
          spellKey: canonicalKey(spellName),
          spellName,
          chance,
          sourceFlags:
            after === undefined ? [] : [{ sourceKey: "after", value: after }],
        },
      ];
    }),
  );
}

function parseSpellBuffs(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellBuff[] {
  return xmlChildren(record, "buff").map((buff, buffIndex) => {
    const modifierElementNames = matchingStatModifierElementNames(buff).filter(
      (elementName) =>
        spellBuffModifierElementNames.has(elementName.toLocaleLowerCase("en")),
    );

    reportUnknownAttributes(
      context,
      buff,
      "buff",
      spellBuffAttributes,
      provenance,
      currentEntityId,
    );
    reportUnknownChildren(
      context,
      buff,
      new Set([
        ...modifierElementNames,
        "ai",
        "description",
        "effect",
        "halo",
        "invisible",
        "mute",
        "payback",
        "polymorph",
        "senseWallsFlag",
        "sightbuff",
        "zorkmidAbsorption",
        ...spellBuffEventHookSpecs.map(({ childName }) => childName),
      ]),
      currentEntityId,
    );
    for (const elementName of modifierElementNames) {
      const normalizedName = elementName.toLocaleLowerCase("en");
      for (const modifier of xmlChildren(buff, elementName)) {
        if (
          normalizedName === "primarybuff" ||
          normalizedName === "secondarybuff"
        ) {
          reportUnknownLeafContent(
            context,
            modifier,
            elementName,
            new Set(["id", "amount"]),
            provenance,
            currentEntityId,
          );
        } else {
          reportUnknownChildren(context, modifier, new Set(), currentEntityId);
        }
      }
    }

    const optionalBuffInteger = (
      attribute: string,
      field: string,
    ): number | null =>
      optionalIntegerValue(
        xmlAttribute(buff, attribute),
        context,
        provenance,
        `spell buff ${buffIndex + 1} ${field}`,
        currentEntityId,
        0,
      );

    return {
      iconPath: normalizeAssetPath(
        xmlAttribute(buff, "icon"),
        context,
        provenance,
        currentEntityId,
      ),
      smallIconPath: normalizeAssetPath(
        xmlAttribute(buff, "smallicon"),
        context,
        provenance,
        currentEntityId,
      ),
      timerMode: optionalIntegerValue(
        xmlAttribute(buff, "useTimer") ?? xmlAttribute(buff, "usetimer"),
        context,
        provenance,
        `spell buff ${buffIndex + 1} timer mode`,
        currentEntityId,
        0,
      ),
      duration: optionalBuffInteger("time", "duration"),
      manaUpkeep: optionalIntegerValue(
        xmlAttribute(buff, "manaUpkeep") ?? xmlAttribute(buff, "manaupkeep"),
        context,
        provenance,
        `spell buff ${buffIndex + 1} mana upkeep`,
        currentEntityId,
        0,
      ),
      currencyUpkeep: optionalBuffInteger("zorkmidUpkeep", "zorkmid upkeep"),
      hitLimit: optionalBuffInteger("brittle", "hit limit"),
      attackLimit: optionalBuffInteger("attacks", "attack limit"),
      removable: optionalBooleanAttribute(
        buff,
        "removable",
        context,
        provenance,
        `spell buff ${buffIndex + 1} removable flag`,
        currentEntityId,
      ),
      affectsSelf: optionalBooleanAttribute(
        buff,
        "self",
        context,
        provenance,
        `spell buff ${buffIndex + 1} self flag`,
        currentEntityId,
      ),
      resistable: optionalBooleanAttribute(
        buff,
        "resistable",
        context,
        provenance,
        `spell buff ${buffIndex + 1} resistable flag`,
        currentEntityId,
      ),
      detrimental: optionalBooleanAttribute(
        buff,
        "bad",
        context,
        provenance,
        `spell buff ${buffIndex + 1} detrimental flag`,
        currentEntityId,
      ),
      stackable: optionalBooleanAttribute(
        buff,
        "stackable",
        context,
        provenance,
        `spell buff ${buffIndex + 1} stackable flag`,
        currentEntityId,
      ),
      allowStacking: optionalBooleanAttribute(
        buff,
        xmlAttribute(buff, "allowstacking") === undefined &&
          xmlAttribute(buff, "allowStacking") !== undefined
          ? "allowStacking"
          : "allowstacking",
        context,
        provenance,
        `spell buff ${buffIndex + 1} allow-stacking flag`,
        currentEntityId,
      ),
      stackLimit: optionalBuffInteger("stacksize", "stack limit"),
      descriptions: parseSpellBuffDescriptions(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
      halos: parseSpellBuffHalos(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
      invisibilityDeclarations: parseSpellBuffAmountMarkerDeclarations(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
        "invisible",
        "invisibility",
      ),
      muteDeclarations: parseSpellBuffAmountMarkerDeclarations(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
        "mute",
        "mute",
      ),
      senseWallsDeclarations: parseSpellBuffSenseWallsDeclarations(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
      paybackDeclarations: parseSpellBuffPaybackDeclarations(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
      zorkmidAbsorptionDeclarations:
        parseSpellBuffZorkmidAbsorptionDeclarations(
          buff,
          context,
          provenance,
          currentEntityId,
          buffIndex,
        ),
      polymorphDeclarations: parseSpellBuffPolymorphDeclarations(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
      effects: parseSpellEffects(buff, context, provenance, currentEntityId),
      aiHints: parseSpellAiHints(buff, context, provenance, currentEntityId, {
        buffIndex,
      }),
      sourceFlags: spellBuffSourceFlagAttributes
        .flatMap((sourceKey) => {
          const value = xmlAttribute(buff, sourceKey);
          return value === undefined ? [] : [{ sourceKey, value }];
        })
        .sort(
          (left, right) =>
            compareCodeUnits(left.sourceKey, right.sourceKey) ||
            compareCodeUnits(left.value, right.value),
        ),
      modifiers: parseStatModifiers(
        buff,
        context,
        provenance,
        currentEntityId,
        "spell_buff",
      ),
      sightModifiers: parseSpellBuffSightModifiers(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
      eventHooks: parseSpellBuffEventHooks(
        buff,
        context,
        provenance,
        currentEntityId,
        buffIndex,
      ),
    };
  });
}

function spellEffectOptionRecords(effect: XmlRecord): XmlRecord[] {
  const value = effect.option;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (isXmlRecord(entry)) {
      return [entry];
    }
    if (typeof entry === "string") {
      return [entry === "" ? {} : { "#text": entry }];
    }
    return [];
  });
}

function parseSpellEffectOptions(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffectOption[] {
  const optionKind =
    effectType === "spawnitemfromlist"
      ? "item"
      : effectType === "triggerfromlist"
        ? "spell"
        : null;
  if (optionKind === null) {
    return [];
  }

  return spellEffectOptionRecords(effect).map((option, optionIndex) => {
    const sourceLocation =
      Object.keys(option).length === 0
        ? context.parsed.locateChildElement(effect, "option")
        : context.parsed.locateRecord(option);
    const optionProvenance = {
      ...provenance,
      ...sourceLocation,
    };
    reportUnknownLeafContent(
      context,
      option,
      "option",
      new Set(optionKind === "item" ? ["name", "amount"] : ["name"]),
      optionProvenance,
      currentEntityId,
      true,
    );

    const sourceName = xmlAttribute(option, "name");
    const targetName =
      sourceName === undefined || sourceName.trim() === "" ? null : sourceName;
    if (targetName === null) {
      context.diagnostics.push({
        severity: "warning",
        code: "missing_spell_effect_option_target",
        message: `Spell effect ${effectIndex + 1} ${optionKind} option ${optionIndex + 1} is missing its target name.`,
        source: optionProvenance,
        entityId: currentEntityId,
        details: { effectIndex, optionIndex, optionKind },
      });
    }

    if (optionKind === "item") {
      const amount = optionalIntegerValue(
        xmlAttribute(option, "amount"),
        context,
        optionProvenance,
        `spell effect ${effectIndex + 1} item option ${optionIndex + 1} amount`,
        currentEntityId,
        1,
      );
      return targetName === null
        ? {
            kind: "item",
            itemKey: null,
            itemName: null,
            amount,
          }
        : {
            kind: "item",
            itemKey: canonicalKey(targetName),
            itemName: targetName,
            itemResolution: unresolvedRelationship("item", targetName),
            amount,
          };
    }

    return {
      kind: "spell",
      spellKey: targetName === null ? null : canonicalKey(targetName),
      spellName: targetName,
    };
  });
}

const spellEffectControlAttributes = [
  "turns",
  "after",
  "percent",
  "percentage",
  "affectsCaster",
  "affectscaster",
  "self",
  "affectsCorpses",
  "resistable",
  "taxa",
  "burn",
  "bleed",
  "skipAnimation",
  "skipanimation",
] as const;

const spellEffectPresentationAttributes = [
  "icon",
  "smallicon",
  "sprite",
  "frames",
  "framerate",
  "centerEffect",
  "sfx",
] as const;

const spellEffectConditionAttributes = [
  "requirebuff",
  "requireBuff",
  "requirebuffontrigger",
  "requirebuffontriggername",
  "requirebuffonnottrigger",
  "requirebuffonnottriggername",
] as const;

const spellEffectItemTargetTypes = new Set(["spawn", "spawnitematlocation"]);
const spellEffectItemTargetAttributes = ["itemname", "itemName"] as const;
const spellEffectMonsterTargetTypes = new Set(["summon", "summonhostile"]);
const spellEffectMonsterTargetAttributes = ["monsterType"] as const;
const spellEffectRemovedBuffTypes = new Set(["removebuffbyname"]);
const spellEffectRemovedBuffAttributes = ["name"] as const;
const spellEffectCreatedObjectTypes = new Set(["create"]);
const spellEffectCreatedObjectAttributes = ["objectSprite"] as const;
const spellEffectGraphicsRegenerationTypes = new Set(["dig"]);
const spellEffectGraphicsRegenerationAttributes = ["regengfx"] as const;
const spellEffectBuffTagAttributes = ["buffTag"] as const;
const spellEffectMidasTypes = new Set(["damage"]);
const spellEffectMidasAttributes = ["midas"] as const;
const spellEffectDamageTypes = new Set(["damage", "drain"]);
const spellEffectAmountFactorTypes = new Set(["heal", "spellpoints"]);
const spellEffectFloorFactorTypes = new Set(["spawnitematlocation"]);
const spellEffectScaleSelectorTypes = new Set(["damage", "drain", "heal"]);
const spellEffectDamageAttributes = damageSourceKeys.flatMap((sourceKey) => [
  sourceKey,
  `${sourceKey}F`,
]);
const spellEffectScaleSelectorAttributes = [
  "primaryScale",
  "primaryscale",
  "secondaryScale",
] as const;

function spellEffectScalingAttributes(effectType: string): string[] {
  return [
    ...(spellEffectAmountFactorTypes.has(effectType) ? ["amountF"] : []),
    ...(spellEffectFloorFactorTypes.has(effectType) ? ["floorScaleF"] : []),
    ...(spellEffectScaleSelectorTypes.has(effectType)
      ? spellEffectScaleSelectorAttributes
      : []),
  ];
}

function parseSpellEffectNumberAttribute(
  effect: XmlRecord,
  attribute: string,
  effectIndex: number,
  field: string,
  numericKind: "number" | "integer",
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): number | null {
  const value = xmlAttribute(effect, attribute);
  if (value === undefined) {
    return null;
  }
  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  if (value.trim() === "") {
    context.diagnostics.push({
      severity: "warning",
      code: "invalid_number",
      message: `Expected a non-negative ${numericKind === "integer" ? "integer" : "number"} for ${field}; used an unavailable value instead.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { field, value },
    });
    return null;
  }
  return numericKind === "integer"
    ? optionalIntegerValue(
        value,
        context,
        effectProvenance,
        field,
        currentEntityId,
        0,
      )
    : optionalNumberValue(
        value,
        context,
        effectProvenance,
        field,
        currentEntityId,
        0,
      );
}

function parseSpellEffectItemTarget(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["itemTarget"] {
  if (!spellEffectItemTargetTypes.has(effectType)) {
    return { itemKey: null, itemName: null };
  }

  const lowerValue = xmlAttribute(effect, "itemname");
  const camelValue = xmlAttribute(effect, "itemName");
  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  if (lowerValue !== undefined && camelValue !== undefined) {
    context.diagnostics.push({
      severity: "warning",
      code: "conflicting_spell_effect_item_target_aliases",
      message: `Spell effect ${effectIndex + 1} supplies both supported item-target aliases; the canonical lowercase spelling was used.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: {
        effectIndex,
        canonicalAttribute: "itemname",
        canonicalValue: lowerValue,
        aliasAttribute: "itemName",
        aliasValue: camelValue,
      },
    });
  }

  const sourceName = lowerValue ?? camelValue;
  const itemName =
    sourceName === undefined || sourceName.trim() === "" ? null : sourceName;
  if (sourceName !== undefined && itemName === null) {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_item_target",
      message: `Spell effect ${effectIndex + 1} supplies an empty direct item target.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex, effectType },
    });
  }

  return {
    itemKey: itemName === null ? null : canonicalKey(itemName),
    itemName,
  };
}

function parseSpellEffectMonsterTarget(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["monsterTarget"] {
  if (!spellEffectMonsterTargetTypes.has(effectType)) {
    return { monsterKey: null, monsterName: null };
  }

  const sourceName = xmlAttribute(effect, "monsterType");
  const monsterName =
    sourceName === undefined || sourceName.trim() === "" ? null : sourceName;
  if (sourceName !== undefined && monsterName === null) {
    const effectProvenance = {
      ...provenance,
      ...context.parsed.locateRecord(effect),
    };
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_monster_target",
      message: `Spell effect ${effectIndex + 1} supplies an empty direct monster target.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex, effectType },
    });
  }

  return {
    monsterKey: monsterName === null ? null : canonicalKey(monsterName),
    monsterName,
  };
}

function parseSpellEffectRemovedBuff(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["removedBuff"] {
  if (!spellEffectRemovedBuffTypes.has(effectType)) {
    return { spellKey: null, spellName: null };
  }

  const sourceName = xmlAttribute(effect, "name");
  const spellName =
    sourceName === undefined || sourceName.trim() === "" ? null : sourceName;
  if (spellName === null) {
    const effectProvenance = {
      ...provenance,
      ...context.parsed.locateRecord(effect),
    };
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_removed_buff",
      message: `Spell effect ${effectIndex + 1} is missing its named buff-removal target.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex, effectType },
    });
  }

  return {
    spellKey: spellName === null ? null : canonicalKey(spellName),
    spellName,
  };
}

function parseSpellEffectDamage(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["damage"] {
  if (!spellEffectDamageTypes.has(effectType)) {
    return [];
  }

  return damageSourceKeys.flatMap((sourceKey) => {
    const amountAttribute = sourceKey;
    const factorAttribute = `${sourceKey}F`;
    if (
      xmlAttribute(effect, amountAttribute) === undefined &&
      xmlAttribute(effect, factorAttribute) === undefined
    ) {
      return [];
    }
    return [
      {
        sourceKey,
        amount: parseSpellEffectNumberAttribute(
          effect,
          amountAttribute,
          effectIndex,
          `spell effect ${effectIndex + 1} ${sourceKey} damage amount`,
          "number",
          context,
          provenance,
          currentEntityId,
        ),
        factor: parseSpellEffectNumberAttribute(
          effect,
          factorAttribute,
          effectIndex,
          `spell effect ${effectIndex + 1} ${sourceKey} damage factor`,
          "number",
          context,
          provenance,
          currentEntityId,
        ),
      },
    ];
  });
}

function parseSpellEffectScaling(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["scaling"] {
  const supportsAmountFactor = spellEffectAmountFactorTypes.has(effectType);
  const supportsFloorFactor = spellEffectFloorFactorTypes.has(effectType);
  const supportsScaleSelectors = spellEffectScaleSelectorTypes.has(effectType);
  const camelPrimaryValue = xmlAttribute(effect, "primaryScale");
  const lowerPrimaryValue = xmlAttribute(effect, "primaryscale");
  const secondaryValue = xmlAttribute(effect, "secondaryScale");
  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };

  if (
    supportsScaleSelectors &&
    camelPrimaryValue !== undefined &&
    lowerPrimaryValue !== undefined
  ) {
    context.diagnostics.push({
      severity: "warning",
      code: "conflicting_spell_effect_scaling_aliases",
      message: `Spell effect ${effectIndex + 1} supplies both supported primary scaling aliases; the canonical casing was used.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: {
        effectIndex,
        canonicalAttribute: "primaryScale",
        canonicalValue: camelPrimaryValue,
        aliasAttribute: "primaryscale",
        aliasValue: lowerPrimaryValue,
      },
    });
  }
  if (
    supportsScaleSelectors &&
    (camelPrimaryValue !== undefined || lowerPrimaryValue !== undefined) &&
    secondaryValue !== undefined
  ) {
    context.diagnostics.push({
      severity: "warning",
      code: "conflicting_spell_effect_scaling_selectors",
      message: `Spell effect ${effectIndex + 1} supplies both primary and secondary scaling selectors; both source values were retained without choosing a formula.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex },
    });
  }

  const primaryAttribute =
    camelPrimaryValue === undefined && lowerPrimaryValue !== undefined
      ? "primaryscale"
      : "primaryScale";
  return {
    amountFactor: supportsAmountFactor
      ? parseSpellEffectNumberAttribute(
          effect,
          "amountF",
          effectIndex,
          `spell effect ${effectIndex + 1} amount factor`,
          "number",
          context,
          provenance,
          currentEntityId,
        )
      : null,
    floorFactor: supportsFloorFactor
      ? parseSpellEffectNumberAttribute(
          effect,
          "floorScaleF",
          effectIndex,
          `spell effect ${effectIndex + 1} floor factor`,
          "number",
          context,
          provenance,
          currentEntityId,
        )
      : null,
    primaryStatId: supportsScaleSelectors
      ? parseSpellEffectNumberAttribute(
          effect,
          primaryAttribute,
          effectIndex,
          `spell effect ${effectIndex + 1} primary scaling source ID`,
          "integer",
          context,
          provenance,
          currentEntityId,
        )
      : null,
    secondaryStatId: supportsScaleSelectors
      ? parseSpellEffectNumberAttribute(
          effect,
          "secondaryScale",
          effectIndex,
          `spell effect ${effectIndex + 1} secondary scaling source ID`,
          "integer",
          context,
          provenance,
          currentEntityId,
        )
      : null,
  };
}

function parseSpellEffectPresentation(
  effect: XmlRecord,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["presentation"] {
  if (
    !spellEffectPresentationAttributes.some(
      (attribute) => xmlAttribute(effect, attribute) !== undefined,
    )
  ) {
    return null;
  }

  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  const soundEffectValue = xmlAttribute(effect, "sfx");
  const soundEffect =
    soundEffectValue === undefined || soundEffectValue.trim() === ""
      ? null
      : soundEffectValue.trim();
  if (soundEffectValue !== undefined && soundEffect === null) {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_sound_cue",
      message: `Spell effect ${effectIndex + 1} supplies an empty sound cue.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex },
    });
  }

  return {
    iconPath: normalizeAssetPath(
      xmlAttribute(effect, "icon"),
      context,
      effectProvenance,
      currentEntityId,
    ),
    smallIconPath: normalizeAssetPath(
      xmlAttribute(effect, "smallicon"),
      context,
      effectProvenance,
      currentEntityId,
    ),
    spritePath: normalizeAssetReference(
      xmlAttribute(effect, "sprite"),
      context,
      effectProvenance,
      currentEntityId,
    ),
    frameCount: parseSpellEffectNumberAttribute(
      effect,
      "frames",
      effectIndex,
      `spell effect ${effectIndex + 1} presentation frame count`,
      "integer",
      context,
      provenance,
      currentEntityId,
    ),
    frameRate: parseSpellEffectNumberAttribute(
      effect,
      "framerate",
      effectIndex,
      `spell effect ${effectIndex + 1} presentation frame rate`,
      "integer",
      context,
      provenance,
      currentEntityId,
    ),
    centered: optionalBooleanAttribute(
      effect,
      "centerEffect",
      context,
      effectProvenance,
      `spell effect ${effectIndex + 1} centered-presentation flag`,
      currentEntityId,
    ),
    soundEffect,
  };
}

function parseSpellEffectCreatedObjectSprite(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["createdObjectSpritePath"] {
  if (!spellEffectCreatedObjectTypes.has(effectType)) {
    return null;
  }

  const value = xmlAttribute(effect, "objectSprite");
  if (value === undefined) {
    return null;
  }

  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  if (value.trim() === "") {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_created_object_sprite",
      message: `Spell effect ${effectIndex + 1} supplies an empty created-object sprite reference.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex, effectType },
    });
    return null;
  }

  return normalizeAssetPath(value, context, effectProvenance, currentEntityId);
}

function parseSpellEffectRegenerateGraphics(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["regenerateGraphics"] {
  if (!spellEffectGraphicsRegenerationTypes.has(effectType)) {
    return null;
  }

  return optionalBooleanAttribute(
    effect,
    "regengfx",
    context,
    {
      ...provenance,
      ...context.parsed.locateRecord(effect),
    },
    `spell effect ${effectIndex + 1} regenerate-graphics flag`,
    currentEntityId,
  );
}

function parseSpellEffectControls(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["controls"] {
  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  const reportAliasConflict = (
    canonicalAttribute: string,
    aliasAttribute: string,
    field: string,
  ): void => {
    const canonicalValue = xmlAttribute(effect, canonicalAttribute);
    const aliasValue = xmlAttribute(effect, aliasAttribute);
    if (canonicalValue === undefined || aliasValue === undefined) {
      return;
    }
    context.diagnostics.push({
      severity: "warning",
      code: "conflicting_spell_effect_control_aliases",
      message: `Spell effect ${effectIndex + 1} supplies both supported ${field} attribute aliases; the canonical casing was used.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: {
        effectIndex,
        field,
        canonicalAttribute,
        canonicalValue,
        aliasAttribute,
        aliasValue,
      },
    });
  };
  reportAliasConflict("percent", "percentage", "chance");
  reportAliasConflict("affectsCaster", "affectscaster", "affects-caster flag");
  reportAliasConflict("skipAnimation", "skipanimation", "skip-animation flag");

  const chanceAttribute =
    xmlAttribute(effect, "percent") === undefined &&
    xmlAttribute(effect, "percentage") !== undefined
      ? "percentage"
      : "percent";
  const affectsCasterAttribute =
    xmlAttribute(effect, "affectsCaster") === undefined &&
    xmlAttribute(effect, "affectscaster") !== undefined
      ? "affectscaster"
      : "affectsCaster";
  const skipAnimationAttribute =
    xmlAttribute(effect, "skipAnimation") === undefined &&
    xmlAttribute(effect, "skipanimation") !== undefined
      ? "skipanimation"
      : "skipAnimation";
  const chanceValue = xmlAttribute(effect, chanceAttribute);
  let chancePercent: number | null = null;
  if (chanceValue !== undefined) {
    if (chanceValue.trim() === "") {
      context.diagnostics.push({
        severity: "warning",
        code: "invalid_number",
        message: `Expected an integer from 0 to 100 for spell effect ${effectIndex + 1} chance; used an unavailable value instead.`,
        source: effectProvenance,
        entityId: currentEntityId,
        details: {
          field: `spell effect ${effectIndex + 1} chance`,
          value: chanceValue,
        },
      });
    } else {
      chancePercent = optionalIntegerValue(
        chanceValue,
        context,
        effectProvenance,
        `spell effect ${effectIndex + 1} chance`,
        currentEntityId,
        0,
        100,
      );
    }
  }
  const optionalControlFlag = (
    attribute: string,
    field: string,
  ): boolean | null =>
    optionalBooleanAttribute(
      effect,
      attribute,
      context,
      effectProvenance,
      `spell effect ${effectIndex + 1} ${field}`,
      currentEntityId,
    );
  const taxonomyValue = xmlAttribute(effect, "taxa");
  const taxonomy =
    taxonomyValue === undefined || taxonomyValue.trim() === ""
      ? null
      : taxonomyValue.trim();
  if (taxonomyValue !== undefined && taxonomy === null) {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_taxonomy",
      message: `Spell effect ${effectIndex + 1} supplies an empty taxonomy control.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex },
    });
  }

  return {
    durationTurns: parseSpellEffectNumberAttribute(
      effect,
      "turns",
      effectIndex,
      `spell effect ${effectIndex + 1} duration in turns`,
      "integer",
      context,
      provenance,
      currentEntityId,
    ),
    after: optionalControlFlag("after", "after flag"),
    chancePercent,
    affectsCaster: optionalControlFlag(
      affectsCasterAttribute,
      "affects-caster flag",
    ),
    affectsSelf: optionalControlFlag("self", "self flag"),
    affectsCorpses: optionalControlFlag(
      "affectsCorpses",
      "affects-corpses flag",
    ),
    resistable: optionalControlFlag("resistable", "resistable flag"),
    burnsTarget: optionalControlFlag("burn", "burn flag"),
    bleedsTarget: optionalControlFlag("bleed", "bleed flag"),
    midas: spellEffectMidasTypes.has(effectType)
      ? optionalControlFlag("midas", "midas flag")
      : null,
    skipAnimation: optionalControlFlag(
      skipAnimationAttribute,
      "skip-animation flag",
    ),
    taxonomy,
  };
}

function parseSpellEffectBuffTag(
  effect: XmlRecord,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): string | null {
  const value = xmlAttribute(effect, "buffTag");
  if (value === undefined) {
    return null;
  }
  if (value.trim().length > 0) {
    return value;
  }
  context.diagnostics.push({
    severity: "warning",
    code: "missing_spell_effect_buff_tag",
    message: `Spell effect ${effectIndex + 1} supplies an empty buffTag source token.`,
    source: {
      ...provenance,
      ...context.parsed.locateRecord(effect),
    },
    entityId: currentEntityId,
    details: { effectIndex },
  });
  return null;
}

function emptySpellEffectBuffCondition(): SpellEffect["conditions"]["requiredBuff"] {
  return {
    enabled: null,
    spellKey: null,
    spellName: null,
  };
}

function emptySpellEffectConditions(): SpellEffect["conditions"] {
  return {
    requiresSourceBuff: null,
    requiredBuff: emptySpellEffectBuffCondition(),
    forbiddenBuff: emptySpellEffectBuffCondition(),
  };
}

function parseSpellEffectBuffCondition(
  effect: XmlRecord,
  effectIndex: number,
  flagAttribute: string,
  nameAttribute: string,
  field: string,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["conditions"]["requiredBuff"] {
  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  const flagValue = xmlAttribute(effect, flagAttribute);
  const sourceName = xmlAttribute(effect, nameAttribute);
  const spellName =
    sourceName === undefined || sourceName.trim() === "" ? null : sourceName;

  if (
    (flagValue === undefined && sourceName !== undefined) ||
    (flagValue !== undefined && sourceName === undefined)
  ) {
    context.diagnostics.push({
      severity: "warning",
      code: "incomplete_spell_effect_buff_condition",
      message: `Spell effect ${effectIndex + 1} supplies only part of its ${field} source pair.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: {
        effectIndex,
        field,
        flagAttribute,
        nameAttribute,
      },
    });
  }
  if (sourceName !== undefined && spellName === null) {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_effect_buff_condition_target",
      message: `Spell effect ${effectIndex + 1} supplies an empty ${field} spell name.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: { effectIndex, field, nameAttribute },
    });
  }

  return {
    enabled: optionalBooleanAttribute(
      effect,
      flagAttribute,
      context,
      effectProvenance,
      `spell effect ${effectIndex + 1} ${field} flag`,
      currentEntityId,
    ),
    spellKey: spellName === null ? null : canonicalKey(spellName),
    spellName,
  };
}

function parseSpellEffectConditions(
  effect: XmlRecord,
  effectType: string,
  effectIndex: number,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect["conditions"] {
  if (effectType !== "trigger" && effectType !== "dot") {
    return emptySpellEffectConditions();
  }

  const effectProvenance = {
    ...provenance,
    ...context.parsed.locateRecord(effect),
  };
  const lowerSourceBuffValue = xmlAttribute(effect, "requirebuff");
  const camelSourceBuffValue = xmlAttribute(effect, "requireBuff");
  if (
    lowerSourceBuffValue !== undefined &&
    camelSourceBuffValue !== undefined
  ) {
    context.diagnostics.push({
      severity: "warning",
      code: "conflicting_spell_effect_condition_aliases",
      message: `Spell effect ${effectIndex + 1} supplies both supported source-buff requirement aliases; the canonical lowercase spelling was used.`,
      source: effectProvenance,
      entityId: currentEntityId,
      details: {
        effectIndex,
        field: "source-buff requirement",
        canonicalAttribute: "requirebuff",
        canonicalValue: lowerSourceBuffValue,
        aliasAttribute: "requireBuff",
        aliasValue: camelSourceBuffValue,
      },
    });
  }
  const sourceBuffAttribute =
    lowerSourceBuffValue === undefined && camelSourceBuffValue !== undefined
      ? "requireBuff"
      : "requirebuff";
  return {
    requiresSourceBuff: optionalBooleanAttribute(
      effect,
      sourceBuffAttribute,
      context,
      effectProvenance,
      `spell effect ${effectIndex + 1} source-buff requirement`,
      currentEntityId,
    ),
    requiredBuff: parseSpellEffectBuffCondition(
      effect,
      effectIndex,
      "requirebuffontrigger",
      "requirebuffontriggername",
      "required-buff-on-trigger",
      context,
      provenance,
      currentEntityId,
    ),
    forbiddenBuff: parseSpellEffectBuffCondition(
      effect,
      effectIndex,
      "requirebuffonnottrigger",
      "requirebuffonnottriggername",
      "forbidden-buff-on-trigger",
      context,
      provenance,
      currentEntityId,
    ),
  };
}

function parseSpellEffects(
  parent: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): SpellEffect[] {
  return xmlChildren(parent, "effect")
    .map((effect, effectIndex) => {
      const effectType = xmlAttribute(effect, "type") ?? "unknown";
      reportUnknownAttributes(
        context,
        effect,
        "effect",
        new Set([
          "type",
          "spell",
          "stat",
          "amount",
          ...spellEffectControlAttributes,
          ...spellEffectPresentationAttributes,
          ...(effectType === "trigger" || effectType === "dot"
            ? spellEffectConditionAttributes
            : []),
          ...(spellEffectItemTargetTypes.has(effectType)
            ? spellEffectItemTargetAttributes
            : []),
          ...(spellEffectMonsterTargetTypes.has(effectType)
            ? spellEffectMonsterTargetAttributes
            : []),
          ...(spellEffectRemovedBuffTypes.has(effectType)
            ? spellEffectRemovedBuffAttributes
            : []),
          ...(spellEffectCreatedObjectTypes.has(effectType)
            ? spellEffectCreatedObjectAttributes
            : []),
          ...(spellEffectGraphicsRegenerationTypes.has(effectType)
            ? spellEffectGraphicsRegenerationAttributes
            : []),
          ...spellEffectBuffTagAttributes,
          ...(spellEffectMidasTypes.has(effectType)
            ? spellEffectMidasAttributes
            : []),
          ...(spellEffectDamageTypes.has(effectType)
            ? spellEffectDamageAttributes
            : []),
          ...spellEffectScalingAttributes(effectType),
        ]),
        provenance,
        currentEntityId,
        true,
      );
      reportUnknownChildren(
        context,
        effect,
        new Set(
          effectType === "spawnitemfromlist" || effectType === "triggerfromlist"
            ? ["option"]
            : [],
        ),
        currentEntityId,
      );
      const spellName = xmlAttribute(effect, "spell");
      const statName = xmlAttribute(effect, "stat");
      const amountText = xmlAttribute(effect, "amount");
      return {
        type: effectType,
        ...(spellName ? { spellName, spellKey: canonicalKey(spellName) } : {}),
        ...(statName ? { statName, statKey: canonicalKey(statName) } : {}),
        ...(amountText
          ? {
              amount: integerValue(
                amountText,
                0,
                context,
                provenance,
                "effect amount",
                currentEntityId,
              ),
            }
          : {}),
        itemTarget: parseSpellEffectItemTarget(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        monsterTarget: parseSpellEffectMonsterTarget(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        removedBuff: parseSpellEffectRemovedBuff(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        damage: parseSpellEffectDamage(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        scaling: parseSpellEffectScaling(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        presentation: parseSpellEffectPresentation(
          effect,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        createdObjectSpritePath: parseSpellEffectCreatedObjectSprite(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        regenerateGraphics: parseSpellEffectRegenerateGraphics(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        buffTag: parseSpellEffectBuffTag(
          effect,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        controls: parseSpellEffectControls(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        conditions: parseSpellEffectConditions(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
        options: parseSpellEffectOptions(
          effect,
          effectType,
          effectIndex,
          context,
          provenance,
          currentEntityId,
        ),
      };
    })
    .sort((left, right) => compareCodeUnits(left.type, right.type));
}

const spellRequirementDependencies = {
  optionalNumberValue,
  optionalIntegerValue,
  optionalBinaryBooleanAttribute,
  reportUnknownLeafContent,
};

const spellMineAttributeNames = [
  "mine",
  "mineradius",
  "mineTimer",
  "minePermanent",
  "mineSpriteDrawOrder",
  "mineSpritePNGSeries",
  "minespritePNGSeries",
  "mineSpritePNGFirst",
  "mineSpritePNGNum",
  "mineSpritePNGRate",
  "mineUseGlints",
  "mineGlintDensity",
  "minesMustBeUnobstructed",
  "minesprite",
] as const;

const spellItemConsumptionAttributeNames = [
  "consumeItem",
  "consumeItemType",
] as const;

function parseSpellItemConsumptionDeclaration(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): Spell["itemConsumption"] {
  if (
    !spellItemConsumptionAttributeNames.some(
      (attribute) => xmlAttribute(record, attribute) !== undefined,
    )
  ) {
    return null;
  }

  const sourceItemType = xmlAttribute(record, "consumeItemType");
  if (sourceItemType !== undefined && sourceItemType.length === 0) {
    context.diagnostics.push({
      severity: "warning",
      code: "missing_spell_item_consumption_type",
      message:
        "Spell item-consumption declaration supplies an empty consumeItemType source token.",
      source: provenance,
      entityId: currentEntityId,
    });
  }

  return {
    sourceConsumesItem: optionalBinaryBooleanAttribute(
      record,
      "consumeItem",
      context,
      provenance,
      "spell item-consumption flag",
      currentEntityId,
    ),
    sourceItemType:
      sourceItemType === undefined || sourceItemType.length === 0
        ? null
        : sourceItemType,
  };
}

function parseSpellMineDeclaration(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
): Spell["mine"] {
  if (
    !spellMineAttributeNames.some(
      (attribute) => xmlAttribute(record, attribute) !== undefined,
    )
  ) {
    return null;
  }

  const canonicalSpriteSeries = xmlAttribute(record, "mineSpritePNGSeries");
  const lowercaseSpriteSeries = xmlAttribute(record, "minespritePNGSeries");
  if (
    canonicalSpriteSeries !== undefined &&
    lowercaseSpriteSeries !== undefined
  ) {
    context.diagnostics.push({
      severity: "warning",
      code: "conflicting_spell_mine_sprite_series_aliases",
      message:
        "Mine declaration supplies both supported sprite-series attribute aliases; the canonical mineSpritePNGSeries casing was used.",
      source: provenance,
      entityId: currentEntityId,
      details: {
        canonicalAttribute: "mineSpritePNGSeries",
        aliasAttribute: "minespritePNGSeries",
      },
    });
  }

  const optionalMineInteger = (
    attribute: (typeof spellMineAttributeNames)[number],
    field: string,
  ): number | null =>
    optionalIntegerValue(
      xmlAttribute(record, attribute),
      context,
      provenance,
      `spell mine ${field}`,
      currentEntityId,
      0,
    );

  return {
    sourceEnabled: optionalBinaryBooleanAttribute(
      record,
      "mine",
      context,
      provenance,
      "spell mine enabled flag",
      currentEntityId,
    ),
    sourceRadius: optionalMineInteger("mineradius", "radius"),
    sourceTimer: optionalMineInteger("mineTimer", "timer"),
    sourcePermanence: optionalMineInteger("minePermanent", "permanence value"),
    sourceSpriteDrawOrder: optionalMineInteger(
      "mineSpriteDrawOrder",
      "sprite draw-order value",
    ),
    sourceUsesGlints: optionalBinaryBooleanAttribute(
      record,
      "mineUseGlints",
      context,
      provenance,
      "spell mine uses-glints flag",
      currentEntityId,
    ),
    sourceGlintDensity: optionalMineInteger(
      "mineGlintDensity",
      "glint-density value",
    ),
    sourceMustBeUnobstructed: optionalBinaryBooleanAttribute(
      record,
      "minesMustBeUnobstructed",
      context,
      provenance,
      "spell mine must-be-unobstructed flag",
      currentEntityId,
    ),
    presentation: {
      spritePath: normalizeAssetReference(
        xmlAttribute(record, "minesprite"),
        context,
        provenance,
        currentEntityId,
      ),
      spriteSeriesPath: normalizeAssetReference(
        canonicalSpriteSeries ?? lowercaseSpriteSeries,
        context,
        provenance,
        currentEntityId,
      ),
      firstFrame: optionalMineInteger("mineSpritePNGFirst", "first frame"),
      frameCount: optionalMineInteger("mineSpritePNGNum", "frame count"),
      frameRate: optionalMineInteger("mineSpritePNGRate", "frame rate"),
    },
  };
}

function parseSpells(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "spell")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "A <spell> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("spell", name);
    const spellType = xmlAttribute(record, "type") ?? "unknown";
    const canonicalTemplateId = xmlAttribute(record, "templateID");
    const lowercaseTemplateId = xmlAttribute(record, "templateid");
    if (
      spellType === "template" &&
      canonicalTemplateId !== undefined &&
      lowercaseTemplateId !== undefined
    ) {
      context.diagnostics.push({
        severity: "warning",
        code: "conflicting_spell_targeting_template_aliases",
        message:
          "Template spell supplies both supported template ID attribute aliases; the canonical templateID casing was used.",
        source: provenance,
        entityId: currentEntityId,
        details: {
          canonicalAttribute: "templateID",
          aliasAttribute: "templateid",
        },
      });
    }
    const sourceTemplateId =
      spellType === "template"
        ? (canonicalTemplateId ?? lowercaseTemplateId ?? null)
        : null;
    const requirements = parseSpellRequirements(
      record,
      context,
      provenance,
      currentEntityId,
      spellRequirementDependencies,
    );
    const effects = parseSpellEffects(
      record,
      context,
      provenance,
      currentEntityId,
    );
    const spell: Spell = {
      ...baseEntity(
        "spell",
        name,
        childAttribute(record, "description", "text") ?? "",
        provenance,
      ),
      spellType,
      iconPath: normalizeAssetPath(
        xmlAttribute(record, "icon"),
        context,
        provenance,
        currentEntityId,
      ),
      sourceRadius: optionalIntegerValue(
        xmlAttribute(record, "radius"),
        context,
        provenance,
        "spell radius",
        currentEntityId,
        0,
      ),
      sourceCooldownTurns: optionalIntegerValue(
        xmlAttribute(record, "downtime"),
        context,
        provenance,
        "spell cooldown turns",
        currentEntityId,
        0,
      ),
      sourcePerformsMeleeAttack: optionalBinaryBooleanAttribute(
        record,
        "attack",
        context,
        provenance,
        "spell melee-attack flag",
        currentEntityId,
      ),
      sourceWandFlag: optionalBinaryBooleanAttribute(
        record,
        "wand",
        context,
        provenance,
        "spell wand flag",
        currentEntityId,
      ),
      sourceSelfFlag: optionalBinaryBooleanAttribute(
        record,
        "self",
        context,
        provenance,
        "root spell self flag",
        currentEntityId,
      ),
      sourceNoAnimationFlag: optionalBinaryBooleanAttribute(
        record,
        "noanimation",
        context,
        provenance,
        "root spell no-animation flag",
        currentEntityId,
      ),
      itemConsumption: parseSpellItemConsumptionDeclaration(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      mine: parseSpellMineDeclaration(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      targetingTemplate: {
        sourceTemplateId,
        templateKey:
          sourceTemplateId === null ? null : canonicalKey(sourceTemplateId),
        sourceAnchored:
          spellType === "template"
            ? optionalBinaryBooleanAttribute(
                record,
                "anchored",
                context,
                provenance,
                "spell targeting-template anchored flag",
                currentEntityId,
              )
            : null,
      },
      ...requirements,
      animations: parseSpellAnimations(
        record,
        context,
        provenance,
        currentEntityId,
      ),
      impacts: parseSpellImpacts(record, context, provenance, currentEntityId),
      aiHints: parseSpellAiHints(record, context, provenance, currentEntityId),
      buffs: parseSpellBuffs(record, context, provenance, currentEntityId),
      effects,
    };
    reportUnknownAttributes(
      context,
      record,
      "spell",
      new Set([
        "id",
        "name",
        "type",
        "icon",
        "radius",
        "downtime",
        "attack",
        "wand",
        "self",
        "noanimation",
        ...spellItemConsumptionAttributeNames,
        ...spellMineAttributeNames,
        ...(spellType === "template"
          ? ["templateID", "templateid", "anchored"]
          : []),
      ]),
      provenance,
      currentEntityId,
    );
    reportUnknownChildren(
      context,
      record,
      new Set([
        "description",
        "effect",
        "requirements",
        "anim",
        "impact",
        "ai",
        "buff",
      ]),
      currentEntityId,
    );
    addCandidate(result.spells, spell, context.source.precedence);
  }
}

function parseMonsters(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const { record, parentName } of collectNestedElements(
    context.parsed.document,
    "monster",
  )) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "A <monster> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("monster", name);
    const sourceLevel = xmlAttribute(record, "level");
    const normalizedLevel = integerValue(
      sourceLevel,
      0,
      context,
      provenance,
      "dungeon level",
      currentEntityId,
      0,
    );
    const stats = xmlChildren(record, "stats")[0];
    const palette = xmlChildren(record, "palette")[0];
    const paletteTint = palette ? xmlAttribute(palette, "tint") : undefined;
    const sight = xmlChildren(record, "sight")[0];
    const sightConeText = sight ? xmlAttribute(sight, "cone") : undefined;
    const sightModifierText = sight
      ? xmlAttribute(sight, "modifier")
      : undefined;
    if (sight) {
      reportUnknownLeafContent(
        context,
        sight,
        "sight",
        new Set(["cone", "modifier"]),
        provenance,
        currentEntityId,
      );
    }
    const dig = xmlChildren(record, "dig")[0];
    const dash = xmlChildren(record, "dash")[0];
    const charge = xmlChildren(record, "charge")[0];
    const onDeathRecords = xmlChildren(record, "ondeath");
    const soundEffects = xmlChildren(record, "sfx")[0];
    const attackSprite = xmlChildren(record, "attackSprite")[0];
    const hitSprite = xmlChildren(record, "hitSprite")[0];
    const deathSprite = xmlChildren(record, "dieSprite")[0];
    const castSprite = xmlChildren(record, "castSpellSprite")[0];
    const beamSprite = xmlChildren(record, "beamSprite")[0];
    const morphSprites = xmlChildren(record, "morphsprites")[0];
    const digSprites = xmlChildren(record, "digSprites")[0];
    const normalizePresentationAsset = (
      presentationRecord: XmlRecord,
      attribute: string,
    ) =>
      normalizeAssetPath(
        xmlAttribute(presentationRecord, attribute),
        context,
        provenance,
        currentEntityId,
      );
    const sourceReference = (
      presentationRecord: XmlRecord,
      attribute: string,
    ) => xmlAttribute(presentationRecord, attribute) || null;
    const directionalSprite = (
      presentationRecord: XmlRecord | undefined,
      elementName: string,
    ) => {
      if (!presentationRecord) {
        return null;
      }
      reportUnknownLeafContent(
        context,
        presentationRecord,
        elementName,
        new Set(["down", "left", "right", "up"]),
        provenance,
        currentEntityId,
      );
      return {
        down: normalizePresentationAsset(presentationRecord, "down"),
        left: normalizePresentationAsset(presentationRecord, "left"),
        right: normalizePresentationAsset(presentationRecord, "right"),
        up: normalizePresentationAsset(presentationRecord, "up"),
      };
    };
    if (soundEffects) {
      reportUnknownLeafContent(
        context,
        soundEffects,
        "sfx",
        new Set(["attack", "die", "hit", "spell", "dig_in", "dig_out"]),
        provenance,
        currentEntityId,
      );
    }
    for (const [presentationRecord, elementName] of [
      [deathSprite, "dieSprite"],
      [castSprite, "castSpellSprite"],
    ] as const) {
      if (presentationRecord) {
        reportUnknownLeafContent(
          context,
          presentationRecord,
          elementName,
          new Set(["name"]),
          provenance,
          currentEntityId,
        );
      }
    }
    if (morphSprites) {
      reportUnknownLeafContent(
        context,
        morphSprites,
        "morphsprites",
        new Set([
          "drinkSprite",
          "eatSprite",
          "levelupfSprite",
          "levelupmSprite",
          "longidleSprite",
          "vanishSprite",
        ]),
        provenance,
        currentEntityId,
      );
    }
    if (digSprites) {
      reportUnknownLeafContent(
        context,
        digSprites,
        "digSprites",
        new Set(["downSprite", "upSprite"]),
        provenance,
        currentEntityId,
      );
    }
    const optionalMovementInteger = (
      behavior: XmlRecord,
      attribute: string,
      field: string,
      maximum?: number,
    ): number | null => {
      const value = xmlAttribute(behavior, attribute);
      return value === undefined
        ? null
        : integerValue(
            value,
            0,
            context,
            provenance,
            field,
            currentEntityId,
            0,
            maximum,
          );
    };
    if (dig) {
      reportUnknownLeafContent(
        context,
        dig,
        "dig",
        new Set([
          "percent",
          "ambushpercent",
          "blockedpercent",
          "minturns",
          "maxTurns",
          "mindistance",
        ]),
        provenance,
        currentEntityId,
      );
    }
    if (dash) {
      reportUnknownLeafContent(
        context,
        dash,
        "dash",
        new Set([
          "chance",
          "speed",
          "mindistance",
          "interruptable",
          "hitspell",
          "missspell",
        ]),
        provenance,
        currentEntityId,
      );
    }
    if (charge) {
      reportUnknownLeafContent(
        context,
        charge,
        "charge",
        new Set([
          "chance",
          "range",
          "turns",
          "interruptable",
          "blockaction",
          "targetself",
          "spell",
        ]),
        provenance,
        currentEntityId,
      );
    }
    for (const onDeath of onDeathRecords) {
      reportUnknownLeafContent(
        context,
        onDeath,
        "ondeath",
        new Set(["percent", "spell"]),
        provenance,
        currentEntityId,
      );
    }
    const dashChance = dash
      ? optionalMovementInteger(dash, "chance", "monster dash chance", 100)
      : null;
    const chargeChance = charge
      ? optionalMovementInteger(charge, "chance", "monster charge chance", 100)
      : null;
    const ai = xmlChildren(record, "ai")[0];
    const spellChanceText = ai
      ? (xmlAttribute(ai, "spellPercentage") ??
        xmlAttribute(ai, "spellpercentage"))
      : undefined;
    const spellChance =
      spellChanceText === undefined
        ? null
        : integerValue(
            spellChanceText,
            0,
            context,
            provenance,
            "monster spell chance",
            currentEntityId,
            0,
            100,
          );
    const aggressivenessText = ai
      ? xmlAttribute(ai, "aggressiveness")
      : undefined;
    const spanText = ai ? xmlAttribute(ai, "span") : undefined;
    const invisibleText = ai ? xmlAttribute(ai, "invisible") : undefined;
    const chickenText = ai ? xmlAttribute(ai, "chicken") : undefined;
    const canCharmText = ai ? xmlAttribute(ai, "cancharm") : undefined;
    const canParalyzeText = ai ? xmlAttribute(ai, "canparalyze") : undefined;
    const stealGoldText = ai ? xmlAttribute(ai, "stealgold") : undefined;
    const stealPercentageText = ai
      ? (xmlAttribute(ai, "stealpercentage") ??
        xmlAttribute(ai, "stealPercentage"))
      : undefined;
    if (ai) {
      reportUnknownLeafContent(
        context,
        ai,
        "ai",
        new Set([
          "aggressiveness",
          "span",
          "invisible",
          "chicken",
          "cancharm",
          "canparalyze",
          "stealgold",
          "stealpercentage",
          "stealPercentage",
          "spellPercentage",
          "spellpercentage",
        ]),
        provenance,
        currentEntityId,
      );
    }
    const triggers: MonsterSpellTrigger[] = [];
    const onHitRecords = Object.keys(record)
      .filter((key) => key.toLocaleLowerCase("en") === "onhit")
      .flatMap((key) => xmlChildren(record, key));
    for (const onHit of onHitRecords) {
      const spellName = xmlAttribute(onHit, "spell");
      if (!spellName) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_monster_trigger_spell",
          message: "A monster on-hit trigger is missing its spell reference.",
          source: provenance,
          entityId: currentEntityId,
          details: { triggerKind: "on-hit" },
        });
        continue;
      }
      const oneChanceIn = integerValue(
        xmlAttribute(onHit, "onechancein"),
        1,
        context,
        provenance,
        "monster on-hit one-in chance",
        currentEntityId,
        1,
      );
      triggers.push({
        kind: "on-hit",
        spellKey: canonicalKey(spellName),
        spellName,
        chance: Math.round(100 / oneChanceIn),
        oneChanceIn,
      });
    }
    for (const spell of xmlChildren(record, "spell")) {
      const spellName = xmlAttribute(spell, "name");
      if (!spellName) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_monster_trigger_spell",
          message: "A monster cast hook is missing its spell reference.",
          source: provenance,
          entityId: currentEntityId,
          details: { triggerKind: "cast-when-aware" },
        });
        continue;
      }
      triggers.push({
        kind: "cast-when-aware",
        spellKey: canonicalKey(spellName),
        spellName,
        chance: spellChance,
        oneChanceIn: null,
      });
    }
    const addBehaviorTrigger = (
      behavior: XmlRecord,
      kind: MonsterSpellTrigger["kind"],
      spellAttribute: string,
      chance: number | null,
    ) => {
      const spellName = xmlAttribute(behavior, spellAttribute);
      if (!spellName) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_monster_trigger_spell",
          message: `A monster ${kind} trigger is missing its spell reference.`,
          source: provenance,
          entityId: currentEntityId,
          details: { triggerKind: kind },
        });
        return;
      }
      triggers.push({
        kind,
        spellKey: canonicalKey(spellName),
        spellName,
        chance,
        oneChanceIn: null,
      });
    };
    for (const onDeath of onDeathRecords) {
      const percent = xmlAttribute(onDeath, "percent");
      addBehaviorTrigger(
        onDeath,
        "on-death",
        "spell",
        percent === undefined
          ? null
          : integerValue(
              percent,
              0,
              context,
              provenance,
              "monster on-death chance",
              currentEntityId,
              0,
              100,
            ),
      );
    }
    if (dash) {
      if (xmlAttribute(dash, "hitspell") !== undefined) {
        addBehaviorTrigger(dash, "dash-hit", "hitspell", dashChance);
      }
      if (xmlAttribute(dash, "missspell") !== undefined) {
        addBehaviorTrigger(dash, "dash-miss", "missspell", dashChance);
      }
    }
    if (charge && xmlAttribute(charge, "spell") !== undefined) {
      addBehaviorTrigger(charge, "charge", "spell", chargeChance);
    }
    triggers.sort(
      (left, right) =>
        (monsterSpellTriggerKindRanks.get(left.kind) ?? 0) -
          (monsterSpellTriggerKindRanks.get(right.kind) ?? 0) ||
        compareCodeUnits(left.spellKey, right.spellKey) ||
        (left.oneChanceIn ?? -1) - (right.oneChanceIn ?? -1),
    );
    const drops: MonsterDrop[] = [];
    for (const drop of xmlChildren(record, "drop")) {
      const itemName = xmlAttribute(drop, "name");
      const dropType = xmlAttribute(drop, "type");
      if (!itemName && !dropType) {
        context.diagnostics.push({
          severity: "warning",
          code: "missing_monster_drop_target",
          message:
            "A monster drop is missing both its item name and drop type.",
          source: provenance,
          entityId: currentEntityId,
        });
        continue;
      }
      drops.push({
        ...(itemName
          ? { itemName, itemKey: canonicalKey(itemName) }
          : { dropType: dropType! }),
        chance: integerValue(
          xmlAttribute(drop, "percent"),
          100,
          context,
          provenance,
          "monster drop chance",
          currentEntityId,
          0,
          100,
        ),
      });
    }
    const monster: Monster = {
      ...baseEntity(
        "monster",
        name,
        childAttribute(record, "info", "text") ?? "",
        provenance,
      ),
      taxonomy: xmlAttribute(record, "taxa") ?? "",
      level: normalizedLevel,
      depth: sourceLevel === undefined ? null : normalizedLevel + 1,
      special: booleanAttribute(
        record,
        "special",
        context,
        provenance,
        "monster special",
        currentEntityId,
      ),
      iconPath: normalizeMonsterIconPath(
        childAttribute(record, "idleSprite", "down"),
        context,
        provenance,
        currentEntityId,
      ),
      paletteName: palette
        ? normalizeMonsterPaletteName(
            xmlAttribute(palette, "name"),
            context,
            provenance,
            currentEntityId,
          )
        : null,
      paletteTint:
        paletteTint === undefined
          ? null
          : integerValue(
              paletteTint,
              0,
              context,
              provenance,
              "palette tint",
              currentEntityId,
            ),
      archetypeLevels: {
        fighter: integerValue(
          stats ? xmlAttribute(stats, "numFig") : undefined,
          0,
          context,
          provenance,
          "fighter level",
          currentEntityId,
          0,
        ),
        rogue: integerValue(
          stats ? xmlAttribute(stats, "numRog") : undefined,
          0,
          context,
          provenance,
          "rogue level",
          currentEntityId,
          0,
        ),
        wizard: integerValue(
          stats ? xmlAttribute(stats, "numWiz") : undefined,
          0,
          context,
          provenance,
          "wizard level",
          currentEntityId,
          0,
        ),
      },
      ai: {
        aggressiveness:
          aggressivenessText === undefined
            ? null
            : integerValue(
                aggressivenessText,
                0,
                context,
                provenance,
                "monster AI aggressiveness",
                currentEntityId,
                0,
              ),
        span:
          spanText === undefined
            ? null
            : integerValue(
                spanText,
                0,
                context,
                provenance,
                "monster AI span",
                currentEntityId,
                0,
              ),
        invisible:
          invisibleText === undefined
            ? null
            : optionalBooleanAttribute(
                ai!,
                "invisible",
                context,
                provenance,
                "monster AI invisible flag",
                currentEntityId,
              ),
        chicken:
          chickenText === undefined
            ? null
            : optionalBooleanAttribute(
                ai!,
                "chicken",
                context,
                provenance,
                "monster AI chicken flag",
                currentEntityId,
              ),
        canCharm:
          canCharmText === undefined
            ? null
            : optionalBooleanAttribute(
                ai!,
                "cancharm",
                context,
                provenance,
                "monster AI charm flag",
                currentEntityId,
              ),
        canParalyze:
          canParalyzeText === undefined
            ? null
            : optionalBooleanAttribute(
                ai!,
                "canparalyze",
                context,
                provenance,
                "monster AI paralyze flag",
                currentEntityId,
              ),
        stealGold:
          stealGoldText === undefined
            ? null
            : optionalBooleanAttribute(
                ai!,
                "stealgold",
                context,
                provenance,
                "monster AI steal-gold flag",
                currentEntityId,
              ),
        stealPercentage:
          stealPercentageText === undefined
            ? null
            : integerValue(
                stealPercentageText,
                0,
                context,
                provenance,
                "monster AI steal percentage",
                currentEntityId,
                0,
                100,
              ),
      },
      sight: {
        cone:
          sightConeText === undefined
            ? null
            : numberValue(
                sightConeText,
                0,
                context,
                provenance,
                "monster sight cone",
                currentEntityId,
                0,
              ),
        modifier:
          sightModifierText === undefined
            ? null
            : numberValue(
                sightModifierText,
                0,
                context,
                provenance,
                "monster sight modifier",
                currentEntityId,
                0,
              ),
      },
      movement: {
        dig: dig
          ? {
              chance: optionalMovementInteger(
                dig,
                "percent",
                "monster dig chance",
                100,
              ),
              ambushChance: optionalMovementInteger(
                dig,
                "ambushpercent",
                "monster dig ambush chance",
                100,
              ),
              blockedChance: optionalMovementInteger(
                dig,
                "blockedpercent",
                "monster dig blocked chance",
                100,
              ),
              minimumTurns: optionalMovementInteger(
                dig,
                "minturns",
                "monster dig minimum turns",
              ),
              maximumTurns: optionalMovementInteger(
                dig,
                "maxTurns",
                "monster dig maximum turns",
              ),
              minimumDistance: optionalMovementInteger(
                dig,
                "mindistance",
                "monster dig minimum distance",
              ),
            }
          : null,
        dash: dash
          ? {
              chance: dashChance,
              speed: optionalMovementInteger(
                dash,
                "speed",
                "monster dash speed",
              ),
              minimumDistance: optionalMovementInteger(
                dash,
                "mindistance",
                "monster dash minimum distance",
              ),
              interruptible: optionalBooleanAttribute(
                dash,
                "interruptable",
                context,
                provenance,
                "monster dash interruptible flag",
                currentEntityId,
              ),
            }
          : null,
        charge: charge
          ? {
              chance: chargeChance,
              range: optionalMovementInteger(
                charge,
                "range",
                "monster charge range",
              ),
              turns: optionalMovementInteger(
                charge,
                "turns",
                "monster charge turns",
              ),
              interruptible: optionalBooleanAttribute(
                charge,
                "interruptable",
                context,
                provenance,
                "monster charge interruptible flag",
                currentEntityId,
              ),
              blocksAction: optionalBooleanAttribute(
                charge,
                "blockaction",
                context,
                provenance,
                "monster charge blocks-action flag",
                currentEntityId,
              ),
              targetsSelf: optionalBooleanAttribute(
                charge,
                "targetself",
                context,
                provenance,
                "monster charge targets-self flag",
                currentEntityId,
              ),
            }
          : null,
      },
      presentation: {
        soundEffects: soundEffects
          ? {
              attack: sourceReference(soundEffects, "attack"),
              death: sourceReference(soundEffects, "die"),
              hit: sourceReference(soundEffects, "hit"),
              spell: sourceReference(soundEffects, "spell"),
              digIn: sourceReference(soundEffects, "dig_in"),
              digOut: sourceReference(soundEffects, "dig_out"),
            }
          : null,
        attack: directionalSprite(attackSprite, "attackSprite"),
        hit: directionalSprite(hitSprite, "hitSprite"),
        death: deathSprite
          ? { name: normalizePresentationAsset(deathSprite, "name") }
          : null,
        cast: castSprite
          ? { name: normalizePresentationAsset(castSprite, "name") }
          : null,
        beam: directionalSprite(beamSprite, "beamSprite"),
        morph: morphSprites
          ? {
              drink: normalizePresentationAsset(morphSprites, "drinkSprite"),
              eat: normalizePresentationAsset(morphSprites, "eatSprite"),
              femaleLevelUp: normalizePresentationAsset(
                morphSprites,
                "levelupfSprite",
              ),
              maleLevelUp: normalizePresentationAsset(
                morphSprites,
                "levelupmSprite",
              ),
              longIdle: normalizePresentationAsset(
                morphSprites,
                "longidleSprite",
              ),
              vanish: normalizePresentationAsset(morphSprites, "vanishSprite"),
            }
          : null,
        dig: digSprites
          ? {
              down: normalizePresentationAsset(digSprites, "downSprite"),
              up: normalizePresentationAsset(digSprites, "upSprite"),
            }
          : null,
      },
      experienceValue:
        !stats || xmlAttribute(stats, "xpValue") === undefined
          ? null
          : integerValue(
              xmlAttribute(stats, "xpValue"),
              0,
              context,
              provenance,
              "experience value",
              currentEntityId,
              0,
            ),
      modifiers: parseStatModifiers(
        record,
        context,
        provenance,
        currentEntityId,
        "monster",
      ),
      spellChance,
      triggers,
      drops,
      ...(parentName
        ? { inheritsName: parentName, inheritsKey: canonicalKey(parentName) }
        : {}),
    };
    reportUnknownChildren(
      context,
      record,
      new Set([
        "info",
        "idleSprite",
        "palette",
        "stats",
        "damage",
        "resistances",
        "primarybuff",
        "primaryBuff",
        "secondarybuff",
        "secondaryBuff",
        "spell",
        "onhit",
        "onHit",
        "drop",
        "monster",
        "ai",
        "sight",
        "dig",
        "dash",
        "charge",
        "ondeath",
        "sfx",
        "attackSprite",
        "hitSprite",
        "dieSprite",
        "castSpellSprite",
        "beamSprite",
        "morphsprites",
        "digSprites",
      ]),
      currentEntityId,
    );
    addCandidate(result.monsters, monster, context.source.precedence);
  }
}

function parseStats(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "stat")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "A <stat> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("stat", name);
    const modifierKind = xmlAttribute(record, "modifierKind");
    const modifierSourceKey = xmlAttribute(record, "sourceKey");
    const hasModifierKind = modifierKind !== undefined;
    const hasModifierSourceKey = modifierSourceKey !== undefined;
    let modifier: Stat["modifier"] = null;
    if (hasModifierKind !== hasModifierSourceKey) {
      context.diagnostics.push({
        severity: "error",
        code: "incomplete_stat_modifier_selector",
        message: `${name} must declare modifierKind and sourceKey together.`,
        source: provenance,
        entityId: currentEntityId,
      });
    } else if (modifierKind !== undefined && modifierSourceKey !== undefined) {
      if (!(statModifierKinds as readonly string[]).includes(modifierKind)) {
        context.diagnostics.push({
          severity: "error",
          code: "invalid_stat_modifier_kind",
          message: `${name} declares an unsupported modifier kind: ${modifierKind}.`,
          source: provenance,
          entityId: currentEntityId,
          details: { modifierKind },
        });
      } else if (modifierSourceKey.trim().length === 0) {
        context.diagnostics.push({
          severity: "error",
          code: "invalid_stat_modifier_source_key",
          message: `${name} declares an empty modifier source key.`,
          source: provenance,
          entityId: currentEntityId,
        });
      } else {
        modifier = {
          kind: modifierKind as StatModifierKind,
          sourceKey: modifierSourceKey,
        };
      }
    }
    const stat: Stat = {
      ...baseEntity(
        "stat",
        name,
        xmlAttribute(record, "description") ?? "",
        provenance,
      ),
      group: xmlAttribute(record, "group") ?? "unknown",
      modifier,
    };
    reportUnknownLeafContent(
      context,
      record,
      "stat",
      new Set([
        "id",
        "name",
        "group",
        "description",
        "modifierKind",
        "sourceKey",
      ]),
      provenance,
      stat.id,
      true,
    );
    addCandidate(result.stats, stat, context.source.precedence);
  }
}

function parseTemplates(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "template")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      context.diagnostics.push({
        severity: "error",
        code: "missing_entity_name",
        message: "A <template> is missing its required name attribute.",
        source: context.parsed.locateRecord(record),
      });
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, record, name, originalId);
    const currentEntityId = entityId("template", name);
    const template: Template = {
      ...baseEntity("template", name, "", provenance),
      affectsPlayer: booleanAttribute(
        record,
        "affectsPlayer",
        context,
        provenance,
        "template affects player",
        currentEntityId,
      ),
      rows: xmlChildren(record, "row")
        .map((row) => xmlAttribute(row, "text") ?? "")
        .filter(Boolean),
    };
    reportUnknownChildren(context, record, new Set(["row"]), template.id);
    addCandidate(result.templates, template, context.source.precedence);
  }
}

export function parseDatabase(
  kind: DatabaseKind,
  context: NormalizationContext,
): CandidateCollections {
  const result = emptyCandidateCollections();
  switch (kind) {
    case "items":
      parseItems(context, result);
      break;
    case "recipes":
      parseRecipes(context, result);
      break;
    case "encrustments":
      parseEncrustments(context, result);
      break;
    case "skills":
      parseSkills(context, result);
      break;
    case "spells":
      parseSpells(context, result);
      break;
    case "monsters":
      parseMonsters(context, result);
      break;
    case "stats":
      parseStats(context, result);
      break;
    case "templates":
      parseTemplates(context, result);
      break;
  }
  return result;
}

export function mergeCandidateCollections(
  target: CandidateCollections,
  source: CandidateCollections,
): void {
  target.items.push(...source.items);
  target.recipes.push(...source.recipes);
  target.encrustments.push(...source.encrustments);
  target.encrustmentInstabilityEffects.push(
    ...source.encrustmentInstabilityEffects,
  );
  target.skills.push(...source.skills);
  target.abilities.push(...source.abilities);
  target.spells.push(...source.spells);
  target.monsters.push(...source.monsters);
  target.stats.push(...source.stats);
  target.templates.push(...source.templates);
}
