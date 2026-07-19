import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  applyMonsterInheritance,
  canonicalKey,
  createSearchDocuments,
  resolveEntityCandidates,
  type Ability,
  type DatasetArtifact,
  type Diagnostic,
  type DiagnosticCounts,
  type EntityCollections,
  type EntityProvenance,
  type InputChecksum,
  type Item,
  type Monster,
  type NormalizedEntity,
  type Recipe,
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
import { isPathWithin, resolveExistingWithin, toPosixPath } from "./safe-path";
import { sha256, stableSerialize } from "./serialization";
import { parseXml, type DiagnosticDraft } from "./xml-adapter";

export interface ImportDatasetOptions {
  manifestPath: string;
  repositoryRoot: string;
}

export interface ImportDatasetResult {
  artifact: DatasetArtifact;
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
  diagnostics: DiagnosticDraft[],
): Item[] {
  const statAliases = aliasesFor(stats);
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
  diagnostics: DiagnosticDraft[],
): EntityCollections {
  const resolutions = {
    items: resolveEntityCandidates(candidates.items),
    recipes: resolveEntityCandidates(candidates.recipes),
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

  const linkedStats = resolutions.stats.active;
  const linkedItems = linkItems(
    resolutions.items.active,
    linkedStats,
    diagnostics,
  );
  const linkedRecipes = linkRecipes(
    resolutions.recipes.active,
    linkedItems,
    diagnostics,
  );
  const linkedSpells = linkSpells(
    resolutions.spells.active,
    linkedStats,
    diagnostics,
  );
  const linkedAbilities = linkAbilities(
    resolutions.abilities.active,
    resolutions.skills.active,
    linkedSpells,
    diagnostics,
  );
  const linkedSkills = linkSkills(
    resolutions.skills.active,
    linkedAbilities,
    linkedItems,
    diagnostics,
  );

  return {
    items: linkedItems,
    recipes: linkedRecipes,
    skills: linkedSkills,
    abilities: linkedAbilities,
    spells: linkedSpells,
    monsters: linkMonsters(resolutions.monsters.active, diagnostics),
    stats: linkedStats,
    templates: resolutions.templates.active,
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

  const linkedEntities = resolveCollections(candidates, diagnostics);
  const finalizedDiagnostics = finalizeDiagnostics(diagnostics);
  const entities = attachDiagnosticIds(linkedEntities, finalizedDiagnostics);
  const artifact: DatasetArtifact = {
    schemaVersion: 1,
    datasetId: loaded.manifest.datasetId,
    language: "en",
    sources: sortedSources.map((source) => ({
      id: source.id,
      label: source.label,
      kind: source.kind,
      precedence: source.precedence,
    })),
    entities,
    searchDocuments: createSearchDocuments(entities),
    diagnostics: countDiagnostics(finalizedDiagnostics),
  };
  const inputs = [...inputFiles.entries()]
    .map(([file, absolutePath]) => ({
      file,
      sha256: sha256(readFileSync(absolutePath)),
    }))
    .sort((left, right) => left.file.localeCompare(right.file, "en"));

  return {
    artifact,
    diagnostics: finalizedDiagnostics,
    inputs,
    sourceManifest: loaded.manifestDisplayPath,
    sourceRoots: [...new Set(sourceRoots)].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
  };
}
