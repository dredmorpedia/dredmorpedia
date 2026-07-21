import { existsSync } from "node:fs";

import {
  canonicalKey,
  entityId,
  itemTriggerKinds,
  slugify,
  type Ability,
  type Encrustment,
  type EncrustmentInstabilityEffect,
  type EncrustmentPower,
  type EntityCandidate,
  type EntityKind,
  type EntityProvenance,
  type Item,
  type ItemTrigger,
  type ItemTriggerKind,
  type Monster,
  type MonsterDrop,
  type MonsterSpellTrigger,
  type NormalizedEntityBase,
  type Recipe,
  type Skill,
  type Spell,
  type SpellTrigger,
  type SourceFlag,
  type StatModifier,
  type StatModifierKind,
  type Stat,
  type SkillProgressionTag,
  type Template,
} from "@dredmorpedia/domain";

import type { DatabaseKind, SourceDefinition } from "./manifest";
import {
  PathBoundaryError,
  resolveExistingWithin,
  toPosixPath,
} from "./safe-path";
import type { DiagnosticDraft, ParsedXml, XmlRecord } from "./xml-adapter";
import {
  collectElements,
  collectNestedElements,
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

export interface NormalizationContext {
  source: SourceDefinition;
  assetRoots: readonly {
    absolutePath: string;
    displayPath: string;
  }[];
  file: string;
  parsed: ParsedXml;
  diagnostics: DiagnosticDraft[];
  registerInput: (absolutePath: string, displayPath: string) => void;
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
  if (Object.hasOwn(record, "armour")) {
    return childAttribute(record, "armour", "level");
  }
  if (Object.hasOwn(record, "trap")) {
    return childAttribute(record, "trap", "level");
  }
  return undefined;
}

const directItemTriggerSpecs: readonly {
  childName: string;
  kind: ItemTriggerKind;
}[] = [
  { childName: "targetHitEffectBuff", kind: "melee-target" },
  { childName: "crossbowShotBuff", kind: "crossbow-target" },
  { childName: "thrownBuff", kind: "thrown-target" },
  { childName: "targetKillBuff", kind: "kill-target" },
  { childName: "playerHitEffectBuff", kind: "melee-self" },
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

const itemTriggerKindRanks = new Map(
  itemTriggerKinds.map((kind, index) => [kind, index]),
);

const partiallySupportedItemChildren = new Set([
  "armour",
  "blockBuff",
  "casts",
  "counterBuff",
  "criticalBuff",
  "crossbowShotBuff",
  "dodgeBuff",
  "effect",
  "food",
  "mushroom",
  "playerHitEffectBuff",
  "potion",
  "spell",
  "targetHitEffectBuff",
  "targetKillBuff",
  "thrownBuff",
  "trap",
  "triggeroncast",
  "triggerondodge",
  "wand",
  "weapon",
]);

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
    unresistable: xmlAttribute(record, "resistable") === "0",
    monsterTaxonomy: xmlAttribute(record, "taxa") ?? null,
  };
}

function compareSpellTriggers(left: SpellTrigger, right: SpellTrigger): number {
  return (
    (itemTriggerKindRanks.get(left.kind) ?? 0) -
      (itemTriggerKindRanks.get(right.kind) ?? 0) ||
    left.spellKey.localeCompare(right.spellKey, "en") ||
    (left.chance ?? -1) - (right.chance ?? -1) ||
    left.delay - right.delay ||
    left.duration - right.duration ||
    Number(left.unresistable) - Number(right.unresistable) ||
    (left.monsterTaxonomy ?? "").localeCompare(
      right.monsterTaxonomy ?? "",
      "en",
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
    addTriggers(xmlChildren(record, spec.childName), spec.kind, [
      "name",
      "spell",
    ]);
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
  addTriggers(
    xmlChildren(record, "trap").filter(
      (child) => xmlAttribute(child, "casts") !== undefined,
    ),
    "stepped-on",
    ["casts"],
  );
  addTriggers(
    xmlChildren(record, "wand").filter(
      (child) => xmlAttribute(child, "spell") !== undefined,
    ),
    "zapped",
    ["spell"],
  );
  addTriggers(
    xmlChildren(record, "potion").filter(
      (child) => xmlAttribute(child, "spell") !== undefined,
    ),
    "quaffed",
    ["spell"],
  );
  if (Object.hasOwn(record, "mushroom")) {
    addTriggers(
      xmlChildren(record, "casts").filter(
        (child) => xmlAttribute(child, "spell") !== undefined,
      ),
      "munched",
      ["spell"],
    );
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

function booleanAttribute(record: XmlRecord, name: string): boolean {
  const value = xmlAttribute(record, name);
  return value === "1" || value === "true";
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

  if (minimum === undefined) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  } else {
    const parsed = Number(value);
    if (
      Number.isInteger(parsed) &&
      parsed >= minimum &&
      (maximum === undefined || parsed <= maximum)
    ) {
      return parsed;
    }
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

  const parsed = Number(value);
  if (
    Number.isFinite(parsed) &&
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

function provenanceFor(
  context: NormalizationContext,
  tag: string,
  name: string,
  originalId?: string,
): EntityProvenance {
  return {
    ...context.parsed.locateElement(tag, name, originalId),
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

function reportUnknownChildren(
  context: NormalizationContext,
  record: XmlRecord,
  allowedChildren: ReadonlySet<string>,
  currentEntityId: string,
  partiallySupportedChildren: ReadonlySet<string> = new Set(),
): void {
  for (const key of Object.keys(record).sort((left, right) =>
    left.localeCompare(right, "en"),
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
      source: context.parsed.locateElement(key),
      entityId: currentEntityId,
      details: { element: key },
    });
  }
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
        source: context.parsed.locateElement("item"),
      });
      continue;
    }

    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "item", name, originalId);
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
      .sort((left, right) => left.statKey.localeCompare(right.statKey, "en"));

    const item: Item = {
      ...baseEntity(
        "item",
        name,
        childAttribute(record, "description", "text") ?? "",
        provenance,
      ),
      category: xmlAttribute(record, "type") ?? "unknown",
      price,
      quality: integerValue(
        itemQualityAttribute(record),
        0,
        context,
        provenance,
        "item quality",
        currentEntityId,
        0,
      ),
      iconPath: normalizeAssetPath(
        xmlAttribute(record, "iconFile"),
        context,
        provenance,
        currentEntityId,
      ),
      stats,
      triggers: parseItemTriggers(record, context, provenance, currentEntityId),
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["description", "price", "stat"]),
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
    const provenance = provenanceFor(context, "craft", name, originalId);
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
            ),
          };
        })
        .filter(
          (reference): reference is NonNullable<typeof reference> =>
            reference !== null,
        );
    const recipe: Recipe = {
      ...baseEntity("recipe", name, "", provenance),
      tool: childAttribute(record, "tool", "tag") ?? "unknown",
      hidden: booleanAttribute(record, "hidden"),
      skillLevel: Math.max(
        0,
        ...outputRecords.map((output) =>
          integerValue(
            xmlAttribute(output, "skill"),
            0,
            context,
            provenance,
            "skill",
            currentEntityId,
          ),
        ),
      ),
      inputs: references(xmlChildren(record, "input")),
      outputs: references(outputRecords),
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

const statModifierDamageKeys = new Set([
  "acidic",
  "aethereal",
  "asphyxiative",
  "blasting",
  "conflagratory",
  "crushing",
  "existential",
  "hyperborean",
  "necromantic",
  "piercing",
  "putrefying",
  "righteous",
  "slashing",
  "toxic",
  "transmutative",
  "voltaic",
]);

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
  ownerLabel: "ability" | "encrustment" | "monster",
): StatModifier[] {
  const modifiers: StatModifier[] = [];
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
            message: `Unsupported ${kind} modifier key: ${sourceKey}.`,
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
            `${ownerLabel} ${kind}:${sourceKey}`,
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
          message: `An ${ownerLabel} ${kind} modifier is missing its source stat ID.`,
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
          `${ownerLabel} ${kind}:${sourceKey}`,
          currentEntityId,
        ),
      });
    }
  };
  addIndexedModifiers("primarybuff", "primary");
  addIndexedModifiers("secondarybuff", "secondary");

  return modifiers.sort(
    (left, right) =>
      statModifierKindRanks[left.kind] - statModifierKindRanks[right.kind] ||
      left.sourceKey.localeCompare(right.sourceKey, "en") ||
      left.amount - right.amount,
  );
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
        left.name.localeCompare(right.name, "en") ||
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
        source: context.parsed.locateElement("encrust"),
      });
      continue;
    }

    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "encrust", name, originalId);
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
    ].sort((left, right) => left.localeCompare(right, "en"));
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
      hidden: booleanAttribute(record, "hidden"),
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
        source: context.parsed.locateElement("unstableEffect"),
      });
      continue;
    }

    const provenance = provenanceFor(context, "unstableEffect", name);
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
        left.sourceKey.localeCompare(right.sourceKey, "en") ||
        left.value.localeCompare(right.value, "en"),
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
        left.level - right.level || left.name.localeCompare(right.name, "en"),
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
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "skill", name, originalId);
    const currentEntityId = entityId("skill", name);
    const loadouts = xmlChildren(record, "loadout").map((loadout) => {
      const itemName = xmlAttribute(loadout, "subtype");
      const itemType = xmlAttribute(loadout, "type");
      return {
        ...(itemName ? { itemKey: canonicalKey(itemName), itemName } : {}),
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
        always: booleanAttribute(loadout, "always"),
      };
    });
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
        .sort((left, right) => left.localeCompare(right, "en")),
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
    if (!name || !skillReference) {
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "ability", name, originalId);
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
      startSkill: booleanAttribute(record, "startSkill"),
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
        .sort((left, right) => left.localeCompare(right, "en")),
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

function parseSpells(
  context: NormalizationContext,
  result: CandidateCollections,
): void {
  for (const record of collectElements(context.parsed.document, "spell")) {
    const name = xmlAttribute(record, "name");
    if (!name) {
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "spell", name, originalId);
    const currentEntityId = entityId("spell", name);
    const effects = xmlChildren(record, "effect")
      .map((effect) => {
        const spellName = xmlAttribute(effect, "spell");
        const statName = xmlAttribute(effect, "stat");
        const amountText = xmlAttribute(effect, "amount");
        return {
          type: xmlAttribute(effect, "type") ?? "unknown",
          ...(spellName
            ? { spellName, spellKey: canonicalKey(spellName) }
            : {}),
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
        };
      })
      .sort((left, right) => left.type.localeCompare(right.type, "en"));
    const spell: Spell = {
      ...baseEntity(
        "spell",
        name,
        childAttribute(record, "description", "text") ?? "",
        provenance,
      ),
      spellType: xmlAttribute(record, "type") ?? "unknown",
      iconPath: normalizeAssetPath(
        xmlAttribute(record, "icon"),
        context,
        provenance,
        currentEntityId,
      ),
      effects,
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["description", "effect"]),
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
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "monster", name, originalId);
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
    triggers.sort(
      (left, right) =>
        Number(left.kind === "cast-when-aware") -
          Number(right.kind === "cast-when-aware") ||
        left.spellKey.localeCompare(right.spellKey, "en") ||
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
      special: booleanAttribute(record, "special"),
      iconPath: normalizeAssetPath(
        childAttribute(record, "idleSprite", "down"),
        context,
        provenance,
        currentEntityId,
      ),
      paletteName: palette ? (xmlAttribute(palette, "name") ?? null) : null,
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
      ]),
      currentEntityId,
      new Set(["ai"]),
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
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "stat", name, originalId);
    const stat: Stat = {
      ...baseEntity(
        "stat",
        name,
        xmlAttribute(record, "description") ?? "",
        provenance,
      ),
      group: xmlAttribute(record, "group") ?? "unknown",
    };
    reportUnknownChildren(context, record, new Set(), stat.id);
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
      continue;
    }
    const originalId = xmlAttribute(record, "id");
    const provenance = provenanceFor(context, "template", name, originalId);
    const template: Template = {
      ...baseEntity("template", name, "", provenance),
      affectsPlayer: booleanAttribute(record, "affectsPlayer"),
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
