import { compareCodeUnits } from "./ordering";
import { allSpellEffects } from "./spell-relationships";
import type {
  DatasetArtifact,
  EntityKind,
  NormalizedEntity,
  SearchDocument,
  StatModifier,
} from "./types";

const routeSegments: Record<NormalizedEntity["kind"], string> = {
  item: "items",
  recipe: "recipes",
  encrustment: "encrustments",
  skill: "skills",
  ability: "abilities",
  spell: "spells",
  monster: "monsters",
  stat: "stats",
  template: "templates",
};

function categoryFor(entity: NormalizedEntity): string | null {
  if (entity.kind === "item") {
    return entity.category;
  }

  if (entity.kind === "skill") {
    return entity.archetype;
  }

  if (entity.kind === "stat") {
    return entity.group;
  }

  if (entity.kind === "recipe" || entity.kind === "encrustment") {
    return entity.tool;
  }

  if (entity.kind === "monster") {
    return entity.taxonomy || null;
  }

  return null;
}

export function statModifierSearchKey(
  modifier: Pick<StatModifier, "kind" | "sourceKey">,
): string {
  return `modifier:${modifier.kind}:${modifier.sourceKey}`;
}

interface SearchStatKeyIndex {
  byId: ReadonlyMap<string, string>;
  byModifierKey: ReadonlyMap<string, string>;
}

function searchStatKeyIndex(
  entities: DatasetArtifact["entities"],
): SearchStatKeyIndex {
  return {
    byId: new Map(entities.stats.map((stat) => [stat.id, stat.canonicalKey])),
    byModifierKey: new Map(
      entities.stats.flatMap((stat) =>
        stat.modifier
          ? [[statModifierSearchKey(stat.modifier), stat.canonicalKey]]
          : [],
      ),
    ),
  };
}

function referencedStatKey(
  sourceKey: string,
  statId: string | undefined,
  index: SearchStatKeyIndex,
): string {
  return (
    (statId === undefined ? undefined : index.byId.get(statId)) ?? sourceKey
  );
}

function modifierStatKey(
  modifier: Pick<StatModifier, "kind" | "sourceKey" | "statId">,
  index: SearchStatKeyIndex,
): string {
  const sourceKey = statModifierSearchKey(modifier);
  return (
    (modifier.statId === undefined
      ? undefined
      : index.byId.get(modifier.statId)) ??
    index.byModifierKey.get(sourceKey) ??
    sourceKey
  );
}

function modifierStatKeys(
  modifiers: readonly StatModifier[],
  index: SearchStatKeyIndex,
): string[] {
  return modifiers.map((modifier) => modifierStatKey(modifier, index));
}

function statKeysForEntity(
  entity: NormalizedEntity,
  index: SearchStatKeyIndex,
): string[] {
  let keys: string[] = [];

  switch (entity.kind) {
    case "item":
      keys = [
        ...entity.stats.map((stat) =>
          referencedStatKey(stat.statKey, stat.statId, index),
        ),
        ...modifierStatKeys(entity.modifiers, index),
      ];
      break;
    case "encrustment":
    case "ability":
      keys = modifierStatKeys(entity.modifiers, index);
      break;
    case "spell": {
      const effects = allSpellEffects(entity);
      keys = [
        ...entity.buffs.flatMap((buff) =>
          modifierStatKeys(buff.modifiers, index),
        ),
        ...effects.flatMap((effect) => [
          ...(effect.statKey
            ? [referencedStatKey(effect.statKey, effect.statId, index)]
            : []),
          ...effect.damage.map((damage) =>
            modifierStatKey(
              {
                kind: "damage",
                sourceKey: damage.sourceKey,
              },
              index,
            ),
          ),
        ]),
      ];
      break;
    }
  }

  return [...new Set(keys)].sort((left, right) =>
    compareCodeUnits(left, right),
  );
}

export function createSearchDocument(
  entity: NormalizedEntity,
  index: SearchStatKeyIndex = {
    byId: new Map(),
    byModifierKey: new Map(),
  },
): SearchDocument {
  const category = categoryFor(entity);
  const aliases = [...new Set(entity.slugAliases)].sort((left, right) =>
    compareCodeUnits(left, right),
  );
  const statKeys = statKeysForEntity(entity, index);
  const statText =
    entity.kind === "item"
      ? [
          ...entity.stats.flatMap((stat) => [
            stat.statName,
            String(stat.amount),
          ]),
          ...entity.modifiers.flatMap((modifier) => [
            modifier.kind,
            modifier.sourceKey,
            String(modifier.amount),
          ]),
        ]
      : [];
  const searchableParts = [
    entity.name,
    ...aliases,
    entity.description,
    entity.kind,
    category ?? "",
    entity.provenance.sourceId,
    ...(entity.kind === "monster"
      ? [
          entity.depth === null ? "" : `dungeon level ${entity.depth}`,
          `fighter ${entity.archetypeLevels.fighter}`,
          `rogue ${entity.archetypeLevels.rogue}`,
          `wizard ${entity.archetypeLevels.wizard}`,
          ...entity.triggers.map((trigger) => trigger.spellName),
          ...entity.drops.flatMap((drop) => [
            drop.itemName ?? "",
            drop.dropType ?? "",
          ]),
        ]
      : []),
    ...(entity.kind === "item"
      ? [
          ...entity.macguffinDeclarations.flatMap((declaration) => [
            declaration.spellName ?? "",
            declaration.itemClassName ?? "",
          ]),
          ...entity.toolkitDeclarations.flatMap((declaration) => [
            declaration.tag ?? "",
            declaration.soundCue ?? "",
          ]),
        ]
      : []),
    ...(entity.kind === "spell"
      ? entity.buffs.flatMap((buff) =>
          buff.descriptions.map((description) => description.text ?? ""),
        )
      : []),
    ...statText,
  ];

  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    aliases,
    summary: entity.description,
    sourceId: entity.provenance.sourceId,
    category,
    statKeys,
    url: `/${routeSegments[entity.kind]}/${entity.slug}`,
    text: searchableParts.join(" ").normalize("NFKC").toLocaleLowerCase("en"),
  };
}

export function createSearchDocuments(
  entities: DatasetArtifact["entities"],
): SearchDocument[] {
  const index = searchStatKeyIndex(entities);
  return Object.values(entities)
    .flat()
    .map((entity) => createSearchDocument(entity, index))
    .sort(
      (left, right) =>
        compareCodeUnits(left.kind, right.kind) ||
        compareCodeUnits(left.name, right.name) ||
        compareCodeUnits(left.id, right.id),
    );
}

export interface SearchQuery {
  query?: string;
  kinds?: readonly EntityKind[];
  sourceIds?: readonly string[];
  category?: string;
  statKey?: string;
  limit?: number;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
}

export interface SearchSuggestion {
  document: SearchDocument;
  distance: number;
}

export const searchSuggestionLimit = 5;

function normalizeQuery(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function searchFilter(
  query: SearchQuery,
): (document: SearchDocument) => boolean {
  const kinds = query.kinds?.length ? new Set(query.kinds) : undefined;
  const sourceIds = query.sourceIds?.length
    ? new Set(query.sourceIds)
    : undefined;

  return (document) => {
    if (kinds && !kinds.has(document.kind)) {
      return false;
    }
    if (sourceIds && !sourceIds.has(document.sourceId)) {
      return false;
    }
    if (query.category && document.category !== query.category) {
      return false;
    }
    if (query.statKey && !document.statKeys.includes(query.statKey)) {
      return false;
    }
    return true;
  };
}

function textScore(document: SearchDocument, query: string): number | null {
  if (query.length === 0) {
    return 0;
  }

  const tokens = query.split(" ");
  if (!tokens.every((token) => document.text.includes(token))) {
    return null;
  }

  const name = normalizeQuery(document.name);
  let score = name === query ? 300 : name.startsWith(query) ? 200 : 0;
  if (score === 0 && name.includes(query)) {
    score = 100;
  }
  for (const token of tokens) {
    score += name.includes(token) ? 20 : 2;
  }
  return score;
}

export function querySearchDocuments(
  documents: readonly SearchDocument[],
  query: SearchQuery,
): SearchResult[] {
  const normalizedQuery = normalizeQuery(query.query ?? "");
  const matchesFilter = searchFilter(query);
  const results: SearchResult[] = [];

  for (const document of documents) {
    if (!matchesFilter(document)) {
      continue;
    }
    const score = textScore(document, normalizedQuery);
    if (score === null) {
      continue;
    }
    results.push({ document, score });
  }

  results.sort(
    (left, right) =>
      right.score - left.score ||
      compareCodeUnits(left.document.kind, right.document.kind) ||
      compareCodeUnits(left.document.name, right.document.name) ||
      compareCodeUnits(left.document.id, right.document.id),
  );

  return query.limit === undefined ? results : results.slice(0, query.limit);
}

function normalizeAlias(value: string): string {
  return normalizeQuery(value.replace(/[-_]+/g, " "));
}

function editDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  let previous = Array.from(
    { length: rightCharacters.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex];
    for (
      let rightIndex = 1;
      rightIndex <= rightCharacters.length;
      rightIndex += 1
    ) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) +
          (leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1]
            ? 0
            : 1),
      );
    }
    previous = current;
  }

  return previous[rightCharacters.length] ?? leftCharacters.length;
}

function suggestionDistanceLimit(length: number): number {
  return Math.max(1, Math.min(5, Math.floor(length * 0.25)));
}

interface RankedSuggestion extends SearchSuggestion {
  lengthDifference: number;
  matchedAlias: boolean;
}

export function suggestSearchDocuments(
  documents: readonly SearchDocument[],
  query: SearchQuery,
): SearchSuggestion[] {
  const normalizedQuery = normalizeQuery(query.query ?? "");
  const queryLength = Array.from(normalizedQuery).length;
  if (queryLength < 3 || queryLength > 120) {
    return [];
  }

  const matchesFilter = searchFilter(query);
  const candidates = documents.filter(matchesFilter);
  if (
    candidates.some((document) => textScore(document, normalizedQuery) !== null)
  ) {
    return [];
  }

  const ranked: RankedSuggestion[] = [];
  for (const document of candidates) {
    const candidateValues = [
      { value: normalizeQuery(document.name), matchedAlias: false },
      ...document.aliases.map((alias) => ({
        value: normalizeAlias(alias),
        matchedAlias: true,
      })),
    ];
    let closest:
      | {
          distance: number;
          lengthDifference: number;
          matchedAlias: boolean;
        }
      | undefined;

    for (const candidate of candidateValues) {
      const candidateLength = Array.from(candidate.value).length;
      const lengthDifference = Math.abs(candidateLength - queryLength);
      const distanceLimit = suggestionDistanceLimit(
        Math.max(queryLength, candidateLength),
      );
      if (lengthDifference > distanceLimit) {
        continue;
      }
      const distance = editDistance(normalizedQuery, candidate.value);
      if (distance > distanceLimit) {
        continue;
      }
      const isCloser =
        closest === undefined ||
        distance < closest.distance ||
        (distance === closest.distance &&
          lengthDifference < closest.lengthDifference) ||
        (distance === closest.distance &&
          lengthDifference === closest.lengthDifference &&
          closest.matchedAlias &&
          !candidate.matchedAlias);
      if (isCloser) {
        closest = {
          distance,
          lengthDifference,
          matchedAlias: candidate.matchedAlias,
        };
      }
    }

    if (closest) {
      ranked.push({ document, ...closest });
    }
  }

  ranked.sort(
    (left, right) =>
      left.distance - right.distance ||
      left.lengthDifference - right.lengthDifference ||
      Number(left.matchedAlias) - Number(right.matchedAlias) ||
      compareCodeUnits(left.document.kind, right.document.kind) ||
      compareCodeUnits(left.document.name, right.document.name) ||
      compareCodeUnits(left.document.id, right.document.id),
  );

  const requestedLimit =
    query.limit === undefined || !Number.isFinite(query.limit)
      ? searchSuggestionLimit
      : Math.trunc(query.limit);
  const limit = Math.max(0, Math.min(searchSuggestionLimit, requestedLimit));
  if (limit === 0) {
    return [];
  }
  const seenQueries = new Set<string>();
  const suggestions: SearchSuggestion[] = [];
  for (const suggestion of ranked) {
    const suggestedQuery = normalizeQuery(suggestion.document.name);
    if (seenQueries.has(suggestedQuery)) {
      continue;
    }
    seenQueries.add(suggestedQuery);
    suggestions.push({
      document: suggestion.document,
      distance: suggestion.distance,
    });
    if (suggestions.length === limit) {
      break;
    }
  }
  return suggestions;
}
