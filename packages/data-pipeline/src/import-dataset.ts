import { existsSync } from "node:fs";
import path from "node:path";

import {
  allocateEntityRoutes,
  applyEntityPatch,
  applyMonsterInheritance,
  canonicalKey,
  classifyRelationshipAsSourceOnly,
  compareCodeUnits,
  createSearchDocuments,
  resolveRelationshipWithReviewedCorrection,
  resolveRelationshipExactly,
  resolveEntityCandidates,
  separateRepeatedNamedDeclarations,
  skillAbilityRelationships,
  type Ability,
  type DatasetArtifact,
  type Diagnostic,
  type DiagnosticCounts,
  type Encrustment,
  type EncrustmentInstabilityEffect,
  type EntityCollections,
  type EntityPatchDefinition,
  type EntityProvenance,
  type InputChecksum,
  type Item,
  type ItemReference,
  type Monster,
  type NormalizedEntity,
  type Recipe,
  type SearchArtifact,
  type Skill,
  type PresentedAssetKind,
  type SourceLocation,
  type Spell,
  type SpellEffect,
  type SpellEffectBuffCondition,
  type Stat,
  type StatModifier,
  type Template,
} from "@dredmorpedia/domain";

import { loadManifest, resolveSourceRoot, sourceRootBase } from "./manifest";
import { firstMonsterFramePath } from "./monster-art";
import {
  InputSnapshots,
  type RegisteredInputSnapshot,
} from "./input-snapshots";
import {
  emptyCandidateCollections,
  mergeCandidateCollections,
  parseDatabase,
  type CandidateCollections,
} from "./normalizers";
import { parsePatchDefinition } from "./patches";
import {
  itemCorrectionReview,
  sourceOnlyItemReview,
  type ReviewedItemRelationship,
} from "./relationship-reviews";
import {
  parseRouteRegistry,
  resolveRouteRegistry,
  type RouteRegistryDefinition,
} from "./route-registry";
import {
  compareDiagnosticDrafts,
  compareEncrustmentInstabilityEffects,
} from "./output-ordering";
import { isPathWithin, resolveExistingWithin, toPosixPath } from "./safe-path";
import { sha256, stableSerialize } from "./serialization";
import { parseXml, type DiagnosticDraft } from "./xml-adapter";

export interface ImportDatasetOptions {
  manifestPath: string;
  repositoryRoot: string;
  requirePublishedRoutes?: boolean;
}

export interface ImportDatasetResult {
  artifact: DatasetArtifact;
  search: SearchArtifact;
  diagnostics: Diagnostic[];
  inputs: InputChecksum[];
  sourceManifest: string;
  sourceRoots: string[];
  presentedAssetInputs: PresentedAssetInput[];
}

export interface MonsterAppearanceSources {
  iconPath: string | null;
  paletteName: string | null;
}

export interface PresentedAssetInput {
  kind: PresentedAssetKind;
  entityId: string;
  sourceId: string;
  sourcePath: string;
  snapshot: RegisteredInputSnapshot | null;
  paletteTint?: number | null;
  paletteSnapshot?: RegisteredInputSnapshot | null;
  issue?: { code: string; message: string };
}

interface ResolvedSource {
  source: ReturnType<typeof loadManifest>["manifest"]["sources"][number];
  absolutePath: string;
  displayPath: string;
}

interface LinkedMonsterResult {
  monsters: Monster[];
  appearanceSources: Record<string, MonsterAppearanceSources>;
}

interface ResolvedCollectionsResult {
  entities: EntityCollections;
  monsterAppearanceSources: Record<string, MonsterAppearanceSources>;
}

function resolveMonsterAppearanceSources(
  localMonsters: readonly Monster[],
  resolvedMonsters: readonly Monster[],
): Record<string, MonsterAppearanceSources> {
  const localById = new Map(
    localMonsters.map((monster) => [monster.id, monster]),
  );
  const resolvedById = new Map(
    resolvedMonsters.map((monster) => [monster.id, monster]),
  );
  const resolved = new Map<string, MonsterAppearanceSources>();

  function resolve(
    monster: Monster,
    visiting: Set<string>,
  ): MonsterAppearanceSources {
    const cached = resolved.get(monster.id);
    if (cached) {
      return cached;
    }
    if (visiting.has(monster.id)) {
      const local = {
        iconPath:
          monster.iconPath === null ? null : monster.provenance.sourceId,
        paletteName:
          monster.paletteName === null ? null : monster.provenance.sourceId,
      };
      resolved.set(monster.id, local);
      return local;
    }

    const nextVisiting = new Set(visiting).add(monster.id);
    const localMonster = localById.get(monster.id) ?? monster;
    const parent = monster.inheritsId
      ? resolvedById.get(monster.inheritsId)
      : undefined;
    const parentSources = parent ? resolve(parent, nextVisiting) : null;
    const sources = {
      iconPath:
        monster.iconPath === null
          ? null
          : localMonster.iconPath !== null
            ? localMonster.provenance.sourceId
            : (parentSources?.iconPath ?? monster.provenance.sourceId),
      paletteName:
        monster.paletteName === null
          ? null
          : localMonster.paletteName !== null
            ? localMonster.provenance.sourceId
            : (parentSources?.paletteName ?? monster.provenance.sourceId),
    };
    resolved.set(monster.id, sources);
    return sources;
  }

  return Object.fromEntries(
    resolvedMonsters.map((monster) => [
      monster.id,
      resolve(monster, new Set()),
    ]),
  );
}

function sourceLocation(provenance: EntityProvenance): SourceLocation {
  return {
    sourceId: provenance.sourceId,
    file: provenance.file,
    line: provenance.line,
    column: provenance.column,
  };
}

function finalizeDiagnostics(drafts: readonly DiagnosticDraft[]): Diagnostic[] {
  const occurrences = new Map<string, number>();

  return [...drafts].sort(compareDiagnosticDrafts).map((draft) => {
    const normalizedDraft: DiagnosticDraft = {
      severity: draft.severity,
      code: draft.code,
      message: draft.message,
      ...(draft.source ? { source: { ...draft.source } } : {}),
      ...(draft.entityId ? { entityId: draft.entityId } : {}),
      ...(draft.details ? { details: draft.details } : {}),
    };
    const signature = sha256(stableSerialize(normalizedDraft)).slice(0, 12);
    const occurrence = (occurrences.get(signature) ?? 0) + 1;
    occurrences.set(signature, occurrence);
    return {
      id: `${draft.code}:${signature}${occurrence > 1 ? `-${occurrence}` : ""}`,
      ...normalizedDraft,
    };
  });
}

function collectIconAssetInputs(
  entities: readonly (NormalizedEntity & { iconPath: string | null })[],
  kind: PresentedAssetKind,
  resolvedSources: readonly ResolvedSource[],
  inputSnapshots: InputSnapshots,
): PresentedAssetInput[] {
  const sourceIndexes = new Map(
    resolvedSources.map(({ source }, index) => [source.id, index]),
  );

  return entities
    .filter((entity) => entity.iconPath !== null)
    .map((entity) => {
      const sourceIndex = sourceIndexes.get(entity.provenance.sourceId);
      if (sourceIndex === undefined) {
        throw new Error(
          `Unable to locate source ${entity.provenance.sourceId} for ${entity.id}.`,
        );
      }

      for (const resolvedSource of resolvedSources
        .slice(0, sourceIndex + 1)
        .reverse()) {
        if (resolvedSource.source.kind === "reference") {
          continue;
        }
        const displayPath = toPosixPath(
          `${resolvedSource.displayPath}/${entity.iconPath}`,
        );
        const snapshot = inputSnapshots.get(displayPath);
        if (snapshot) {
          return {
            kind,
            entityId: entity.id,
            sourceId: resolvedSource.source.id,
            sourcePath: entity.iconPath as string,
            snapshot,
          };
        }
      }

      return {
        kind,
        entityId: entity.id,
        sourceId: entity.provenance.sourceId,
        sourcePath: entity.iconPath as string,
        snapshot: null,
      };
    })
    .sort((left, right) => compareCodeUnits(left.entityId, right.entityId));
}

function collectPresentedAssetInputs(
  entities: Pick<
    EntityCollections,
    "items" | "skills" | "abilities" | "spells" | "monsters"
  >,
  resolvedSources: readonly ResolvedSource[],
  inputSnapshots: InputSnapshots,
  monsterAppearanceSources: Readonly<Record<string, MonsterAppearanceSources>>,
): PresentedAssetInput[] {
  return [
    ...collectUiAssetInputs(resolvedSources, inputSnapshots),
    ...collectIconAssetInputs(
      entities.items,
      "item-icon",
      resolvedSources,
      inputSnapshots,
    ),
    ...collectIconAssetInputs(
      entities.skills,
      "skill-icon",
      resolvedSources,
      inputSnapshots,
    ),
    ...collectIconAssetInputs(
      entities.abilities,
      "ability-icon",
      resolvedSources,
      inputSnapshots,
    ),
    ...collectIconAssetInputs(
      entities.spells,
      "spell-icon",
      resolvedSources,
      inputSnapshots,
    ),
    ...collectMonsterAssetInputs(
      entities.monsters,
      resolvedSources,
      inputSnapshots,
      monsterAppearanceSources,
    ),
  ].sort(
    (left, right) =>
      compareCodeUnits(left.kind, right.kind) ||
      compareCodeUnits(left.entityId, right.entityId),
  );
}

function collectUiAssetInputs(
  resolvedSources: readonly ResolvedSource[],
  inputSnapshots: InputSnapshots,
): PresentedAssetInput[] {
  const assets = new Map<string, PresentedAssetInput>();
  for (const resolvedSource of resolvedSources) {
    for (const asset of resolvedSource.source.presentedAssets ?? []) {
      const displayPath = toPosixPath(
        `${resolvedSource.displayPath}/${asset.path}`,
      );
      assets.set(asset.id, {
        kind: "ui-icon",
        entityId: asset.id,
        sourceId: resolvedSource.source.id,
        sourcePath: asset.path,
        snapshot: inputSnapshots.get(displayPath) ?? null,
      });
    }
  }
  return [...assets.values()].sort((left, right) =>
    compareCodeUnits(left.entityId, right.entityId),
  );
}

function collectMonsterAssetInputs(
  monsters: readonly Monster[],
  resolvedSources: readonly ResolvedSource[],
  inputSnapshots: InputSnapshots,
  appearanceSources: Readonly<Record<string, MonsterAppearanceSources>>,
): PresentedAssetInput[] {
  const sourceIndexes = new Map(
    resolvedSources.map(({ source }, index) => [source.id, index]),
  );

  return monsters
    .filter((monster) => monster.iconPath !== null)
    .map((monster) => {
      const monsterAppearanceSources = appearanceSources[monster.id];
      const iconSourceId = monsterAppearanceSources?.iconPath;
      if (
        !monsterAppearanceSources ||
        iconSourceId === null ||
        iconSourceId === undefined
      ) {
        throw new Error(
          `Unable to locate appearance provenance for ${monster.id}.`,
        );
      }
      const sourceIndex = sourceIndexes.get(iconSourceId);
      if (sourceIndex === undefined) {
        throw new Error(
          `Unable to locate source ${iconSourceId} for ${monster.id}.`,
        );
      }

      const eligibleSources = resolvedSources
        .slice(0, sourceIndex + 1)
        .reverse();
      const paletteSourceIndex = monsterAppearanceSources.paletteName
        ? sourceIndexes.get(monsterAppearanceSources.paletteName)
        : undefined;
      if (
        monster.paletteName?.toLowerCase().endsWith(".pal") &&
        paletteSourceIndex === undefined
      ) {
        throw new Error(`Unable to locate palette source for ${monster.id}.`);
      }
      const paletteSnapshot =
        monster.paletteName?.toLowerCase().endsWith(".pal") &&
        paletteSourceIndex !== undefined
          ? resolvedSources
              .slice(0, paletteSourceIndex + 1)
              .reverse()
              .filter(({ source }) => source.kind !== "reference")
              .map(({ displayPath }) =>
                inputSnapshots.get(
                  toPosixPath(`${displayPath}/${monster.paletteName}`),
                ),
              )
              .find((snapshot) => snapshot !== undefined)
          : undefined;
      const missingPaletteIssue =
        monster.paletteName?.toLowerCase().endsWith(".pal") && !paletteSnapshot
          ? {
              code: "missing_monster_palette",
              message:
                "The named monster palette is unavailable in the approved source roots.",
            }
          : undefined;

      for (const resolvedSource of eligibleSources) {
        if (resolvedSource.source.kind === "reference") {
          continue;
        }
        const iconPath = monster.iconPath as string;
        const displayPath = toPosixPath(
          `${resolvedSource.displayPath}/${iconPath}`,
        );
        const iconSnapshot = inputSnapshots.get(displayPath);
        if (!iconSnapshot) {
          continue;
        }

        if (path.posix.extname(iconPath).toLowerCase() !== ".xml") {
          return {
            kind: "monster-icon" as const,
            entityId: monster.id,
            sourceId: resolvedSource.source.id,
            sourcePath: iconPath,
            snapshot: iconSnapshot,
            paletteTint: monster.paletteTint,
            ...(paletteSnapshot ? { paletteSnapshot } : {}),
            ...(missingPaletteIssue ? { issue: missingPaletteIssue } : {}),
          };
        }

        const frame = firstMonsterFramePath(iconSnapshot.bytes, iconPath);
        if (!frame.ok) {
          return {
            kind: "monster-icon" as const,
            entityId: monster.id,
            sourceId: resolvedSource.source.id,
            sourcePath: iconPath,
            snapshot: null,
            paletteTint: monster.paletteTint,
            issue: {
              code: "invalid_monster_sprite_wrapper",
              message: frame.message,
            },
          };
        }
        const frameSnapshot = inputSnapshots.get(
          toPosixPath(`${resolvedSource.displayPath}/${frame.path}`),
        );
        return {
          kind: "monster-icon" as const,
          entityId: monster.id,
          sourceId: resolvedSource.source.id,
          sourcePath: frame.path,
          snapshot: frameSnapshot ?? null,
          paletteTint: monster.paletteTint,
          ...(paletteSnapshot ? { paletteSnapshot } : {}),
          ...(!frameSnapshot
            ? {
                issue: {
                  code: "missing_monster_sprite_frame",
                  message:
                    "The first frame referenced by the monster sprite wrapper is unavailable.",
                },
              }
            : missingPaletteIssue
              ? { issue: missingPaletteIssue }
              : {}),
        };
      }

      return {
        kind: "monster-icon" as const,
        entityId: monster.id,
        sourceId: iconSourceId,
        sourcePath: monster.iconPath as string,
        snapshot: null,
        paletteTint: monster.paletteTint,
      };
    })
    .sort((left, right) => compareCodeUnits(left.entityId, right.entityId));
}

function aliasesFor<T extends NormalizedEntity>(
  entities: readonly T[],
): Map<string, T> {
  const aliases = new Map<string, T>();
  for (const entity of entities) {
    aliases.set(entity.canonicalKey, entity);
    for (const variant of entity.variants) {
      if (variant.originalId) {
        aliases.set(canonicalKey(variant.originalId), entity);
      }
      aliases.set(canonicalKey(variant.originalName), entity);
    }
  }
  return aliases;
}

function danglingDiagnostic(
  entity: NormalizedEntity,
  targetKind: NormalizedEntity["kind"],
  reference: string,
): DiagnosticDraft {
  return {
    severity: "warning",
    code: "dangling_reference",
    message: `${entity.name} references an unknown ${targetKind}: ${reference}`,
    source: sourceLocation(entity.provenance),
    entityId: entity.id,
    details: { targetKind, reference },
  };
}

function statModifierSelectorKey(selector: {
  kind: StatModifier["kind"];
  sourceKey: string;
}): string {
  return `${selector.kind}:${selector.sourceKey}`;
}

function statModifierDefinitions(
  stats: readonly Stat[],
  diagnostics: DiagnosticDraft[],
): ReadonlyMap<string, Stat> {
  const definitions = new Map<string, Stat>();
  const ambiguousSelectors = new Set<string>();
  for (const stat of stats) {
    if (stat.modifier === null) {
      continue;
    }
    const selector = statModifierSelectorKey(stat.modifier);
    const previous = definitions.get(selector);
    if (previous) {
      definitions.delete(selector);
      ambiguousSelectors.add(selector);
      diagnostics.push({
        severity: "error",
        code: "duplicate_stat_modifier_selector",
        message: `${stat.name} and ${previous.name} both define modifier selector ${selector}.`,
        source: sourceLocation(stat.provenance),
        entityId: stat.id,
        details: { selector, conflictingEntityId: previous.id },
      });
      continue;
    }
    if (!ambiguousSelectors.has(selector)) {
      definitions.set(selector, stat);
    }
  }
  return definitions;
}

function linkStatModifiers(
  modifiers: readonly StatModifier[],
  definitions: ReadonlyMap<string, Stat>,
): StatModifier[] {
  return modifiers.map((modifier) => {
    const stat = definitions.get(statModifierSelectorKey(modifier));
    return stat ? { ...modifier, statId: stat.id } : modifier;
  });
}

interface RelationshipReviewContext {
  datasetId: string;
  datasetVersion: string;
  sourceVersions: ReadonlyMap<string, string>;
}

function reviewedSourceOnlyDiagnostic(
  entity: NormalizedEntity,
  reference: string,
  relationship: ReviewedItemRelationship,
  reviewId: string,
): DiagnosticDraft {
  return {
    severity: "info",
    code: "reviewed_source_only_reference",
    message: `${entity.name} preserves a reviewed source-only item label: ${reference}`,
    source: sourceLocation(entity.provenance),
    entityId: entity.id,
    details: { targetKind: "item", reference, relationship, reviewId },
  };
}

function reviewedCorrectionDiagnostic(
  entity: NormalizedEntity,
  reference: string,
  target: Item,
  relationship: ReviewedItemRelationship,
  reviewId: string,
): DiagnosticDraft {
  return {
    severity: "info",
    code: "reviewed_correction_reference",
    message: `${entity.name} applies a reviewed item-label correction: ${reference} to ${target.name}`,
    source: sourceLocation(entity.provenance),
    entityId: entity.id,
    details: {
      targetKind: "item",
      reference,
      targetId: target.id,
      relationship,
      reviewId,
    },
  };
}

function sourceOnlyReviewFor(
  entity: NormalizedEntity,
  relationship: ReviewedItemRelationship,
  sourceLabel: string,
  reviewContext: RelationshipReviewContext,
): string | null {
  return sourceOnlyItemReview({
    datasetId: reviewContext.datasetId,
    datasetVersion: reviewContext.datasetVersion,
    sourceId: entity.provenance.sourceId,
    sourceVersion: reviewContext.sourceVersions.get(entity.provenance.sourceId),
    ownerId: entity.id,
    relationship,
    sourceLabel,
  });
}

function correctionReviewFor(
  entity: NormalizedEntity,
  relationship: ReviewedItemRelationship,
  sourceLabel: string,
  reviewContext: RelationshipReviewContext,
) {
  return itemCorrectionReview({
    datasetId: reviewContext.datasetId,
    datasetVersion: reviewContext.datasetVersion,
    sourceId: entity.provenance.sourceId,
    sourceVersion: reviewContext.sourceVersions.get(entity.provenance.sourceId),
    ownerId: entity.id,
    relationship,
    sourceLabel,
  });
}

function linkItems(
  items: Item[],
  stats: readonly Stat[],
  spells: readonly Spell[],
  diagnostics: DiagnosticDraft[],
): Item[] {
  const statAliases = aliasesFor(stats);
  const spellAliases = aliasesFor(spells);
  return items.map((item) => ({
    ...item,
    stats: item.stats.map((value) => {
      const stat = statAliases.get(value.statKey);
      if (!stat) {
        diagnostics.push(danglingDiagnostic(item, "stat", value.statName));
        return value;
      }
      return { ...value, statId: stat.id };
    }),
    triggers: item.triggers.map((trigger) => {
      const spell = spellAliases.get(trigger.spellKey);
      if (!spell) {
        diagnostics.push(danglingDiagnostic(item, "spell", trigger.spellName));
        return trigger;
      }
      return { ...trigger, spellId: spell.id };
    }),
    macguffinDeclarations: item.macguffinDeclarations.map((declaration) => {
      if (declaration.spellKey === null || declaration.spellName === null) {
        return declaration;
      }
      const spell = spellAliases.get(declaration.spellKey);
      if (!spell) {
        diagnostics.push(
          danglingDiagnostic(item, "spell", declaration.spellName),
        );
        return declaration;
      }
      return { ...declaration, spellId: spell.id };
    }),
  }));
}

function linkRecipes(
  recipes: Recipe[],
  items: readonly Item[],
  diagnostics: DiagnosticDraft[],
): Recipe[] {
  const itemAliases = aliasesFor(items);
  return recipes.map((recipe) => {
    const link = <T extends ItemReference>(reference: T): T => {
      const item = itemAliases.get(reference.itemKey);
      if (!item) {
        diagnostics.push(
          danglingDiagnostic(recipe, "item", reference.itemName),
        );
        return reference;
      }
      return { ...reference, itemId: item.id };
    };
    return {
      ...recipe,
      inputs: recipe.inputs.map(link),
      outputs: recipe.outputs.map(link),
    };
  });
}

function linkEncrustments(
  encrustments: Encrustment[],
  items: readonly Item[],
  diagnostics: DiagnosticDraft[],
): Encrustment[] {
  const itemAliases = aliasesFor(items);
  return encrustments.map((encrustment) => ({
    ...encrustment,
    inputs: encrustment.inputs.map((reference) => {
      const item = itemAliases.get(reference.itemKey);
      if (!item) {
        diagnostics.push(
          danglingDiagnostic(encrustment, "item", reference.itemName),
        );
        return reference;
      }
      return { ...reference, itemId: item.id };
    }),
  }));
}

function linkEncrustmentInstabilityEffects(
  effects: readonly EncrustmentInstabilityEffect[],
  spells: readonly Spell[],
  diagnostics: DiagnosticDraft[],
): EncrustmentInstabilityEffect[] {
  const spellAliases = aliasesFor(spells);
  return [...effects]
    .sort(compareEncrustmentInstabilityEffects)
    .map((effect) => {
      const spell = spellAliases.get(effect.spellKey);
      if (!spell) {
        diagnostics.push({
          severity: "warning",
          code: "dangling_reference",
          message: `Instability effect ${effect.name} references an unknown spell: ${effect.spellName}`,
          source: sourceLocation(effect.provenance),
          details: {
            targetKind: "spell",
            reference: effect.spellName,
            instabilityEffectName: effect.name,
          },
        });
        return effect;
      }
      return { ...effect, spellId: spell.id };
    });
}

function linkAbilities(
  abilities: Ability[],
  skills: readonly Skill[],
  spells: readonly Spell[],
  diagnostics: DiagnosticDraft[],
): Ability[] {
  const skillAliases = aliasesFor(skills);
  const spellAliases = aliasesFor(spells);
  return abilities.map((ability) => {
    const skill = skillAliases.get(ability.skillKey);
    if (!skill) {
      diagnostics.push(danglingDiagnostic(ability, "skill", ability.skillKey));
    }
    const triggers = ability.triggers.map((trigger) => {
      const spell = spellAliases.get(trigger.spellKey);
      if (!spell) {
        diagnostics.push(
          danglingDiagnostic(ability, "spell", trigger.spellName),
        );
        return trigger;
      }
      return { ...trigger, spellId: spell.id };
    });
    return {
      ...ability,
      ...(skill ? { skillId: skill.id } : {}),
      triggers,
      spellIds: triggers.flatMap((trigger) =>
        trigger.spellId ? [trigger.spellId] : [],
      ),
    };
  });
}

function linkSkills(
  skills: Skill[],
  abilities: readonly Ability[],
  items: readonly Item[],
  diagnostics: DiagnosticDraft[],
  reviewContext: RelationshipReviewContext,
): Skill[] {
  const itemAliases = aliasesFor(items);
  const abilitiesBySkill = new Map<string, Ability[]>();
  for (const ability of abilities) {
    if (!ability.skillId) {
      continue;
    }
    const entries = abilitiesBySkill.get(ability.skillId) ?? [];
    entries.push(ability);
    abilitiesBySkill.set(ability.skillId, entries);
  }

  return skills.map((skill) => {
    const loadouts = skill.loadouts.map((loadout) => {
      if (loadout.itemKey === undefined) {
        return loadout;
      }
      const item = itemAliases.get(loadout.itemKey);
      if (!item) {
        const reviewId = sourceOnlyReviewFor(
          skill,
          "skill-loadout-item",
          loadout.itemName,
          reviewContext,
        );
        if (reviewId) {
          diagnostics.push(
            reviewedSourceOnlyDiagnostic(
              skill,
              loadout.itemName,
              "skill-loadout-item",
              reviewId,
            ),
          );
          return {
            ...loadout,
            itemResolution: classifyRelationshipAsSourceOnly(
              loadout.itemResolution,
              reviewId,
            ),
          };
        }
        diagnostics.push(danglingDiagnostic(skill, "item", loadout.itemName));
        return loadout;
      }
      return {
        ...loadout,
        itemId: item.id,
        itemResolution: resolveRelationshipExactly(
          loadout.itemResolution,
          item.id,
        ),
      };
    });
    const linkedAbilities = abilitiesBySkill.get(skill.id) ?? [];
    return {
      ...skill,
      loadouts,
      abilityIds: skillAbilityRelationships(linkedAbilities, skill.id).map(
        ({ ability }) => ability.id,
      ),
    };
  });
}

function linkSpells(
  spells: Spell[],
  stats: readonly Stat[],
  items: readonly Item[],
  monsters: readonly Monster[],
  templates: readonly Template[],
  diagnostics: DiagnosticDraft[],
  reviewContext: RelationshipReviewContext,
): Spell[] {
  const spellAliases = aliasesFor(spells);
  const statAliases = aliasesFor(stats);
  const itemAliases = aliasesFor(items);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const monsterAliases = aliasesFor(monsters);
  const templateAliases = aliasesFor(templates);
  const linkBuffCondition = (
    owner: Spell,
    condition: SpellEffectBuffCondition,
  ): SpellEffectBuffCondition => {
    if (condition.spellKey === null || condition.spellName === null) {
      return condition;
    }
    const target = spellAliases.get(condition.spellKey);
    if (target) {
      return { ...condition, spellId: target.id };
    }
    diagnostics.push(danglingDiagnostic(owner, "spell", condition.spellName));
    return condition;
  };
  const linkSpellEffect = (owner: Spell, effect: SpellEffect): SpellEffect => {
    const linkedEffect = { ...effect };
    linkedEffect.conditions = {
      ...effect.conditions,
      requiredBuff: linkBuffCondition(owner, effect.conditions.requiredBuff),
      forbiddenBuff: linkBuffCondition(owner, effect.conditions.forbiddenBuff),
    };
    if (effect.spellKey) {
      const target = spellAliases.get(effect.spellKey);
      if (target) {
        linkedEffect.spellId = target.id;
      } else {
        diagnostics.push(
          danglingDiagnostic(
            owner,
            "spell",
            effect.spellName ?? effect.spellKey,
          ),
        );
      }
    }
    if (effect.statKey) {
      const target = statAliases.get(effect.statKey);
      if (target) {
        linkedEffect.statId = target.id;
      } else {
        diagnostics.push(
          danglingDiagnostic(owner, "stat", effect.statName ?? effect.statKey),
        );
      }
    }
    if (effect.itemTarget.itemKey !== null) {
      const target = itemAliases.get(effect.itemTarget.itemKey);
      if (target) {
        linkedEffect.itemTarget = {
          ...effect.itemTarget,
          itemId: target.id,
        };
      }
    }
    if (
      effect.monsterTarget.monsterKey !== null &&
      effect.monsterTarget.monsterName !== null
    ) {
      const target = monsterAliases.get(effect.monsterTarget.monsterKey);
      if (target) {
        linkedEffect.monsterTarget = {
          ...effect.monsterTarget,
          monsterId: target.id,
        };
      } else {
        diagnostics.push(
          danglingDiagnostic(
            owner,
            "monster",
            effect.monsterTarget.monsterName,
          ),
        );
      }
    }
    if (
      effect.removedBuff.spellKey !== null &&
      effect.removedBuff.spellName !== null
    ) {
      const target = spellAliases.get(effect.removedBuff.spellKey);
      if (target) {
        linkedEffect.removedBuff = {
          ...effect.removedBuff,
          spellId: target.id,
        };
      } else {
        diagnostics.push(
          danglingDiagnostic(owner, "spell", effect.removedBuff.spellName),
        );
      }
    }
    linkedEffect.options = effect.options.map((option) => {
      if (option.kind === "item") {
        if (option.itemKey === null) {
          return option;
        }
        const target = itemAliases.get(option.itemKey);
        if (target) {
          return {
            ...option,
            itemId: target.id,
            itemResolution: resolveRelationshipExactly(
              option.itemResolution,
              target.id,
            ),
          };
        }
        const correction = correctionReviewFor(
          owner,
          "spell-effect-item-option",
          option.itemName,
          reviewContext,
        );
        const correctedTarget = correction
          ? itemsById.get(correction.targetId)
          : undefined;
        if (correction && correctedTarget) {
          diagnostics.push(
            reviewedCorrectionDiagnostic(
              owner,
              option.itemName,
              correctedTarget,
              "spell-effect-item-option",
              correction.reviewId,
            ),
          );
          return {
            ...option,
            itemId: correctedTarget.id,
            itemResolution: resolveRelationshipWithReviewedCorrection(
              option.itemResolution,
              correctedTarget.id,
              correction.reviewId,
            ),
          };
        }
        const reviewId = sourceOnlyReviewFor(
          owner,
          "spell-effect-item-option",
          option.itemName,
          reviewContext,
        );
        if (reviewId) {
          diagnostics.push(
            reviewedSourceOnlyDiagnostic(
              owner,
              option.itemName,
              "spell-effect-item-option",
              reviewId,
            ),
          );
          return {
            ...option,
            itemResolution: classifyRelationshipAsSourceOnly(
              option.itemResolution,
              reviewId,
            ),
          };
        }
        diagnostics.push(danglingDiagnostic(owner, "item", option.itemName));
        return option;
      }

      if (option.spellKey === null) {
        return option;
      }
      const target = spellAliases.get(option.spellKey);
      if (target) {
        return { ...option, spellId: target.id };
      }
      diagnostics.push(
        danglingDiagnostic(owner, "spell", option.spellName ?? option.spellKey),
      );
      return option;
    });
    return linkedEffect;
  };
  return spells.map((spell) => {
    const template =
      spell.targetingTemplate.templateKey === null
        ? undefined
        : templateAliases.get(spell.targetingTemplate.templateKey);
    if (spell.targetingTemplate.templateKey !== null && !template) {
      diagnostics.push(
        danglingDiagnostic(
          spell,
          "template",
          spell.targetingTemplate.sourceTemplateId ??
            spell.targetingTemplate.templateKey,
        ),
      );
    }
    return {
      ...spell,
      targetingTemplate: template
        ? { ...spell.targetingTemplate, templateId: template.id }
        : spell.targetingTemplate,
      buffs: spell.buffs.map((buff) => ({
        ...buff,
        polymorphDeclarations: buff.polymorphDeclarations.map((declaration) => {
          if (
            declaration.monsterKey === null ||
            declaration.monsterName === null
          ) {
            return declaration;
          }
          const target = monsterAliases.get(declaration.monsterKey);
          if (target) {
            return { ...declaration, monsterId: target.id };
          }
          diagnostics.push(
            danglingDiagnostic(spell, "monster", declaration.monsterName),
          );
          return declaration;
        }),
        eventHooks: buff.eventHooks.map((hook) => {
          const target = spellAliases.get(hook.spellKey);
          if (target) {
            return { ...hook, spellId: target.id };
          }
          diagnostics.push(danglingDiagnostic(spell, "spell", hook.spellName));
          return hook;
        }),
        effects: buff.effects.map((effect) => linkSpellEffect(spell, effect)),
      })),
      effects: spell.effects.map((effect) => linkSpellEffect(spell, effect)),
    };
  });
}

function linkMonsters(
  monsters: Monster[],
  spells: readonly Spell[],
  items: readonly Item[],
  diagnostics: DiagnosticDraft[],
): LinkedMonsterResult {
  const result = applyMonsterInheritance(monsters);
  const byId = new Map(monsters.map((monster) => [monster.id, monster]));
  for (const issue of result.issues) {
    const monster = byId.get(issue.monsterId);
    if (!monster) {
      continue;
    }
    diagnostics.push({
      severity: "warning",
      code: issue.type === "cycle" ? "inheritance_cycle" : "dangling_reference",
      message:
        issue.type === "cycle"
          ? `${monster.name} participates in a monster inheritance cycle.`
          : `${monster.name} inherits from an unknown monster: ${issue.parentKey}`,
      source: sourceLocation(monster.provenance),
      entityId: monster.id,
      details: { parentKey: issue.parentKey },
    });
  }
  const spellAliases = aliasesFor(spells);
  const itemAliases = aliasesFor(items);
  const linkedMonsters = result.monsters.map((monster) => ({
    ...monster,
    triggers: monster.triggers.map((trigger) => {
      const spell = spellAliases.get(trigger.spellKey);
      if (spell) {
        return { ...trigger, spellId: spell.id };
      }
      diagnostics.push(danglingDiagnostic(monster, "spell", trigger.spellName));
      return trigger;
    }),
    drops: monster.drops.map((drop) => {
      if (!drop.itemKey || !drop.itemName) {
        return drop;
      }
      const item = itemAliases.get(drop.itemKey);
      if (item) {
        return { ...drop, itemId: item.id };
      }
      diagnostics.push(danglingDiagnostic(monster, "item", drop.itemName));
      return drop;
    }),
  }));
  return {
    monsters: linkedMonsters,
    appearanceSources: resolveMonsterAppearanceSources(
      monsters,
      linkedMonsters,
    ),
  };
}

function attachDiagnosticIds(
  entities: EntityCollections,
  diagnostics: readonly Diagnostic[],
): EntityCollections {
  const idsByEntity = new Map<string, string[]>();
  for (const diagnostic of diagnostics) {
    if (!diagnostic.entityId) {
      continue;
    }
    const ids = idsByEntity.get(diagnostic.entityId) ?? [];
    ids.push(diagnostic.id);
    idsByEntity.set(diagnostic.entityId, ids);
  }
  const attach = <T extends NormalizedEntity>(entity: T): T => ({
    ...entity,
    diagnosticIds: (idsByEntity.get(entity.id) ?? []).sort((left, right) =>
      compareCodeUnits(left, right),
    ),
  });
  return {
    items: entities.items.map(attach),
    recipes: entities.recipes.map(attach),
    encrustments: entities.encrustments.map(attach),
    skills: entities.skills.map(attach),
    abilities: entities.abilities.map(attach),
    spells: entities.spells.map(attach),
    monsters: entities.monsters.map(attach),
    stats: entities.stats.map(attach),
    templates: entities.templates.map(attach),
  };
}

function countDiagnostics(
  diagnostics: readonly Diagnostic[],
): DiagnosticCounts {
  return diagnostics.reduce<DiagnosticCounts>(
    (counts, diagnostic) => ({
      ...counts,
      [diagnostic.severity]: counts[diagnostic.severity] + 1,
    }),
    { info: 0, warning: 0, error: 0 },
  );
}

function resolveCollections(
  candidates: CandidateCollections,
  patches: readonly EntityPatchDefinition[],
  routeRegistry: RouteRegistryDefinition | undefined,
  previousRouteRegistry: RouteRegistryDefinition | undefined,
  previousRouteRegistrySha256: string | undefined,
  requirePublishedRoutes: boolean,
  datasetId: string,
  datasetVersion: string,
  sourceVersions: ReadonlyMap<string, string>,
  diagnostics: DiagnosticDraft[],
): ResolvedCollectionsResult {
  const separatedRecipes = separateRepeatedNamedDeclarations(
    candidates.recipes,
  );
  const separatedEncrustments = separateRepeatedNamedDeclarations(
    candidates.encrustments,
  );
  const independentDeclarations = [
    ...separatedRecipes.independentDeclarations,
    ...separatedEncrustments.independentDeclarations,
  ];
  const independentDeclarationIds = new Set(
    independentDeclarations.map((declaration) => declaration.entityId),
  );
  for (const declaration of independentDeclarations) {
    diagnostics.push({
      severity: "info",
      code: "independent_named_declaration",
      message: `Preserved a distinct same-name ${declaration.kind} declaration for ${declaration.name}.`,
      source: sourceLocation(declaration.provenance),
      entityId: declaration.entityId,
      details: {
        baseCanonicalKey: declaration.baseCanonicalKey,
      },
    });
  }

  const resolutions = {
    items: resolveEntityCandidates(candidates.items),
    recipes: resolveEntityCandidates(separatedRecipes.candidates),
    encrustments: resolveEntityCandidates(separatedEncrustments.candidates),
    skills: resolveEntityCandidates(candidates.skills),
    abilities: resolveEntityCandidates(candidates.abilities),
    spells: resolveEntityCandidates(candidates.spells),
    monsters: resolveEntityCandidates(candidates.monsters),
    stats: resolveEntityCandidates(candidates.stats),
    templates: resolveEntityCandidates(candidates.templates),
  };

  for (const resolution of Object.values(resolutions)) {
    for (const collision of resolution.collisions) {
      diagnostics.push({
        severity: "info",
        code: "duplicate_entity",
        message: `${collision.replacement.sourceId} overrides ${collision.previous.sourceId} for ${collision.kind} ${collision.replacement.originalName}.`,
        source: sourceLocation(collision.replacement),
        entityId: `${collision.kind}:${collision.canonicalKey}`,
        details: {
          previousSourceId: collision.previous.sourceId,
          replacementSourceId: collision.replacement.sourceId,
          changedFields: collision.changedFields,
        },
      });
    }
  }

  let patchedEntities: EntityCollections = {
    items: resolutions.items.active,
    recipes: resolutions.recipes.active,
    encrustments: resolutions.encrustments.active,
    skills: resolutions.skills.active,
    abilities: resolutions.abilities.active,
    spells: resolutions.spells.active,
    monsters: resolutions.monsters.active,
    stats: resolutions.stats.active,
    templates: resolutions.templates.active,
  };
  for (const patch of patches) {
    const patchSource: SourceLocation = {
      sourceId: `patch:${patch.id}`,
      file: patch.file,
      line: 1,
      column: 1,
    };
    const actualSourceVersion = sourceVersions.get(patch.appliesTo.sourceId);
    if (
      patch.appliesTo.datasetId !== datasetId ||
      patch.appliesTo.datasetVersion !== datasetVersion ||
      actualSourceVersion !== patch.appliesTo.sourceVersion
    ) {
      diagnostics.push({
        severity: "error",
        code: "patch_scope_mismatch",
        message: `Patch ${patch.id} does not match the active dataset/source versions and was not applied.`,
        source: patchSource,
        details: {
          patchId: patch.id,
          expectedDatasetId: patch.appliesTo.datasetId,
          expectedDatasetVersion: patch.appliesTo.datasetVersion,
          expectedSourceId: patch.appliesTo.sourceId,
          expectedSourceVersion: patch.appliesTo.sourceVersion,
        },
      });
      continue;
    }

    const result = applyEntityPatch(patchedEntities, patch);
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        diagnostics.push({
          severity: "error",
          code: issue.code,
          message: issue.message,
          source: patchSource,
          ...(issue.entityId ? { entityId: issue.entityId } : {}),
          details: {
            patchId: patch.id,
            operationIndex: issue.operationIndex,
            ...(issue.expectedValue !== undefined
              ? { expectedValue: issue.expectedValue }
              : {}),
            ...(issue.actualValue !== undefined
              ? { actualValue: issue.actualValue }
              : {}),
          },
        });
      }
      continue;
    }

    patchedEntities = result.entities;
    for (const application of result.applications) {
      diagnostics.push({
        severity: "info",
        code: "patch_applied",
        message: `Applied patch ${patch.id} to ${application.entityName}.`,
        source: patchSource,
        entityId: application.entityId,
        details: {
          patchId: patch.id,
          changedFields: application.patch.changes.map(
            (change) => change.field,
          ),
        },
      });
    }
  }

  const routeReservations = routeRegistry
    ? resolveRouteRegistry(
        patchedEntities,
        routeRegistry,
        datasetId,
        datasetVersion,
        {
          ...(previousRouteRegistry
            ? { previousRegistry: previousRouteRegistry }
            : {}),
          ...(previousRouteRegistrySha256
            ? { previousRegistrySha256: previousRouteRegistrySha256 }
            : {}),
          requirePublication: requirePublishedRoutes,
        },
      )
    : undefined;
  if (routeRegistry && routeReservations) {
    const registrySource: SourceLocation = {
      sourceId: "route-registry",
      file: routeRegistry.file,
      line: 1,
      column: 1,
    };
    for (const issue of routeReservations.issues) {
      diagnostics.push({
        severity: "error",
        code: issue.code,
        message: issue.message,
        source: registrySource,
        ...(issue.entityId ? { entityId: issue.entityId } : {}),
        ...(issue.entryIndex === undefined
          ? {}
          : { details: { entryIndex: issue.entryIndex } }),
      });
    }
    for (const application of routeReservations.applications) {
      diagnostics.push({
        severity: "info",
        code: "route_registry_applied",
        message: `Pinned route ${application.canonicalSlug} for ${application.entityName}.`,
        source: registrySource,
        entityId: application.entityId,
        details: {
          canonicalSlug: application.canonicalSlug,
          aliases: application.aliases,
        },
      });
    }
  }

  const protectedRoutes = (kind: NormalizedEntity["kind"]): string[] =>
    (routeReservations?.tombstones ?? [])
      .filter((tombstone) => tombstone.entityKind === kind)
      .flatMap((tombstone) => [tombstone.canonicalSlug, ...tombstone.aliases]);

  const routed = {
    items: allocateEntityRoutes(
      patchedEntities.items,
      routeReservations?.reservations,
      protectedRoutes("item"),
    ),
    recipes: allocateEntityRoutes(
      patchedEntities.recipes,
      routeReservations?.reservations,
      protectedRoutes("recipe"),
    ),
    encrustments: allocateEntityRoutes(
      patchedEntities.encrustments,
      routeReservations?.reservations,
      protectedRoutes("encrustment"),
    ),
    skills: allocateEntityRoutes(
      patchedEntities.skills,
      routeReservations?.reservations,
      protectedRoutes("skill"),
    ),
    abilities: allocateEntityRoutes(
      patchedEntities.abilities,
      routeReservations?.reservations,
      protectedRoutes("ability"),
    ),
    spells: allocateEntityRoutes(
      patchedEntities.spells,
      routeReservations?.reservations,
      protectedRoutes("spell"),
    ),
    monsters: allocateEntityRoutes(
      patchedEntities.monsters,
      routeReservations?.reservations,
      protectedRoutes("monster"),
    ),
    stats: allocateEntityRoutes(
      patchedEntities.stats,
      routeReservations?.reservations,
      protectedRoutes("stat"),
    ),
    templates: allocateEntityRoutes(
      patchedEntities.templates,
      routeReservations?.reservations,
      protectedRoutes("template"),
    ),
  };

  for (const allocation of Object.values(routed)) {
    for (const collision of allocation.slugCollisions) {
      if (independentDeclarationIds.has(collision.entityId)) {
        continue;
      }
      diagnostics.push({
        severity: "warning",
        code: "slug_collision",
        message: `${collision.entityName} shares route slug ${collision.baseSlug}; assigned ${collision.assignedSlug}.`,
        source: sourceLocation(collision.provenance),
        entityId: collision.entityId,
        details: {
          baseSlug: collision.baseSlug,
          assignedSlug: collision.assignedSlug,
        },
      });
    }
    for (const conflict of allocation.aliasConflicts) {
      diagnostics.push({
        severity: "warning",
        code: "slug_alias_conflict",
        message: `Omitted ambiguous route alias ${conflict.alias} for ${conflict.entityName}.`,
        source: sourceLocation(conflict.provenance),
        entityId: conflict.entityId,
        details: {
          alias: conflict.alias,
          conflictingEntityIds: conflict.conflictingEntityIds,
        },
      });
    }
  }

  const linkedStats = routed.stats.entities;
  const modifierDefinitions = statModifierDefinitions(linkedStats, diagnostics);
  const routedItems = routed.items.entities.map((item) => ({
    ...item,
    modifiers: linkStatModifiers(item.modifiers, modifierDefinitions),
  }));
  const routedEncrustments = routed.encrustments.entities.map(
    (encrustment) => ({
      ...encrustment,
      modifiers: linkStatModifiers(encrustment.modifiers, modifierDefinitions),
    }),
  );
  const routedSpells = routed.spells.entities.map((spell) => ({
    ...spell,
    buffs: spell.buffs.map((buff) => ({
      ...buff,
      modifiers: linkStatModifiers(buff.modifiers, modifierDefinitions),
    })),
  }));
  const routedAbilities = routed.abilities.entities.map((ability) => ({
    ...ability,
    modifiers: linkStatModifiers(ability.modifiers, modifierDefinitions),
  }));
  const routedMonsters = routed.monsters.entities.map((monster) => ({
    ...monster,
    modifiers: linkStatModifiers(monster.modifiers, modifierDefinitions),
  }));
  const linkedItems = linkItems(
    routedItems,
    linkedStats,
    routedSpells,
    diagnostics,
  );
  const linkedRecipes = linkRecipes(
    routed.recipes.entities,
    linkedItems,
    diagnostics,
  );
  const linkedEncrustments = linkEncrustments(
    routedEncrustments,
    linkedItems,
    diagnostics,
  );
  const linkedSpells = linkSpells(
    routedSpells,
    linkedStats,
    linkedItems,
    routed.monsters.entities,
    routed.templates.entities,
    diagnostics,
    { datasetId, datasetVersion, sourceVersions },
  );
  const linkedAbilities = linkAbilities(
    routedAbilities,
    routed.skills.entities,
    linkedSpells,
    diagnostics,
  );
  const linkedSkills = linkSkills(
    routed.skills.entities,
    linkedAbilities,
    linkedItems,
    diagnostics,
    { datasetId, datasetVersion, sourceVersions },
  );

  const linkedMonsters = linkMonsters(
    routedMonsters,
    linkedSpells,
    linkedItems,
    diagnostics,
  );
  return {
    entities: {
      items: linkedItems,
      recipes: linkedRecipes,
      encrustments: linkedEncrustments,
      skills: linkedSkills,
      abilities: linkedAbilities,
      spells: linkedSpells,
      monsters: linkedMonsters.monsters,
      stats: linkedStats,
      templates: routed.templates.entities,
    },
    monsterAppearanceSources: linkedMonsters.appearanceSources,
  };
}

export function importDataset(
  options: ImportDatasetOptions,
): ImportDatasetResult {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const inputSnapshots = new InputSnapshots();
  const loaded = loadManifest(
    options.manifestPath,
    repositoryRoot,
    inputSnapshots.readUtf8.bind(inputSnapshots),
  );
  const diagnostics: DiagnosticDraft[] = [];
  const candidates = emptyCandidateCollections();
  const sourceRoots: string[] = [];

  const registerInput = (absolutePath: string, displayPath: string) => {
    return inputSnapshots.register(absolutePath, displayPath);
  };

  const sortedSources = [...loaded.manifest.sources].sort(
    (left, right) =>
      left.precedence - right.precedence || compareCodeUnits(left.id, right.id),
  );

  const resolvedSources: ResolvedSource[] = sortedSources.map((source) => {
    const absolutePath = resolveSourceRoot(
      sourceRootBase(loaded, source),
      source.root,
    );
    const displayPath = isPathWithin(repositoryRoot, absolutePath)
      ? toPosixPath(path.relative(repositoryRoot, absolutePath))
      : `sources/${source.id}`;
    sourceRoots.push(absolutePath);
    return { source, absolutePath, displayPath };
  });

  const patches = [...loaded.manifest.patches]
    .sort(
      (left, right) =>
        left.order - right.order || compareCodeUnits(left.path, right.path),
    )
    .map((patchReference) => {
      const absolutePath = resolveExistingWithin(
        repositoryRoot,
        patchReference.path,
      );
      const displayPath = toPosixPath(patchReference.path);
      return parsePatchDefinition(
        inputSnapshots.readUtf8(absolutePath, displayPath),
        displayPath,
      );
    });
  const patchIds = new Set<string>();
  for (const patch of patches) {
    if (patchIds.has(patch.id)) {
      throw new Error(`Duplicate patch id: ${patch.id}`);
    }
    patchIds.add(patch.id);
  }
  const routeRegistry = loaded.manifest.routeRegistry
    ? (() => {
        const absolutePath = resolveExistingWithin(
          repositoryRoot,
          loaded.manifest.routeRegistry,
        );
        const displayPath = toPosixPath(loaded.manifest.routeRegistry);
        return parseRouteRegistry(
          inputSnapshots.readUtf8(absolutePath, displayPath),
          displayPath,
        );
      })()
    : undefined;
  const previousRouteRegistryInput = loaded.manifest.previousRouteRegistry
    ? (() => {
        const absolutePath = resolveExistingWithin(
          repositoryRoot,
          loaded.manifest.previousRouteRegistry,
        );
        const displayPath = toPosixPath(loaded.manifest.previousRouteRegistry);
        const registry = parseRouteRegistry(
          inputSnapshots.readUtf8(absolutePath, displayPath),
          displayPath,
        );
        const snapshot = inputSnapshots.get(displayPath);
        if (!snapshot) {
          throw new Error(
            `Previous route registry snapshot was not captured: ${displayPath}`,
          );
        }
        return { registry, sha256: snapshot.checksum.sha256 };
      })()
    : undefined;
  if (options.requirePublishedRoutes && !routeRegistry) {
    diagnostics.push({
      severity: "error",
      code: "route_registry_publication_missing",
      message:
        "Publication mode requires a schema-2 route registry with explicit lineage.",
      source: {
        sourceId: "source-manifest",
        file: loaded.manifestDisplayPath,
        line: 1,
        column: 1,
      },
    });
  }

  for (const [sourceIndex, resolvedSource] of resolvedSources.entries()) {
    const {
      source,
      absolutePath: sourceRoot,
      displayPath: sourceDisplayRoot,
    } = resolvedSource;
    const assetRoots = resolvedSources
      .slice(0, sourceIndex + 1)
      .reverse()
      .filter(({ source: candidateSource }) =>
        candidateSource.kind === "reference" ? false : true,
      )
      .map(({ absolutePath, displayPath }) => ({
        absolutePath,
        displayPath,
      }));
    const files = [...source.files].sort(
      (left, right) =>
        compareCodeUnits(left.path, right.path) ||
        compareCodeUnits(left.kind, right.kind),
    );

    for (const asset of [...(source.presentedAssets ?? [])].sort(
      (left, right) =>
        compareCodeUnits(left.id, right.id) ||
        compareCodeUnits(left.path, right.path),
    )) {
      const absolutePath = resolveExistingWithin(sourceRoot, asset.path);
      registerInput(
        absolutePath,
        toPosixPath(`${sourceDisplayRoot}/${asset.path}`),
      );
    }

    for (const file of files) {
      const absolutePath = resolveExistingWithin(sourceRoot, file.path);
      const displayPath = toPosixPath(`${sourceDisplayRoot}/${file.path}`);
      if (!existsSync(absolutePath)) {
        diagnostics.push({
          severity: "error",
          code: "missing_database",
          message: `Declared database file does not exist: ${file.path}`,
          source: {
            sourceId: source.id,
            file: displayPath,
            line: 1,
            column: 1,
          },
        });
        continue;
      }

      const xml = inputSnapshots.readUtf8(absolutePath, displayPath);
      const parsed = parseXml({ xml, sourceId: source.id, file: displayPath });
      if (!parsed.ok) {
        diagnostics.push(parsed.diagnostic);
        continue;
      }

      mergeCandidateCollections(
        candidates,
        parseDatabase(file.kind, {
          source,
          assetRoots,
          file: displayPath,
          parsed: parsed.value,
          diagnostics,
          registerInput,
        }),
      );
    }
  }

  const resolvedCollections = resolveCollections(
    candidates,
    patches,
    routeRegistry,
    previousRouteRegistryInput?.registry,
    previousRouteRegistryInput?.sha256,
    options.requirePublishedRoutes ?? false,
    loaded.manifest.datasetId,
    loaded.manifest.datasetVersion,
    new Map(
      loaded.manifest.sources.map((source) => [source.id, source.version]),
    ),
    diagnostics,
  );
  const linkedEntities = resolvedCollections.entities;
  const encrustmentInstabilityEffects = linkEncrustmentInstabilityEffects(
    candidates.encrustmentInstabilityEffects,
    linkedEntities.spells,
    diagnostics,
  );
  const finalizedDiagnostics = finalizeDiagnostics(diagnostics);
  const entities = attachDiagnosticIds(linkedEntities, finalizedDiagnostics);
  const artifact: DatasetArtifact = {
    schemaVersion: 3,
    datasetId: loaded.manifest.datasetId,
    datasetVersion: loaded.manifest.datasetVersion,
    language: "en",
    sources: sortedSources.map((source) => ({
      id: source.id,
      label: source.label,
      kind: source.kind,
      version: source.version,
      precedence: source.precedence,
    })),
    encrustmentInstabilityEffects,
    entities,
    diagnostics: countDiagnostics(finalizedDiagnostics),
  };
  const search: SearchArtifact = {
    schemaVersion: 3,
    datasetSchemaVersion: artifact.schemaVersion,
    datasetId: artifact.datasetId,
    language: artifact.language,
    documents: createSearchDocuments(entities),
  };
  const inputs = inputSnapshots.list();
  const presentedAssetInputs = collectPresentedAssetInputs(
    artifact.entities,
    resolvedSources,
    inputSnapshots,
    resolvedCollections.monsterAppearanceSources,
  );

  return {
    artifact,
    search,
    diagnostics: finalizedDiagnostics,
    inputs,
    sourceManifest: loaded.manifestDisplayPath,
    sourceRoots: [...new Set(sourceRoots)].sort((left, right) =>
      compareCodeUnits(left, right),
    ),
    presentedAssetInputs,
  };
}
