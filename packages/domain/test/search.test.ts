import { describe, expect, it } from "vitest";

import {
  createSearchDocuments,
  querySearchDocuments,
  searchSuggestionLimit,
  suggestSearchDocuments,
  type EntityCollections,
  type SearchDocument,
  type Stat,
} from "../src/index";

function searchStat(id: string, slug: string): Stat {
  const provenance = {
    sourceId: "synthetic-search",
    file: "synthetic/statDB.xml",
    line: 1,
    column: 1,
    originalName: "Shared Name",
  };
  return {
    id,
    kind: "stat",
    canonicalKey: id,
    slug,
    slugAliases: [],
    name: "Shared Name",
    description: "",
    group: "secondary",
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

function collections(stats: Stat[]): EntityCollections {
  return {
    items: [],
    recipes: [],
    encrustments: [],
    skills: [],
    abilities: [],
    spells: [],
    monsters: [],
    stats,
    templates: [],
  };
}

const documents: SearchDocument[] = [
  {
    id: "item:clockwork blade",
    kind: "item",
    name: "Clockwork Blade",
    aliases: ["clockwork-sword"],
    summary: "A precise synthetic weapon.",
    sourceId: "synthetic-expansion",
    category: "weapon",
    statKeys: ["melee power"],
    url: "/items/clockwork-blade",
    text: "clockwork blade a precise synthetic weapon item weapon synthetic-expansion melee power 6",
  },
  {
    id: "item:brass ingot",
    kind: "item",
    name: "Brass Ingot",
    aliases: [],
    summary: "A synthetic crafting material.",
    sourceId: "synthetic-base",
    category: "material",
    statKeys: [],
    url: "/items/brass-ingot",
    text: "brass ingot a synthetic crafting material item material synthetic-base",
  },
  {
    id: "stat:melee power",
    kind: "stat",
    name: "Melee Power",
    aliases: [],
    summary: "Synthetic close-combat output.",
    sourceId: "synthetic-base",
    category: "secondary",
    statKeys: [],
    url: "/stats/melee-power",
    text: "melee power synthetic close-combat output stat secondary synthetic-base",
  },
  {
    id: "template:small cross",
    kind: "template",
    name: "Small Cross",
    aliases: [],
    summary: "",
    sourceId: "synthetic-base",
    category: null,
    statKeys: [],
    url: "/templates/small-cross",
    text: "small cross template synthetic-base",
  },
];

describe("search queries", () => {
  it("ends generated-document ordering with a stable entity-ID tiebreaker", () => {
    const first = searchStat("stat:a", "shared-name-a");
    const second = searchStat("stat:z", "shared-name-z");

    expect(createSearchDocuments(collections([second, first]))).toEqual(
      createSearchDocuments(collections([first, second])),
    );
    expect(
      createSearchDocuments(collections([second, first])).map(
        (document) => document.id,
      ),
    ).toEqual(["stat:a", "stat:z"]);
  });

  it("ranks exact and prefix name matches ahead of description matches", () => {
    expect(
      querySearchDocuments(documents, { query: "melee power" }).map(
        (result) => result.document.id,
      ),
    ).toEqual(["stat:melee power", "item:clockwork blade"]);
  });

  it("combines entity, source, category, and stat filters deterministically", () => {
    const query = {
      kinds: ["item"] as const,
      sourceIds: ["synthetic-expansion"],
      category: "weapon",
      statKey: "melee power",
    };

    expect(querySearchDocuments([...documents].reverse(), query)).toEqual(
      querySearchDocuments(documents, query),
    );
    expect(querySearchDocuments(documents, query)[0]?.document.id).toBe(
      "item:clockwork blade",
    );
  });

  it("requires every normalized query token and honors a result limit", () => {
    expect(
      querySearchDocuments(documents, { query: "synthetic blade", limit: 1 }),
    ).toHaveLength(1);
    expect(querySearchDocuments(documents, { query: "blade missing" })).toEqual(
      [],
    );
    expect(querySearchDocuments(documents, { limit: 0 })).toEqual([]);
  });

  it("filters targeting templates without treating them as item categories", () => {
    expect(
      querySearchDocuments(documents, {
        query: "small cross",
        kinds: ["template"],
      }).map((result) => result.document.url),
    ).toEqual(["/templates/small-cross"]);
  });

  it("offers deterministic name suggestions only for zero-result queries", () => {
    expect(
      suggestSearchDocuments(documents, { query: "clokwork blade" }).map(
        (suggestion) => suggestion.document.name,
      ),
    ).toEqual(["Clockwork Blade"]);
    expect(
      suggestSearchDocuments(documents, { query: "clockwork blade" }),
    ).toEqual([]);
    expect(
      suggestSearchDocuments(documents, { query: "precise synthetic wepon" }),
    ).toEqual([]);
  });

  it("uses route aliases as suggestion candidates and honors active filters", () => {
    expect(
      suggestSearchDocuments(documents, {
        query: "clockwrok sword",
        kinds: ["item"],
        sourceIds: ["synthetic-expansion"],
      }).map((suggestion) => suggestion.document.id),
    ).toEqual(["item:clockwork blade"]);
    expect(
      suggestSearchDocuments(documents, {
        query: "clockwrok sword",
        kinds: ["spell"],
      }),
    ).toEqual([]);
  });

  it("caps suggestions at five with stable ordering", () => {
    const crowdedDocuments: SearchDocument[] = Array.from(
      { length: 6 },
      (_, index) => ({
        id: `item:training-wand-${index}`,
        kind: "item",
        name: `Training Wand ${String.fromCharCode(65 + index)}`,
        aliases: [],
        summary: "",
        sourceId: "synthetic-base",
        category: "wand",
        statKeys: [],
        url: `/items/training-wand-${index}`,
        text: `training wand ${String.fromCharCode(97 + index)}`,
      }),
    );

    const query = { query: "training wamd", limit: 99 };
    expect(suggestSearchDocuments(crowdedDocuments, query)).toHaveLength(
      searchSuggestionLimit,
    );
    expect(
      suggestSearchDocuments([...crowdedDocuments].reverse(), query),
    ).toEqual(suggestSearchDocuments(crowdedDocuments, query));
    expect(
      suggestSearchDocuments(crowdedDocuments, { ...query, limit: 2 }),
    ).toHaveLength(2);
    expect(
      suggestSearchDocuments(crowdedDocuments, { ...query, limit: 0 }),
    ).toEqual([]);
  });
});
