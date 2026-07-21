import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  allocateEntityRoutes,
  applyEntityPatch,
  applyMonsterInheritance,
  canonicalKey,
  createSearchDocuments,
  resolveEntityCandidates,
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
  type Monster,
  type NormalizedEntity,
  type Recipe,
  type SearchArtifact,
  type Skill,
  type SourceLocation,
  type Spell,
  type Stat,
} from "@dredmorpedia/domain";

import { loadManifest, resolveSourceRoot } from "./manifest";
import {
  emptyCandidateCollections,
  mergeCandidateCollections,
  parseDatabase,
  type CandidateCollections,
} from "./normalizers";
import { loadPatchDefinition } from "./patches";
import {
  loadRouteRegistry,
  resolveRouteRegistry,
  type RouteRegistryDefinition,
} from "./route-registry";
import { isPathWithin, resolveExistingWithin, toPosixPath } from "./safe-path";
import { sha256, stableSerialize } from "./serialization";
import { parseXml, type DiagnosticDraft } from "./xml-adapter";

export interface ImportDatasetOptions {
  manifestPath: string;
  repositoryRoot: string;
}

export interface ImportDatasetResult {
  artifact: DatasetArtifact;
  search: SearchArtifact;
  diagnostics: Diagnostic[];
  inputs: InputChecksum[];
  sourceManifest: string;
  sourceRoots: string[];
}

function sourceLocation(provenance: EntityProvenance): SourceLocation {
  return {
    sourceId: provenance.sourceId,
    file: provenance.file,
    line: provenance.line,
    column: provenance.column,
  };
}

function compareDiagnostics(
  left: DiagnosticDraft,
  right: DiagnosticDraft,
): number {
  return (
    (left.source?.file ?? "").localeCompare(right.source?.file ?? "", "en") ||
    (left.source?.line ?? 0) - (right.source?.line ?? 0) ||
    (left.source?.column ?? 0) - (right.source?.column ?? 0) ||
    left.code.localeCompare(right.code, "en") ||
    (left.entityId ?? "").localeCompare(right.entityId ?? "", "en") ||
    left.message.localeCompare(right.message, "en")
  );
}

function finalizeDiagnostics(drafts: readonly DiagnosticDraft[]): Diagnostic[] {
  const occurrences = new Map<string, number>();

  return [...drafts].sort(compareDiagnostics).map((draft) => {
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
  }));
}

function linkRecipes(
  recipes: Recipe[],
  items: readonly Item[],
  diagnostics: DiagnosticDraft[],
): Recipe[] {
  const itemAliases = aliasesFor(items);
  return recipes.map((recipe) => {
    const link = (reference: Recipe["inputs"][number]) => {
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
    .sort(
      (left, right) =>
        canonicalKey(left.name).localeCompare(canonicalKey(right.name), "en") ||
        left.spellKey.localeCompare(right.spellKey, "en") ||
        left.provenance.sourceId.localeCompare(
          right.provenance.sourceId,
          "en",
        ) ||
        left.provenance.file.localeCompare(right.provenance.file, "en") ||
        left.provenance.line - right.provenance.line,
    )
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
    const spellIds = ability.spellKeys.flatMap((spellKey) => {
      const spell = spellAliases.get(spellKey);
      if (!spell) {
        diagnostics.push(danglingDiagnostic(ability, "spell", spellKey));
        return [];
      }
      return [spell.id];
    });
    return {
      ...ability,
      ...(skill ? { skillId: skill.id } : {}),
      spellIds,
    };
  });
}

function linkSkills(
  skills: Skill[],
  abilities: readonly Ability[],
  items: readonly Item[],
  diagnostics: DiagnosticDraft[],
): Skill[] {
  const itemAliases = aliasesFor(items);
  const abilitiesBySkill = new Map<string, string[]>();
  for (const ability of abilities) {
    if (!ability.skillId) {
      continue;
    }
    const ids = abilitiesBySkill.get(ability.skillId) ?? [];
    ids.push(ability.id);
    abilitiesBySkill.set(ability.skillId, ids);
  }

  return skills.map((skill) => {
    for (const loadoutKey of skill.loadoutItemKeys) {
      if (!itemAliases.has(loadoutKey)) {
        diagnostics.push(danglingDiagnostic(skill, "item", loadoutKey));
      }
    }
    return {
      ...skill,
      abilityIds: (abilitiesBySkill.get(skill.id) ?? []).sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    };
  });
}

function linkSpells(
  spells: Spell[],
  stats: readonly Stat[],
  diagnostics: DiagnosticDraft[],
): Spell[] {
  const spellAliases = aliasesFor(spells);
  const statAliases = aliasesFor(stats);
  return spells.map((spell) => ({
    ...spell,
    effects: spell.effects.map((effect) => {
      const linkedEffect = { ...effect };
      if (effect.spellKey) {
        const target = spellAliases.get(effect.spellKey);
        if (target) {
          linkedEffect.spellId = target.id;
        } else {
          diagnostics.push(
            danglingDiagnostic(
              spell,
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
            danglingDiagnostic(
              spell,
              "stat",
              effect.statName ?? effect.statKey,
            ),
          );
        }
      }
      return linkedEffect;
    }),
  }));
}

function linkMonsters(
  monsters: Monster[],
  diagnostics: DiagnosticDraft[],
): Monster[] {
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
  return result.monsters;
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
      left.localeCompare(right, "en"),
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
  datasetId: string,
  datasetVersion: string,
  sourceVersions: ReadonlyMap<string, string>,
  diagnostics: DiagnosticDraft[],
): EntityCollections {
  const resolutions = {
    items: resolveEntityCandidates(candidates.items),
    recipes: resolveEntityCandidates(candidates.recipes),
    encrustments: resolveEntityCandidates(candidates.encrustments),
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

  const routed = {
    items: allocateEntityRoutes(
      patchedEntities.items,
      routeReservations?.reservations,
    ),
    recipes: allocateEntityRoutes(
      patchedEntities.recipes,
      routeReservations?.reservations,
    ),
    encrustments: allocateEntityRoutes(
      patchedEntities.encrustments,
      routeReservations?.reservations,
    ),
    skills: allocateEntityRoutes(
      patchedEntities.skills,
      routeReservations?.reservations,
    ),
    abilities: allocateEntityRoutes(
      patchedEntities.abilities,
      routeReservations?.reservations,
    ),
    spells: allocateEntityRoutes(
      patchedEntities.spells,
      routeReservations?.reservations,
    ),
    monsters: allocateEntityRoutes(
      patchedEntities.monsters,
      routeReservations?.reservations,
    ),
    stats: allocateEntityRoutes(
      patchedEntities.stats,
      routeReservations?.reservations,
    ),
    templates: allocateEntityRoutes(
      patchedEntities.templates,
      routeReservations?.reservations,
    ),
  };

  for (const allocation of Object.values(routed)) {
    for (const collision of allocation.slugCollisions) {
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
  const linkedItems = linkItems(
    routed.items.entities,
    linkedStats,
    routed.spells.entities,
    diagnostics,
  );
  const linkedRecipes = linkRecipes(
    routed.recipes.entities,
    linkedItems,
    diagnostics,
  );
  const linkedEncrustments = linkEncrustments(
    routed.encrustments.entities,
    linkedItems,
    diagnostics,
  );
  const linkedSpells = linkSpells(
    routed.spells.entities,
    linkedStats,
    diagnostics,
  );
  const linkedAbilities = linkAbilities(
    routed.abilities.entities,
    routed.skills.entities,
    linkedSpells,
    diagnostics,
  );
  const linkedSkills = linkSkills(
    routed.skills.entities,
    linkedAbilities,
    linkedItems,
    diagnostics,
  );

  return {
    items: linkedItems,
    recipes: linkedRecipes,
    encrustments: linkedEncrustments,
    skills: linkedSkills,
    abilities: linkedAbilities,
    spells: linkedSpells,
    monsters: linkMonsters(routed.monsters.entities, diagnostics),
    stats: linkedStats,
    templates: routed.templates.entities,
  };
}

export function importDataset(
  options: ImportDatasetOptions,
): ImportDatasetResult {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const loaded = loadManifest(options.manifestPath, repositoryRoot);
  const diagnostics: DiagnosticDraft[] = [];
  const candidates = emptyCandidateCollections();
  const inputFiles = new Map<string, string>();
  const sourceRoots: string[] = [];

  const registerInput = (absolutePath: string, displayPath: string) => {
    inputFiles.set(toPosixPath(displayPath), absolutePath);
  };
  registerInput(loaded.manifestPath, loaded.manifestDisplayPath);

  const sortedSources = [...loaded.manifest.sources].sort(
    (left, right) =>
      left.precedence - right.precedence ||
      left.id.localeCompare(right.id, "en"),
  );

  const resolvedSources = sortedSources.map((source) => {
    const absolutePath = resolveSourceRoot(
      loaded.manifestDirectory,
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
        left.order - right.order || left.path.localeCompare(right.path, "en"),
    )
    .map((patchReference) => {
      const absolutePath = resolveExistingWithin(
        repositoryRoot,
        patchReference.path,
      );
      const displayPath = toPosixPath(patchReference.path);
      registerInput(absolutePath, displayPath);
      return loadPatchDefinition(absolutePath, displayPath);
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
        registerInput(absolutePath, displayPath);
        return loadRouteRegistry(absolutePath, displayPath);
      })()
    : undefined;

  for (const [sourceIndex, resolvedSource] of resolvedSources.entries()) {
    const {
      source,
      absolutePath: sourceRoot,
      displayPath: sourceDisplayRoot,
    } = resolvedSource;
    const assetRoots = resolvedSources
      .slice(0, sourceIndex + 1)
      .reverse()
      .map(({ absolutePath, displayPath }) => ({
        absolutePath,
        displayPath,
      }));
    const files = [...source.files].sort(
      (left, right) =>
        left.path.localeCompare(right.path, "en") ||
        left.kind.localeCompare(right.kind, "en"),
    );

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

      registerInput(absolutePath, displayPath);
      const xml = readFileSync(absolutePath, "utf8");
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

  const linkedEntities = resolveCollections(
    candidates,
    patches,
    routeRegistry,
    loaded.manifest.datasetId,
    loaded.manifest.datasetVersion,
    new Map(
      loaded.manifest.sources.map((source) => [source.id, source.version]),
    ),
    diagnostics,
  );
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
    schemaVersion: 1,
    datasetSchemaVersion: artifact.schemaVersion,
    datasetId: artifact.datasetId,
    language: artifact.language,
    documents: createSearchDocuments(entities),
  };
  const inputs = [...inputFiles.entries()]
    .map(([file, absolutePath]) => ({
      file,
      sha256: sha256(readFileSync(absolutePath)),
    }))
    .sort((left, right) => left.file.localeCompare(right.file, "en"));

  return {
    artifact,
    search,
    diagnostics: finalizedDiagnostics,
    inputs,
    sourceManifest: loaded.manifestDisplayPath,
    sourceRoots: [...new Set(sourceRoots)].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
  };
}
