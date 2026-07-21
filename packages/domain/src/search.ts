import type {
  DatasetArtifact,
  EntityKind,
  NormalizedEntity,
  SearchDocument,
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

  if (entity.kind === "encrustment") {
    return entity.tool;
  }

  if (entity.kind === "monster") {
    return entity.taxonomy || null;
  }

  return null;
}

export function createSearchDocument(entity: NormalizedEntity): SearchDocument {
  const category = categoryFor(entity);
  const statKeys =
    entity.kind === "item"
      ? [...new Set(entity.stats.map((stat) => stat.statKey))].sort(
          (left, right) => left.localeCompare(right, "en"),
        )
      : [];
  const statText =
    entity.kind === "item"
      ? entity.stats.flatMap((stat) => [stat.statName, String(stat.amount)])
      : [];
  const searchableParts = [
    entity.name,
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
    ...statText,
  ];

  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
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
  return Object.values(entities)
    .flat()
    .map((entity) => createSearchDocument(entity))
    .sort(
      (left, right) =>
        left.kind.localeCompare(right.kind, "en") ||
        left.name.localeCompare(right.name, "en"),
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

function normalizeQuery(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
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
  const kinds = query.kinds?.length ? new Set(query.kinds) : undefined;
  const sourceIds = query.sourceIds?.length
    ? new Set(query.sourceIds)
    : undefined;
  const results: SearchResult[] = [];

  for (const document of documents) {
    if (kinds && !kinds.has(document.kind)) {
      continue;
    }
    if (sourceIds && !sourceIds.has(document.sourceId)) {
      continue;
    }
    if (query.category && document.category !== query.category) {
      continue;
    }
    if (query.statKey && !document.statKeys.includes(query.statKey)) {
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
      left.document.kind.localeCompare(right.document.kind, "en") ||
      left.document.name.localeCompare(right.document.name, "en") ||
      left.document.id.localeCompare(right.document.id, "en"),
  );

  return query.limit === undefined ? results : results.slice(0, query.limit);
}
