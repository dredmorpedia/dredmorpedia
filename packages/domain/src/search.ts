import type {
  DatasetArtifact,
  NormalizedEntity,
  SearchDocument,
} from "./types";

const routeSegments: Record<NormalizedEntity["kind"], string> = {
  item: "items",
  recipe: "recipes",
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

  return null;
}

export function createSearchDocument(entity: NormalizedEntity): SearchDocument {
  const category = categoryFor(entity);
  const searchableParts = [
    entity.name,
    entity.description,
    entity.kind,
    category ?? "",
    entity.provenance.sourceId,
  ];

  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    summary: entity.description,
    sourceId: entity.provenance.sourceId,
    category,
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
