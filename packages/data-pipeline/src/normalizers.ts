import { existsSync } from "node:fs";

import {
  canonicalKey,
  entityId,
  slugify,
  type Ability,
  type EntityCandidate,
  type EntityKind,
  type EntityProvenance,
  type Item,
  type Monster,
  type NormalizedEntityBase,
  type Recipe,
  type Skill,
  type Spell,
  type Stat,
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
): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected an integer for ${field}; used ${fallback} instead.`,
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
    name,
    description,
    provenance,
    variants: [provenance],
    appliedOverrides: [],
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
): void {
  for (const key of Object.keys(record).sort((left, right) =>
    left.localeCompare(right, "en"),
  )) {
    if (key.startsWith("@") || allowedChildren.has(key)) {
      continue;
    }

    context.diagnostics.push({
      severity: "warning",
      code: "unknown_element",
      message: `Unsupported <${key}> element was preserved only as a diagnostic.`,
      source: context.parsed.locateElement(key),
      entityId: currentEntityId,
      details: { element: key },
    });
  }
}

function addCandidate<
  T extends Item | Recipe | Skill | Ability | Spell | Monster | Stat | Template,
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
      iconPath: normalizeAssetPath(
        xmlAttribute(record, "iconFile"),
        context,
        provenance,
        currentEntityId,
      ),
      stats,
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["description", "price", "stat"]),
      currentEntityId,
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
      loadoutItemKeys: xmlChildren(record, "loadout")
        .map((loadout) => xmlAttribute(loadout, "subtype"))
        .filter((value): value is string => Boolean(value))
        .map(canonicalKey)
        .sort((left, right) => left.localeCompare(right, "en")),
      abilityIds: [],
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["art", "loadout"]),
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
      spellKeys: xmlChildren(record, "spell")
        .map((spell) => xmlAttribute(spell, "name"))
        .filter((value): value is string => Boolean(value))
        .map(canonicalKey)
        .sort((left, right) => left.localeCompare(right, "en")),
      spellIds: [],
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["description", "spell"]),
      currentEntityId,
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
    const monster: Monster = {
      ...baseEntity(
        "monster",
        name,
        childAttribute(record, "info", "text") ?? "",
        provenance,
      ),
      taxonomy: xmlAttribute(record, "taxa") ?? "",
      level: integerValue(
        xmlAttribute(record, "level"),
        0,
        context,
        provenance,
        "level",
        currentEntityId,
      ),
      iconPath: normalizeAssetPath(
        childAttribute(record, "idleSprite", "down"),
        context,
        provenance,
        currentEntityId,
      ),
      ...(parentName
        ? { inheritsName: parentName, inheritsKey: canonicalKey(parentName) }
        : {}),
    };
    reportUnknownChildren(
      context,
      record,
      new Set(["info", "idleSprite", "stats", "monster"]),
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
      context.diagnostics.push({
        severity: "warning",
        code: "unsupported_database_kind",
        message:
          "Encrustment databases are inventoried but not normalized by the architecture spike.",
        source: {
          sourceId: context.source.id,
          file: context.file,
          line: 1,
          column: 1,
        },
        details: { kind },
      });
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
  target.skills.push(...source.skills);
  target.abilities.push(...source.abilities);
  target.spells.push(...source.spells);
  target.monsters.push(...source.monsters);
  target.stats.push(...source.stats);
  target.templates.push(...source.templates);
}
