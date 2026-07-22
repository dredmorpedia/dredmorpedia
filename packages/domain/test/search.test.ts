import { describe, expect, it } from "vitest";

import { querySearchDocuments, type SearchDocument } from "../src/index";

const documents: SearchDocument[] = [
  {
    id: "item:clockwork blade",
    kind: "item",
    name: "Clockwork Blade",
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
    summary: "",
    sourceId: "synthetic-base",
    category: null,
    statKeys: [],
    url: "/templates/small-cross",
    text: "small cross template synthetic-base",
  },
];

describe("search queries", () => {
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
});
