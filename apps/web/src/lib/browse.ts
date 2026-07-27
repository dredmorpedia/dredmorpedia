import {
  entityKinds,
  type EntityKind,
  type SearchDocument,
} from "@dredmorpedia/domain";

interface BrowseKindMetadata {
  segment: string;
  label: string;
  singularLabel: string;
  description: string;
}

export interface BrowseKind extends BrowseKindMetadata {
  kind: EntityKind;
}

const browseKindMetadata: Record<EntityKind, BrowseKindMetadata> = {
  item: {
    segment: "items",
    label: "Items",
    singularLabel: "Item",
    description:
      "Equipment, consumables, crafting materials, traps, wands, and other dungeon objects.",
  },
  recipe: {
    segment: "recipes",
    label: "Recipes",
    singularLabel: "Recipe",
    description:
      "Crafting instructions with ingredients, outputs, tools, and skill requirements.",
  },
  encrustment: {
    segment: "encrustments",
    label: "Encrustments",
    singularLabel: "Encrustment",
    description:
      "Equipment coatings with ingredients, modifiers, applicability, and instability metadata.",
  },
  skill: {
    segment: "skills",
    label: "Skills",
    singularLabel: "Skill",
    description:
      "Character skill trees, archetypes, starting loadouts, and ability progression.",
  },
  ability: {
    segment: "abilities",
    label: "Abilities",
    singularLabel: "Ability",
    description:
      "Individual skill-tree levels with modifiers, source metadata, and spell triggers.",
  },
  spell: {
    segment: "spells",
    label: "Spells",
    singularLabel: "Spell",
    description:
      "Castable effects, buffs, triggers, recursive relationships, and presentation metadata.",
  },
  monster: {
    segment: "monsters",
    label: "Monsters",
    singularLabel: "Monster",
    description:
      "Dungeon creatures with families, profiles, behavior hooks, spells, and drops.",
  },
  stat: {
    segment: "stats",
    label: "Stats",
    singularLabel: "Stat",
    description:
      "Named damage, resistance, primary, and secondary statistics in the active dataset.",
  },
  template: {
    segment: "templates",
    label: "Targeting templates",
    singularLabel: "Targeting template",
    description:
      "Grid patterns that describe affected tiles and player-anchor placement.",
  },
};

export const browseKinds: readonly BrowseKind[] = entityKinds.map((kind) => ({
  kind,
  ...browseKindMetadata[kind],
}));

const browseKindByKind = new Map(
  browseKinds.map((definition) => [definition.kind, definition]),
);
const browseKindBySegment = new Map(
  browseKinds.map((definition) => [definition.segment, definition]),
);

export const browsePageSize = 100;

export function browseKindFor(kind: EntityKind): BrowseKind {
  const definition = browseKindByKind.get(kind);
  if (!definition) {
    throw new Error(`Missing browse metadata for entity kind ${kind}.`);
  }
  return definition;
}

export function browseKindForSegment(segment: string): BrowseKind | undefined {
  return browseKindBySegment.get(segment);
}

export function browsePagePath(kind: EntityKind, page: number): string {
  return `/browse/${browseKindFor(kind).segment}/${page}`;
}

export interface BrowsePage {
  documents: SearchDocument[];
  page: number;
  pageCount: number;
  total: number;
}

export function paginateBrowseDocuments(
  documents: readonly SearchDocument[],
  kind: EntityKind,
  page: number,
): BrowsePage | undefined {
  if (!Number.isSafeInteger(page) || page < 1) {
    return undefined;
  }

  const matchingDocuments = documents.filter(
    (document) => document.kind === kind,
  );
  const pageCount = Math.max(
    1,
    Math.ceil(matchingDocuments.length / browsePageSize),
  );
  if (page > pageCount) {
    return undefined;
  }

  const start = (page - 1) * browsePageSize;
  return {
    documents: matchingDocuments.slice(start, start + browsePageSize),
    page,
    pageCount,
    total: matchingDocuments.length,
  };
}
